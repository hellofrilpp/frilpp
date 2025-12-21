import { and, count, eq, inArray, sum } from "drizzle-orm";
import { db } from "@/db";
import { attributedOrders, attributedRefunds, deliverables, linkClicks, matches, offers, creators } from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";

export const runtime = "nodejs";

const moneyFromMetadata = (metadata: Record<string, unknown> | null) => {
  if (!metadata) return 0;
  const raw = metadata.productValue;
  const value = typeof raw === "number" ? raw : Number(raw ?? 0);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value * 100));
};

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctx = await requireBrandContext(request);
  if (ctx instanceof Response) return ctx;

  const matchRows = await db
    .select({
      matchId: matches.id,
      creatorId: creators.id,
      username: creators.username,
      followersCount: creators.followersCount,
      country: creators.country,
      categories: creators.categories,
      offerMetadata: offers.metadata,
    })
    .from(matches)
    .innerJoin(offers, eq(offers.id, matches.offerId))
    .innerJoin(creators, eq(creators.id, matches.creatorId))
    .where(and(eq(offers.brandId, ctx.brandId), eq(matches.status, "ACCEPTED")))
    .limit(500);

  if (!matchRows.length) {
    return Response.json({ ok: true, creators: [] });
  }

  const matchIds = matchRows.map((row) => row.matchId);

  const clickRows = await db
    .select({ matchId: linkClicks.matchId, clickCount: count(linkClicks.id) })
    .from(linkClicks)
    .where(inArray(linkClicks.matchId, matchIds))
    .groupBy(linkClicks.matchId);

  const orderRows = await db
    .select({
      matchId: attributedOrders.matchId,
      orderCount: count(attributedOrders.id),
      revenueCents: sum(attributedOrders.totalPrice),
    })
    .from(attributedOrders)
    .where(inArray(attributedOrders.matchId, matchIds))
    .groupBy(attributedOrders.matchId);

  const orderDetailRows = await db
    .select({
      matchId: attributedOrders.matchId,
      orderId: attributedOrders.shopifyOrderId,
      customerId: attributedOrders.shopifyCustomerId,
      totalPrice: attributedOrders.totalPrice,
    })
    .from(attributedOrders)
    .where(inArray(attributedOrders.matchId, matchIds));

  const refundRows = await db
    .select({
      matchId: attributedRefunds.matchId,
      refundCents: sum(attributedRefunds.totalRefund),
    })
    .from(attributedRefunds)
    .where(inArray(attributedRefunds.matchId, matchIds))
    .groupBy(attributedRefunds.matchId);

  const refundOrderRows = await db
    .select({
      matchId: attributedRefunds.matchId,
      orderId: attributedRefunds.shopifyOrderId,
      refundCents: sum(attributedRefunds.totalRefund),
    })
    .from(attributedRefunds)
    .where(inArray(attributedRefunds.matchId, matchIds))
    .groupBy(attributedRefunds.matchId, attributedRefunds.shopifyOrderId);

  const verifiedRows = await db
    .select({ matchId: deliverables.matchId, verifiedCount: count(deliverables.id) })
    .from(deliverables)
    .where(and(inArray(deliverables.matchId, matchIds), eq(deliverables.status, "VERIFIED")))
    .groupBy(deliverables.matchId);

  const clickByMatch = new Map(clickRows.map((r) => [r.matchId, Number(r.clickCount ?? 0)]));
  const ordersByMatch = new Map(orderRows.map((r) => [r.matchId, Number(r.orderCount ?? 0)]));
  const revenueByMatch = new Map(orderRows.map((r) => [r.matchId, Number(r.revenueCents ?? 0)]));
  const refundsByMatch = new Map(refundRows.map((r) => [r.matchId, Number(r.refundCents ?? 0)]));
  const verifiedByMatch = new Map(verifiedRows.map((r) => [r.matchId, Number(r.verifiedCount ?? 0)]));
  const refundByOrder = new Map(
    refundOrderRows.map((row) => [
      `${row.matchId}:${row.orderId}`,
      Number(row.refundCents ?? 0),
    ]),
  );
  const matchToCreator = new Map(matchRows.map((row) => [row.matchId, row.creatorId]));

  const ordersByCreatorCustomer = new Map<string, Map<string, number>>();
  for (const row of orderDetailRows) {
    const creatorId = matchToCreator.get(row.matchId);
    if (!creatorId) continue;
    const customerId = row.customerId;
    if (!customerId) continue;
    const refundCents = refundByOrder.get(`${row.matchId}:${row.orderId}`) ?? 0;
    const netCents = Number(row.totalPrice ?? 0) - refundCents;
    if (netCents <= 0) continue;
    const perCreator = ordersByCreatorCustomer.get(creatorId) ?? new Map<string, number>();
    perCreator.set(customerId, (perCreator.get(customerId) ?? 0) + 1);
    ordersByCreatorCustomer.set(creatorId, perCreator);
  }

  const perCreator = new Map<
    string,
    {
      creatorId: string;
      username: string | null;
      followersCount: number | null;
      country: string | null;
      categories: string[] | null;
      matchCount: number;
      verifiedCount: number;
      clickCount: number;
      orderCount: number;
      revenueCents: number;
      refundCents: number;
      seedCostCents: number;
    }
  >();

  for (const row of matchRows) {
    const entry =
      perCreator.get(row.creatorId) ??
      {
        creatorId: row.creatorId,
        username: row.username ?? null,
        followersCount: row.followersCount ?? null,
        country: row.country ?? null,
        categories: (row.categories as string[] | null) ?? null,
        matchCount: 0,
        verifiedCount: 0,
        clickCount: 0,
        orderCount: 0,
        revenueCents: 0,
        refundCents: 0,
        seedCostCents: 0,
      };

    entry.matchCount += 1;
    entry.verifiedCount += verifiedByMatch.get(row.matchId) ?? 0;
    entry.clickCount += clickByMatch.get(row.matchId) ?? 0;
    entry.orderCount += ordersByMatch.get(row.matchId) ?? 0;
    entry.revenueCents += revenueByMatch.get(row.matchId) ?? 0;
    entry.refundCents += refundsByMatch.get(row.matchId) ?? 0;
    entry.seedCostCents += moneyFromMetadata(row.offerMetadata as Record<string, unknown> | null);

    perCreator.set(row.creatorId, entry);
  }

  const creatorsList = Array.from(perCreator.values()).map((entry) => {
    const netRevenueCents = entry.revenueCents - entry.refundCents;
    const repeatBuyerCount = (() => {
      const customerCounts = ordersByCreatorCustomer.get(entry.creatorId);
      if (!customerCounts) return 0;
      let repeats = 0;
      for (const count of customerCounts.values()) {
        if (count >= 2) repeats += 1;
      }
      return repeats;
    })();
    const roiPercent =
      entry.seedCostCents > 0
        ? Math.round(((netRevenueCents - entry.seedCostCents) / entry.seedCostCents) * 1000) / 10
        : null;
    return {
      creatorId: entry.creatorId,
      username: entry.username,
      followersCount: entry.followersCount,
      country: entry.country,
      categories: entry.categories,
      matchCount: entry.matchCount,
      verifiedCount: entry.verifiedCount,
      clickCount: entry.clickCount,
      orderCount: entry.orderCount,
      revenueCents: entry.revenueCents,
      refundCents: entry.refundCents,
      netRevenueCents,
      seedCostCents: entry.seedCostCents,
      earningsCents: entry.seedCostCents,
      repeatBuyerCount,
      roiPercent,
      ltvCents: netRevenueCents,
    };
  });

  creatorsList.sort((a, b) => b.netRevenueCents - a.netRevenueCents);

  return Response.json({ ok: true, creators: creatorsList });
}
