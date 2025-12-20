import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { deliverables, matches, offers, strikes } from "@/db/schema";
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
      matchId: deliverables.matchId,
      creatorId: matches.creatorId,
      offerBrandId: offers.brandId,
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

  const now = new Date();
  const reason = parsed.data.reason ?? "Rejected by brand";

  await db.transaction(async (tx) => {
    await tx
      .update(deliverables)
      .set({
        status: "FAILED",
        failureReason: reason,
        reviewedByUserId: ctx.user.id,
      })
      .where(eq(deliverables.id, deliverableId));

    const existingStrike = await tx
      .select({ id: strikes.id })
      .from(strikes)
      .where(eq(strikes.matchId, d.matchId))
      .limit(1);
    if (!existingStrike[0]) {
      await tx.insert(strikes).values({
        id: crypto.randomUUID(),
        creatorId: d.creatorId,
        matchId: d.matchId,
        reason,
        createdAt: now,
      });
    }
  });

  return Response.json({ ok: true });
}
