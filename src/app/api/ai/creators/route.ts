import { z } from "zod";
import { and, count, eq, inArray, lte, gte, sum } from "drizzle-orm";
import { db } from "@/db";
import {
  attributedOrders,
  attributedRefunds,
  brands,
  creators,
  deliverables,
  matches,
  offers,
} from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";
import { getCreatorFollowerRange } from "@/lib/eligibility";
import { zaiChat } from "@/lib/zai";

export const runtime = "nodejs";

const offerDraftSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    countriesAllowed: z.array(z.enum(["US", "IN"])).min(1).optional(),
    platforms: z.array(z.string()).max(6).optional(),
    contentTypes: z.array(z.string()).max(6).optional(),
    niches: z.array(z.string()).max(8).optional(),
    locationRadiusMiles: z.number().min(1).max(5000).optional(),
    minFollowers: z.number().int().min(0).optional(),
    maxFollowers: z.number().int().min(0).optional(),
    category: z.string().trim().min(1).max(80).optional(),
    description: z.string().trim().min(1).max(500).optional(),
  })
  .partial();

const bodySchema = z.object({
  offerId: z.string().optional(),
  limit: z.number().int().min(1).max(12).optional(),
  offerDraft: offerDraftSchema.optional(),
});

function scoreCandidate(entry: {
  followersCount: number | null;
  matchCount: number;
  verifiedCount: number;
  netRevenueCents: number;
  distanceMiles: number | null;
}) {
  const followers = entry.followersCount ?? 0;
  const revenueScore = Math.min(100, Math.round(entry.netRevenueCents / 5000));
  return (
    Math.min(100, Math.round(followers / 100)) +
    entry.matchCount * 5 +
    entry.verifiedCount * 8 +
    revenueScore * 2 +
    (entry.distanceMiles !== null ? Math.max(0, 20 - Math.round(entry.distanceMiles / 10)) : 0)
  );
}

const toNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const haversineMiles = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const r = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return r * c;
};

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctx = await requireBrandContext(request);
  if (ctx instanceof Response) return ctx;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const limit = parsed.data.limit ?? 6;

  const brandRows = await db
    .select({
      name: brands.name,
      location: brands.location,
      country: brands.country,
      lat: brands.lat,
      lng: brands.lng,
    })
    .from(brands)
    .where(eq(brands.id, ctx.brandId))
    .limit(1);
  const brand = brandRows[0];
  const brandLat = brand?.lat ?? null;
  const brandLng = brand?.lng ?? null;

  const offerDraft = parsed.data.offerDraft ?? null;

  let offer: { id: string; title: string; countriesAllowed: string[]; metadata: Record<string, unknown> } | null = null;
  if (parsed.data.offerId) {
    const offerRows = await db
      .select({ id: offers.id, title: offers.title, countriesAllowed: offers.countriesAllowed, metadata: offers.metadata })
      .from(offers)
      .where(and(eq(offers.id, parsed.data.offerId), eq(offers.brandId, ctx.brandId)))
      .limit(1);
    offer = offerRows[0] ?? null;
  }

  const allowedCountries = offerDraft?.countriesAllowed ?? offer?.countriesAllowed ?? null;
  const metadata = offer?.metadata ?? {};
  const rawNiches = Array.isArray(metadata["niches"]) ? (metadata["niches"] as string[]) : [];
  const niches = offerDraft?.niches?.length ? offerDraft.niches : rawNiches;
  const platforms = offerDraft?.platforms?.length
    ? offerDraft.platforms
    : Array.isArray(metadata["platforms"])
      ? (metadata["platforms"] as string[])
      : [];
  const contentTypes = offerDraft?.contentTypes?.length
    ? offerDraft.contentTypes
    : Array.isArray(metadata["contentTypes"])
      ? (metadata["contentTypes"] as string[])
      : [];
  const radiusMiles =
    offerDraft?.locationRadiusMiles ?? toNumber(metadata["locationRadiusMiles"]) ?? null;
  const hasLocationFilter =
    radiusMiles !== null && radiusMiles > 0 && brandLat !== null && brandLng !== null;

  const followerRange = getCreatorFollowerRange();
  const minFollowers = Math.max(
    followerRange.min,
    offerDraft?.minFollowers ?? followerRange.min,
  );
  const maxFollowers = Math.min(
    followerRange.max,
    offerDraft?.maxFollowers ?? followerRange.max,
  );
  if (minFollowers > maxFollowers) {
    return Response.json({ ok: true, creators: [] });
  }
  const conditions = [
    gte(creators.followersCount, minFollowers),
    lte(creators.followersCount, maxFollowers),
  ];
  if (allowedCountries && allowedCountries.length) {
    conditions.push(inArray(creators.country, allowedCountries));
  }

  const candidateRows = await db
    .select({
      creatorId: creators.id,
      username: creators.username,
      followersCount: creators.followersCount,
      country: creators.country,
      categories: creators.categories,
      lat: creators.lat,
      lng: creators.lng,
    })
    .from(creators)
    .where(and(...conditions))
    .limit(60);

  const normalizedNiches = niches.filter((item) => item && item !== "OTHER");
  const filteredCandidates = candidateRows.filter((row) => {
    if (!normalizedNiches.length) return true;
    const categories = (row.categories as string[] | null) ?? [];
    return categories.some((cat) => normalizedNiches.includes(cat));
  });

  const creatorIds = filteredCandidates.map((row) => row.creatorId);
  if (!creatorIds.length) {
    return Response.json({ ok: true, creators: [] });
  }

  const perfRows = await db
    .select({
      creatorId: matches.creatorId,
      matchCount: count(matches.id),
      verifiedCount: count(deliverables.id),
      revenueCents: sum(attributedOrders.totalPrice),
      refundCents: sum(attributedRefunds.totalRefund),
    })
    .from(matches)
    .innerJoin(offers, eq(offers.id, matches.offerId))
    .leftJoin(deliverables, and(eq(deliverables.matchId, matches.id), eq(deliverables.status, "VERIFIED")))
    .leftJoin(attributedOrders, eq(attributedOrders.matchId, matches.id))
    .leftJoin(attributedRefunds, eq(attributedRefunds.matchId, matches.id))
    .where(and(inArray(matches.creatorId, creatorIds), eq(offers.brandId, ctx.brandId)))
    .groupBy(matches.creatorId);

  const perfByCreator = new Map(
    perfRows.map((row) => [
      row.creatorId,
      {
        matchCount: Number(row.matchCount ?? 0),
        verifiedCount: Number(row.verifiedCount ?? 0),
        revenueCents: Number(row.revenueCents ?? 0),
        refundCents: Number(row.refundCents ?? 0),
      },
    ]),
  );

  const candidates = filteredCandidates
    .map((row) => {
      const distanceMiles =
        brandLat !== null &&
        brandLng !== null &&
        row.lat !== null &&
        row.lng !== null
          ? haversineMiles(brandLat, brandLng, row.lat, row.lng)
          : null;
      if (hasLocationFilter) {
        if (distanceMiles === null) return null;
        if (distanceMiles > radiusMiles) return null;
      }
      const perf = perfByCreator.get(row.creatorId) ?? {
        matchCount: 0,
        verifiedCount: 0,
        revenueCents: 0,
        refundCents: 0,
      };
      const netRevenueCents = perf.revenueCents - perf.refundCents;
      return {
        creatorId: row.creatorId,
        username: row.username ?? "Creator",
        followersCount: row.followersCount ?? 0,
        country: row.country ?? "",
        categories: (row.categories as string[] | null) ?? [],
        distanceMiles,
        matchCount: perf.matchCount,
        verifiedCount: perf.verifiedCount,
        netRevenueCents,
        score: scoreCandidate({
          followersCount: row.followersCount ?? 0,
          matchCount: perf.matchCount,
          verifiedCount: perf.verifiedCount,
          netRevenueCents,
          distanceMiles,
        }),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (!candidates.length) {
    return Response.json({ ok: true, creators: [] });
  }

  const fallback = [...candidates]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((c, index) => ({
      creatorId: c.creatorId,
      username: c.username,
      score: Math.max(1, Math.min(100, Math.round(c.score))),
      reason: "Ranked by historical performance and audience fit.",
      distanceMiles: c.distanceMiles ?? null,
      rank: index + 1,
    }));

  try {
    const prompt = {
      brand: {
        name: brand?.name ?? "Brand",
        location: brand?.location ?? null,
        country: brand?.country ?? null,
      },
      offer: offer || offerDraft
        ? {
            title: offerDraft?.title ?? offer?.title ?? "Draft offer",
            countriesAllowed: allowedCountries ?? [],
            niches,
            platforms,
            contentTypes,
            category: offerDraft?.category ?? (metadata["category"] as string | undefined) ?? null,
            description:
              offerDraft?.description ?? (metadata["description"] as string | undefined) ?? null,
          }
        : null,
      candidates,
      rules: {
        prioritize: ["verified creators", "fit niches", "net revenue", "audience size"],
        output: "Return JSON array only: [{creatorId, score (1-100), reason}]",
        max: limit,
      },
    };

    const content = await zaiChat({
      messages: [
        {
          role: "system",
          content: "You rank creators for a product seeding platform. Return only strict JSON.",
        },
        {
          role: "user",
          content: JSON.stringify(prompt),
        },
      ],
      temperature: 0.2,
      maxTokens: 600,
    });

    const parsedJson = JSON.parse(content) as Array<{ creatorId: string; score: number; reason?: string }>;
    const byId = new Map(candidates.map((c) => [c.creatorId, c]));
    const cleaned = parsedJson
      .map((item, index) => ({
        creatorId: item.creatorId,
        username: byId.get(item.creatorId)?.username ?? "Creator",
        score: Math.max(1, Math.min(100, Math.round(item.score ?? 0))),
        reason: item.reason ?? "Recommended by AI match.",
        distanceMiles: byId.get(item.creatorId)?.distanceMiles ?? null,
        rank: index + 1,
      }))
      .filter((item) => byId.has(item.creatorId))
      .slice(0, limit);

    if (!cleaned.length) {
      return Response.json({ ok: true, creators: fallback, fallback: true });
    }

    return Response.json({ ok: true, creators: cleaned, fallback: false });
  } catch {
    return Response.json({ ok: true, creators: fallback, fallback: true });
  }
}
