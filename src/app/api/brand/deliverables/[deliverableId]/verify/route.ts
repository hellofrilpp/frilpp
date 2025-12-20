import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { deliverables, matches, offers } from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";

export const runtime = "nodejs";

const bodySchema = z.object({
  permalink: z.string().url().max(500).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ deliverableId: string }> }) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctx = await requireBrandContext(request);
  if (ctx instanceof Response) return ctx;

  const { deliverableId } = await context.params;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json ?? {});
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const rows = await db
    .select({
      id: deliverables.id,
      matchId: deliverables.matchId,
      submittedPermalink: deliverables.submittedPermalink,
      usageRightsGrantedAt: deliverables.usageRightsGrantedAt,
      offerBrandId: offers.brandId,
      offerUsageRightsRequired: offers.usageRightsRequired,
    })
    .from(deliverables)
    .innerJoin(matches, eq(matches.id, deliverables.matchId))
    .innerJoin(offers, eq(offers.id, matches.offerId))
    .where(eq(deliverables.id, deliverableId))
    .limit(1);

  const d = rows[0];
  if (!d || d.offerBrandId !== ctx.brandId) {
    return Response.json({ ok: false, error: "Deliverable not found" }, { status: 404 });
  }

  const permalink = parsed.data.permalink ?? d.submittedPermalink ?? null;
  if (!permalink) {
    return Response.json({ ok: false, error: "Missing permalink" }, { status: 400 });
  }
  if (d.offerUsageRightsRequired && !d.usageRightsGrantedAt) {
    return Response.json(
      { ok: false, error: "Creator must grant usage rights before approving this deliverable" },
      { status: 400 },
    );
  }

  const now = new Date();
  await db
    .update(deliverables)
    .set({
      status: "VERIFIED",
      verifiedPermalink: permalink,
      verifiedAt: now,
      reviewedByUserId: ctx.user.id,
      failureReason: null,
    })
    .where(and(eq(deliverables.id, deliverableId)));

  return Response.json({ ok: true });
}
