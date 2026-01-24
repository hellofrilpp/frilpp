import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { deliverables, matches, offers } from "@/db/schema";
import { requireCreatorContext } from "@/lib/auth";

export const runtime = "nodejs";

const bodySchema = z.object({
  url: z.string().url().max(500),
  notes: z.string().max(2000).optional(),
  grantUsageRights: z.boolean().optional(),
});

export async function POST(request: Request, context: { params: Promise<{ matchId: string }> }) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctx = await requireCreatorContext(request);
  if (ctx instanceof Response) return ctx;

  const { matchId } = await context.params;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const matchRows = await db
    .select({
      id: matches.id,
      matchStatus: matches.status,
      deliverableId: deliverables.id,
      deliverableStatus: deliverables.status,
      offerUsageRightsRequired: offers.usageRightsRequired,
      offerUsageRightsScope: offers.usageRightsScope,
    })
    .from(matches)
    .innerJoin(deliverables, eq(deliverables.matchId, matches.id))
    .innerJoin(offers, eq(offers.id, matches.offerId))
    .where(and(eq(matches.id, matchId), eq(matches.creatorId, ctx.creator.id)))
    .limit(1);
  const row = matchRows[0];
  if (!row) return Response.json({ ok: false, error: "Match not found" }, { status: 404 });
  if (row.matchStatus !== "ACCEPTED") {
    return Response.json({ ok: false, error: "Match is not active" }, { status: 409 });
  }
  if (row.deliverableStatus !== "DUE") {
    return Response.json({ ok: false, error: "Deliverable already processed" }, { status: 409 });
  }

  const now = new Date();
  if (row.offerUsageRightsRequired && !parsed.data.grantUsageRights) {
    return Response.json({ ok: false, error: "Usage rights must be granted for this offer" }, { status: 400 });
  }

  const update: Record<string, unknown> = {
    submittedPermalink: parsed.data.url,
    submittedNotes: parsed.data.notes ?? null,
    submittedAt: now,
    failureReason: null,
    reviewedByUserId: null,
  };
  if (parsed.data.grantUsageRights) {
    update.usageRightsGrantedAt = now;
    update.usageRightsScope = row.offerUsageRightsScope ?? "PAID_ADS_12MO";
  }

  const updated = await db
    .update(deliverables)
    .set(update)
    .where(and(eq(deliverables.matchId, matchId), eq(deliverables.status, "DUE")))
    .returning({ id: deliverables.id });

  if (!updated[0]) {
    return Response.json({ ok: false, error: "Deliverable already processed" }, { status: 409 });
  }

  return Response.json({ ok: true });
}
