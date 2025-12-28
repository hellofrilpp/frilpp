import { and, count, desc, eq, inArray, sum } from "drizzle-orm";
import { db } from "@/db";
import { attributedOrders, attributedRefunds, linkClicks, matches, offers, redemptions } from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctx = await requireBrandContext(request);
  if (ctx instanceof Response) return ctx;

  const offerRows = await db
    .select({
      offerId: offers.id,
      title: offers.title,
      publishedAt: offers.publishedAt,
    })
    .from(offers)
    .where(and(eq(offers.brandId, ctx.brandId), eq(offers.status, "PUBLISHED")))
    .orderBy(desc(offers.publishedAt))
    .limit(50);

  const offerIds = offerRows.map((o) => o.offerId);
  if (!offerIds.length) return Response.json({ ok: true, offers: [] });

  const matchCounts = await db
    .select({ offerId: matches.offerId, matchCount: count(matches.id) })
    .from(matches)
    .where(and(inArray(matches.offerId, offerIds), eq(matches.status, "ACCEPTED")))
    .groupBy(matches.offerId);

  const clickCounts = await db
    .select({ offerId: matches.offerId, clickCount: count(linkClicks.id) })
    .from(matches)
    .innerJoin(linkClicks, eq(linkClicks.matchId, matches.id))
    .where(and(inArray(matches.offerId, offerIds), eq(matches.status, "ACCEPTED")))
    .groupBy(matches.offerId);

  const orderStats = await db
    .select({
      offerId: matches.offerId,
      orderCount: count(attributedOrders.id),
      revenueCents: sum(attributedOrders.totalPrice),
    })
    .from(matches)
    .innerJoin(attributedOrders, eq(attributedOrders.matchId, matches.id))
    .where(and(inArray(matches.offerId, offerIds), eq(matches.status, "ACCEPTED")))
    .groupBy(matches.offerId);

  const refundStats = await db
    .select({
      offerId: matches.offerId,
      refundCents: sum(attributedRefunds.totalRefund),
    })
    .from(matches)
    .innerJoin(attributedRefunds, eq(attributedRefunds.matchId, matches.id))
    .where(and(inArray(matches.offerId, offerIds), eq(matches.status, "ACCEPTED")))
    .groupBy(matches.offerId);

  const redemptionStats = await db
    .select({
      offerId: matches.offerId,
      redemptionCount: count(redemptions.id),
      redemptionRevenueCents: sum(redemptions.amountCents),
    })
    .from(matches)
    .innerJoin(redemptions, eq(redemptions.matchId, matches.id))
    .where(and(inArray(matches.offerId, offerIds), eq(matches.status, "ACCEPTED")))
    .groupBy(matches.offerId);

  const matchCountByOffer = new Map(matchCounts.map((r) => [r.offerId, Number(r.matchCount ?? 0)]));
  const clickCountByOffer = new Map(clickCounts.map((r) => [r.offerId, Number(r.clickCount ?? 0)]));
  const orderCountByOffer = new Map(orderStats.map((r) => [r.offerId, Number(r.orderCount ?? 0)]));
  const revenueByOffer = new Map(orderStats.map((r) => [r.offerId, Number(r.revenueCents ?? 0)]));
  const refundByOffer = new Map(refundStats.map((r) => [r.offerId, Number(r.refundCents ?? 0)]));
  const redemptionCountByOffer = new Map(
    redemptionStats.map((r) => [r.offerId, Number(r.redemptionCount ?? 0)]),
  );
  const redemptionRevenueByOffer = new Map(
    redemptionStats.map((r) => [r.offerId, Number(r.redemptionRevenueCents ?? 0)]),
  );

  return Response.json({
    ok: true,
    offers: offerRows.map((r) => ({
      offerId: r.offerId,
      title: r.title,
      publishedAt: r.publishedAt?.toISOString() ?? null,
      matchCount: matchCountByOffer.get(r.offerId) ?? 0,
      clickCount: clickCountByOffer.get(r.offerId) ?? 0,
      orderCount: orderCountByOffer.get(r.offerId) ?? 0,
      redemptionCount: redemptionCountByOffer.get(r.offerId) ?? 0,
      revenueCents: revenueByOffer.get(r.offerId) ?? 0,
      refundCents: refundByOffer.get(r.offerId) ?? 0,
      redemptionRevenueCents: redemptionRevenueByOffer.get(r.offerId) ?? 0,
      netRevenueCents:
        (revenueByOffer.get(r.offerId) ?? 0) - (refundByOffer.get(r.offerId) ?? 0),
      totalRevenueCents:
        ((revenueByOffer.get(r.offerId) ?? 0) - (refundByOffer.get(r.offerId) ?? 0)) +
        (redemptionRevenueByOffer.get(r.offerId) ?? 0),
    })),
  });
}
