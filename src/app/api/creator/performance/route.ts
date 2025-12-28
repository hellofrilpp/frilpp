import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  attributedOrders,
  attributedRefunds,
  brands,
  deliverables,
  linkClicks,
  matches,
  offers,
  redemptions,
} from "@/db/schema";
import { requireCreatorContext } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json({ ok: false, error: "DATABASE_URL is not configured" }, { status: 500 });
  }

  const ctx = await requireCreatorContext(request);
  if (ctx instanceof Response) return ctx;

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  const matchRows = await db
    .select({
      matchId: matches.id,
      campaignCode: matches.campaignCode,
      matchStatus: matches.status,
      matchCreatedAt: matches.createdAt,
      offerId: offers.id,
      offerTitle: offers.title,
      brandName: brands.name,
      deliverableStatus: deliverables.status,
      deliverableDueAt: deliverables.dueAt,
      verifiedPermalink: deliverables.verifiedPermalink,
    })
    .from(matches)
    .innerJoin(offers, eq(offers.id, matches.offerId))
    .innerJoin(brands, eq(brands.id, offers.brandId))
    .leftJoin(deliverables, eq(deliverables.matchId, matches.id))
    .where(and(eq(matches.creatorId, ctx.creator.id), eq(matches.status, "ACCEPTED")))
    .orderBy(desc(matches.createdAt))
    .limit(200);

  const matchIds = matchRows.map((row) => row.matchId);
  if (!matchIds.length) {
    return Response.json({
      ok: true,
      summary: {
        totalClicks: 0,
        totalRedemptions: 0,
        totalRedemptionRevenueCents: 0,
        totalNetOrderRevenueCents: 0,
      },
      matches: [],
    });
  }

  const clickRows = await db
    .select({ matchId: linkClicks.matchId, count: sql<number>`count(*)` })
    .from(linkClicks)
    .where(inArray(linkClicks.matchId, matchIds))
    .groupBy(linkClicks.matchId);
  const clicksByMatch = new Map(clickRows.map((r) => [r.matchId, Number(r.count ?? 0)]));

  const redemptionRows = await db
    .select({
      matchId: redemptions.matchId,
      count: sql<number>`count(*)`,
      revenueCents: sql<number>`coalesce(sum(${redemptions.amountCents}), 0)`,
    })
    .from(redemptions)
    .where(inArray(redemptions.matchId, matchIds))
    .groupBy(redemptions.matchId);
  const redemptionsByMatch = new Map(
    redemptionRows.map((r) => [
      r.matchId,
      { count: Number(r.count ?? 0), revenueCents: Number(r.revenueCents ?? 0) },
    ]),
  );

  const ordersRows = await db
    .select({
      matchId: attributedOrders.matchId,
      revenueCents: sql<number>`coalesce(sum(${attributedOrders.totalPrice}), 0)`,
    })
    .from(attributedOrders)
    .where(inArray(attributedOrders.matchId, matchIds))
    .groupBy(attributedOrders.matchId);
  const ordersByMatch = new Map(ordersRows.map((r) => [r.matchId, Number(r.revenueCents ?? 0)]));

  const refundsRows = await db
    .select({
      matchId: attributedRefunds.matchId,
      refundCents: sql<number>`coalesce(sum(${attributedRefunds.totalRefund}), 0)`,
    })
    .from(attributedRefunds)
    .where(inArray(attributedRefunds.matchId, matchIds))
    .groupBy(attributedRefunds.matchId);
  const refundsByMatch = new Map(refundsRows.map((r) => [r.matchId, Number(r.refundCents ?? 0)]));

  const rows = matchRows.map((row) => {
    const clicks = clicksByMatch.get(row.matchId) ?? 0;
    const redemption = redemptionsByMatch.get(row.matchId) ?? { count: 0, revenueCents: 0 };
    const ordersCents = ordersByMatch.get(row.matchId) ?? 0;
    const refundsCents = refundsByMatch.get(row.matchId) ?? 0;
    const netOrderCents = Math.max(0, ordersCents - refundsCents);
    return {
      id: row.matchId,
      brandName: row.brandName,
      offerTitle: row.offerTitle,
      campaignCode: row.campaignCode,
      shareUrl: `${origin}/r/${encodeURIComponent(row.campaignCode)}`,
      createdAt: row.matchCreatedAt.toISOString(),
      deliverable: row.deliverableDueAt
        ? {
            status: row.deliverableStatus ?? null,
            dueAt: row.deliverableDueAt.toISOString(),
            verifiedPermalink: row.verifiedPermalink ?? null,
          }
        : null,
      metrics: {
        clicks,
        redemptionCount: redemption.count,
        redemptionRevenueCents: redemption.revenueCents,
        netOrderRevenueCents: netOrderCents,
      },
    };
  });

  const summary = rows.reduce(
    (acc, row) => {
      acc.totalClicks += row.metrics.clicks;
      acc.totalRedemptions += row.metrics.redemptionCount;
      acc.totalRedemptionRevenueCents += row.metrics.redemptionRevenueCents;
      acc.totalNetOrderRevenueCents += row.metrics.netOrderRevenueCents;
      return acc;
    },
    {
      totalClicks: 0,
      totalRedemptions: 0,
      totalRedemptionRevenueCents: 0,
      totalNetOrderRevenueCents: 0,
    },
  );

  return Response.json({ ok: true, summary, matches: rows });
}

