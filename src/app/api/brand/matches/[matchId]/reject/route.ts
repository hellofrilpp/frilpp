import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { creatorOfferRejections, matches, offers } from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";
import { MATCH_REJECTION_REASONS } from "@/lib/picklists";

export const runtime = "nodejs";

const rejectSchema = z.object({
  reason: z.enum(MATCH_REJECTION_REASONS),
});

export async function POST(request: Request, context: { params: Promise<{ matchId: string }> }) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctx = await requireBrandContext(request);
  if (ctx instanceof Response) return ctx;

  const json = await request.json().catch(() => null);
  const parsed = rejectSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Rejection reason required" }, { status: 400 });
  }

  const { matchId } = await context.params;
  const matchRows = await db
    .select({
      id: matches.id,
      status: matches.status,
      offerId: matches.offerId,
      creatorId: matches.creatorId,
    })
    .from(matches)
    .innerJoin(offers, eq(offers.id, matches.offerId))
    .where(and(eq(matches.id, matchId), eq(offers.brandId, ctx.brandId)))
    .limit(1);
  const match = matchRows[0];
  if (!match) return Response.json({ ok: false, error: "Match not found" }, { status: 404 });

  await db.transaction(async (tx) => {
    if (match.status !== "REVOKED" && match.status !== "CANCELED") {
      await tx
        .update(matches)
        .set({ status: "REVOKED", rejectionReason: parsed.data.reason, rejectedAt: new Date() })
        .where(eq(matches.id, matchId));
    } else {
      await tx
        .update(matches)
        .set({ rejectionReason: parsed.data.reason, rejectedAt: new Date() })
        .where(eq(matches.id, matchId));
    }

    await tx
      .insert(creatorOfferRejections)
      .values({
        id: crypto.randomUUID(),
        creatorId: match.creatorId,
        offerId: match.offerId,
        createdAt: new Date(),
      })
      .onConflictDoNothing();
  });

  return Response.json({
    ok: true,
    match: { id: matchId, status: "REVOKED", rejectionReason: parsed.data.reason },
  });
}
