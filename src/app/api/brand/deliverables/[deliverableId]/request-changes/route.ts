import { eq } from "drizzle-orm";
import { z } from "zod";
import crypto from "node:crypto";
import { db } from "@/db";
import { deliverableReviews, deliverables, matches, offers } from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";

export const runtime = "nodejs";

const bodySchema = z.object({
  reason: z.string().min(1).max(200).optional(),
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
      deliverableId: deliverables.id,
      offerBrandId: offers.brandId,
      submittedPermalink: deliverables.submittedPermalink,
      submittedNotes: deliverables.submittedNotes,
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

  const reason = parsed.data.reason ?? "Changes requested by brand";

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(deliverables)
      .set({
        status: "DUE",
        submittedPermalink: null,
        submittedNotes: null,
        submittedAt: null,
        verifiedPermalink: null,
        verifiedAt: null,
        usageRightsGrantedAt: null,
        usageRightsScope: null,
        failureReason: reason,
        reviewedByUserId: ctx.user.id,
      })
      .where(eq(deliverables.id, deliverableId));

    await tx.insert(deliverableReviews).values({
      id: crypto.randomUUID(),
      deliverableId,
      action: "REQUEST_CHANGES",
      reason,
      submittedPermalink: d.submittedPermalink ?? null,
      submittedNotes: d.submittedNotes ?? null,
      reviewedByUserId: ctx.user.id,
      createdAt: now,
    });
  });

  return Response.json({ ok: true });
}
