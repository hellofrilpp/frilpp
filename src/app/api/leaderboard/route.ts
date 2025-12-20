import { and, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { brands, creators, deliverables, matches, offers } from "@/db/schema";

export const runtime = "nodejs";

const DAYS_30_MS = 30 * 24 * 60 * 60 * 1000;

const percentTrend = (recent: number, prior: number) => {
  if (prior <= 0) {
    if (recent <= 0) return "0%";
    return "+100%";
  }
  const delta = Math.round(((recent - prior) / prior) * 100);
  return `${delta >= 0 ? "+" : ""}${delta}%`;
};

const initials = (value: string) => {
  const parts = value
    .trim()
    .split(/\s+/g)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return "??";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
};

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const now = new Date();
  const recentStart = new Date(now.getTime() - DAYS_30_MS);
  const priorStart = new Date(now.getTime() - DAYS_30_MS * 2);

  const creatorRows = await db
    .select({
      id: creators.id,
      username: creators.username,
      fullName: creators.fullName,
    })
    .from(creators);

  const creatorDealsRows = await db
    .select({
      creatorId: matches.creatorId,
      count: sql<number>`count(distinct ${matches.id})`,
    })
    .from(matches)
    .groupBy(matches.creatorId);

  const creatorVerifiedRows = await db
    .select({
      creatorId: matches.creatorId,
      count: sql<number>`count(distinct ${deliverables.id})`,
    })
    .from(deliverables)
    .innerJoin(matches, eq(matches.id, deliverables.matchId))
    .where(eq(deliverables.status, "VERIFIED"))
    .groupBy(matches.creatorId);

  const creatorRecentRows = await db
    .select({
      creatorId: matches.creatorId,
      count: sql<number>`count(*)`,
    })
    .from(deliverables)
    .innerJoin(matches, eq(matches.id, deliverables.matchId))
    .where(
      and(
        eq(deliverables.status, "VERIFIED"),
        isNotNull(deliverables.verifiedAt),
        gte(deliverables.verifiedAt, recentStart),
      ),
    )
    .groupBy(matches.creatorId);

  const creatorPriorRows = await db
    .select({
      creatorId: matches.creatorId,
      count: sql<number>`count(*)`,
    })
    .from(deliverables)
    .innerJoin(matches, eq(matches.id, deliverables.matchId))
    .where(
      and(
        eq(deliverables.status, "VERIFIED"),
        isNotNull(deliverables.verifiedAt),
        gte(deliverables.verifiedAt, priorStart),
        lt(deliverables.verifiedAt, recentStart),
      ),
    )
    .groupBy(matches.creatorId);

  const creatorDealsMap = new Map(creatorDealsRows.map((row) => [row.creatorId, Number(row.count ?? 0)]));
  const creatorVerifiedMap = new Map(
    creatorVerifiedRows.map((row) => [row.creatorId, Number(row.count ?? 0)]),
  );
  const creatorRecentMap = new Map(
    creatorRecentRows.map((row) => [row.creatorId, Number(row.count ?? 0)]),
  );
  const creatorPriorMap = new Map(
    creatorPriorRows.map((row) => [row.creatorId, Number(row.count ?? 0)]),
  );

  const creatorsLeaderboard = creatorRows
    .map((creator) => {
      const deals = creatorDealsMap.get(creator.id) ?? 0;
      const verified = creatorVerifiedMap.get(creator.id) ?? 0;
      const recent = creatorRecentMap.get(creator.id) ?? 0;
      const prior = creatorPriorMap.get(creator.id) ?? 0;
      const displayName = creator.fullName || creator.username || "Creator";
      return {
        id: creator.id,
        name: displayName,
        handle: creator.username ? `@${creator.username}` : null,
        deals,
        xp: verified * 50,
        avatar: initials(displayName),
        trend: percentTrend(recent, prior),
      };
    })
    .filter((creator) => creator.deals > 0 || creator.xp > 0)
    .sort((a, b) => b.xp - a.xp || b.deals - a.deals)
    .slice(0, 10)
    .map((creator, index) => ({ ...creator, rank: index + 1 }));

  const brandRows = await db
    .select({
      id: brands.id,
      name: brands.name,
      industry: brands.industry,
    })
    .from(brands);

  const brandDealsRows = await db
    .select({
      brandId: offers.brandId,
      count: sql<number>`count(distinct ${matches.id})`,
    })
    .from(matches)
    .innerJoin(offers, eq(offers.id, matches.offerId))
    .groupBy(offers.brandId);

  const brandVerifiedRows = await db
    .select({
      brandId: offers.brandId,
      count: sql<number>`count(distinct ${deliverables.id})`,
    })
    .from(deliverables)
    .innerJoin(matches, eq(matches.id, deliverables.matchId))
    .innerJoin(offers, eq(offers.id, matches.offerId))
    .where(eq(deliverables.status, "VERIFIED"))
    .groupBy(offers.brandId);

  const brandCreatorRows = await db
    .select({
      brandId: offers.brandId,
      count: sql<number>`count(distinct ${matches.creatorId})`,
    })
    .from(matches)
    .innerJoin(offers, eq(offers.id, matches.offerId))
    .groupBy(offers.brandId);

  const brandRecentRows = await db
    .select({
      brandId: offers.brandId,
      count: sql<number>`count(*)`,
    })
    .from(deliverables)
    .innerJoin(matches, eq(matches.id, deliverables.matchId))
    .innerJoin(offers, eq(offers.id, matches.offerId))
    .where(
      and(
        eq(deliverables.status, "VERIFIED"),
        isNotNull(deliverables.verifiedAt),
        gte(deliverables.verifiedAt, recentStart),
      ),
    )
    .groupBy(offers.brandId);

  const brandPriorRows = await db
    .select({
      brandId: offers.brandId,
      count: sql<number>`count(*)`,
    })
    .from(deliverables)
    .innerJoin(matches, eq(matches.id, deliverables.matchId))
    .innerJoin(offers, eq(offers.id, matches.offerId))
    .where(
      and(
        eq(deliverables.status, "VERIFIED"),
        isNotNull(deliverables.verifiedAt),
        gte(deliverables.verifiedAt, priorStart),
        lt(deliverables.verifiedAt, recentStart),
      ),
    )
    .groupBy(offers.brandId);

  const brandDealsMap = new Map(brandDealsRows.map((row) => [row.brandId, Number(row.count ?? 0)]));
  const brandVerifiedMap = new Map(
    brandVerifiedRows.map((row) => [row.brandId, Number(row.count ?? 0)]),
  );
  const brandCreatorMap = new Map(
    brandCreatorRows.map((row) => [row.brandId, Number(row.count ?? 0)]),
  );
  const brandRecentMap = new Map(
    brandRecentRows.map((row) => [row.brandId, Number(row.count ?? 0)]),
  );
  const brandPriorMap = new Map(
    brandPriorRows.map((row) => [row.brandId, Number(row.count ?? 0)]),
  );

  const brandsLeaderboard = brandRows
    .map((brand) => {
      const deals = brandDealsMap.get(brand.id) ?? 0;
      const verified = brandVerifiedMap.get(brand.id) ?? 0;
      const creatorsCount = brandCreatorMap.get(brand.id) ?? 0;
      const recent = brandRecentMap.get(brand.id) ?? 0;
      const prior = brandPriorMap.get(brand.id) ?? 0;
      const name = brand.name;
      return {
        id: brand.id,
        name,
        category: brand.industry ?? "D2C",
        xp: verified * 100,
        creators: creatorsCount,
        avatar: initials(name),
        trend: percentTrend(recent, prior),
      };
    })
    .filter((brand) => brand.xp > 0 || brand.creators > 0)
    .sort((a, b) => b.xp - a.xp || b.creators - a.creators)
    .slice(0, 10)
    .map((brand, index) => ({ ...brand, rank: index + 1 }));

  return Response.json({
    ok: true,
    creators: creatorsLeaderboard,
    brands: brandsLeaderboard,
  });
}
