import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { attributedOrders, deliverables, linkClicks, matches, offers } from "@/db/schema";
import { requireCreatorContext } from "@/lib/auth";
import { getActiveStrikeCount } from "@/lib/eligibility";

export const runtime = "nodejs";

type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
};

const nowDate = () => new Date();

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctx = await requireCreatorContext(request);
  if (ctx instanceof Response) return ctx;

  const totalMatchesRow = await db
    .select({ count: sql<number>`count(*)` })
    .from(matches)
    .where(eq(matches.creatorId, ctx.creator.id));
  const totalMatches = Number(totalMatchesRow[0]?.count ?? 0);

  const acceptedMatchesRow = await db
    .select({ count: sql<number>`count(*)` })
    .from(matches)
    .where(and(eq(matches.creatorId, ctx.creator.id), eq(matches.status, "ACCEPTED")));
  const acceptedMatches = Number(acceptedMatchesRow[0]?.count ?? 0);

  const verifiedRow = await db
    .select({ count: sql<number>`count(*)` })
    .from(deliverables)
    .innerJoin(matches, eq(matches.id, deliverables.matchId))
    .where(and(eq(matches.creatorId, ctx.creator.id), eq(deliverables.status, "VERIFIED")));
  const verifiedCount = Number(verifiedRow[0]?.count ?? 0);

  const clicksRow = await db
    .select({ count: sql<number>`count(*)` })
    .from(linkClicks)
    .innerJoin(matches, eq(matches.id, linkClicks.matchId))
    .where(eq(matches.creatorId, ctx.creator.id));
  const clickCount = Number(clicksRow[0]?.count ?? 0);

  const revenueRow = await db
    .select({ total: sql<number>`coalesce(sum(${attributedOrders.totalPrice}), 0)` })
    .from(attributedOrders)
    .innerJoin(matches, eq(matches.id, attributedOrders.matchId))
    .where(eq(matches.creatorId, ctx.creator.id));
  const revenueCents = Number(revenueRow[0]?.total ?? 0);
  const revenueDollars = Math.floor(revenueCents / 100);

  const repeatRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(matches)
    .innerJoin(offers, eq(offers.id, matches.offerId))
    .where(eq(matches.creatorId, ctx.creator.id))
    .groupBy(offers.brandId);
  const repeatMax = repeatRows.reduce((max, row) => Math.max(max, Number(row.count ?? 0)), 0);

  const activeStrikes = await getActiveStrikeCount(ctx.creator.id);

  const level = Math.max(1, Math.floor(verifiedCount / 5) + 1);

  const achievements: Achievement[] = [
    {
      id: "first_swipe",
      name: "First Swipe",
      description: "Swipe on your first brand deal",
      icon: "👆",
      xp: 50,
      rarity: "common",
      unlocked: totalMatches >= 1,
    },
    {
      id: "first_match",
      name: "Perfect Match",
      description: "Get matched with a brand",
      icon: "💫",
      xp: 100,
      rarity: "common",
      unlocked: acceptedMatches >= 1,
    },
    {
      id: "swipe_master",
      name: "Swipe Master",
      description: "Swipe on 50 deals",
      icon: "🎯",
      xp: 250,
      rarity: "rare",
      unlocked: totalMatches >= 50,
      progress: totalMatches,
      maxProgress: 50,
    },
    {
      id: "deal_closer",
      name: "Deal Closer",
      description: "Complete your first deal",
      icon: "🤝",
      xp: 500,
      rarity: "rare",
      unlocked: verifiedCount >= 1,
    },
    {
      id: "content_creator",
      name: "Content Creator",
      description: "Submit 10 pieces of content",
      icon: "🎬",
      xp: 300,
      rarity: "rare",
      unlocked: verifiedCount >= 10,
      progress: verifiedCount,
      maxProgress: 10,
    },
    {
      id: "rising_star",
      name: "Rising Star",
      description: "Reach Level 5",
      icon: "⭐",
      xp: 750,
      rarity: "epic",
      unlocked: level >= 5,
    },
    {
      id: "influencer_elite",
      name: "Influencer Elite",
      description: "Reach Level 10",
      icon: "👑",
      xp: 1500,
      rarity: "epic",
      unlocked: level >= 10,
    },
    {
      id: "money_maker",
      name: "Money Maker",
      description: "Earn $10,000 in total deals",
      icon: "💰",
      xp: 1000,
      rarity: "epic",
      unlocked: revenueDollars >= 10000,
      progress: revenueDollars,
      maxProgress: 10000,
    },
    {
      id: "viral_sensation",
      name: "Viral Sensation",
      description: "Get 1M total clicks on sponsored content",
      icon: "🚀",
      xp: 2000,
      rarity: "legendary",
      unlocked: clickCount >= 1_000_000,
      progress: clickCount,
      maxProgress: 1_000_000,
    },
    {
      id: "brand_favorite",
      name: "Brand Favorite",
      description: "Get 5 repeat deals from the same brand",
      icon: "💎",
      xp: 2500,
      rarity: "legendary",
      unlocked: repeatMax >= 5,
      progress: repeatMax,
      maxProgress: 5,
    },
  ];

  const totalXp = achievements.reduce((sum, achievement) => {
    if (!achievement.unlocked) return sum;
    return sum + achievement.xp;
  }, 0);

  return Response.json({
    ok: true,
    achievements,
    totalXp,
    unlockedCount: achievements.filter((achievement) => achievement.unlocked).length,
    level,
    activeStrikes,
    generatedAt: nowDate().toISOString(),
  });
}
