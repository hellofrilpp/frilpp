import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { brands, offers } from "@/db/schema";
import { requireCreatorContext } from "@/lib/auth";
import { getActiveStrikeCount, getCreatorFollowerRange, getStrikeLimit } from "@/lib/eligibility";

export const runtime = "nodejs";

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

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const countryQuery = url.searchParams.get("country");

  try {
    const ctx = await requireCreatorContext(request);
    if (ctx instanceof Response) return ctx;

    const creator = ctx.creator;
    const creatorCountry = creator.country;
    const country = creatorCountry ?? (countryQuery === "US" || countryQuery === "IN" ? countryQuery : null);

    const strikeLimit = getStrikeLimit();
    const strikes = await getActiveStrikeCount(creator.id);
    if (strikes >= strikeLimit) {
      return Response.json({
        ok: true,
        blocked: true,
        reason: "Too many strikes",
        offers: [],
      });
    }

    const range = getCreatorFollowerRange();
    const followers = creator.followersCount ?? 0;
    if (followers < range.min || followers > range.max) {
      return Response.json({
        ok: true,
        blocked: true,
        reason: "Follower count outside nano range",
        offers: [],
      });
    }

    const whereClause =
      country === "US" || country === "IN"
        ? and(
            eq(offers.status, "PUBLISHED"),
            sql`${offers.countriesAllowed} @> ARRAY[${country}]::text[]`,
          )
        : eq(offers.status, "PUBLISHED");

    const rows = await db
      .select({
        id: offers.id,
        title: offers.title,
        deliverable: offers.deliverableType,
        usageRightsRequired: offers.usageRightsRequired,
        usageRightsScope: offers.usageRightsScope,
        countriesAllowed: offers.countriesAllowed,
        deadlineDaysAfterDelivery: offers.deadlineDaysAfterDelivery,
        maxClaims: offers.maxClaims,
        brandName: brands.name,
        brandLat: brands.lat,
        brandLng: brands.lng,
        metadata: offers.metadata,
      })
      .from(offers)
      .innerJoin(brands, eq(brands.id, offers.brandId))
      .where(whereClause)
      .orderBy(desc(offers.publishedAt))
      .limit(50);

    const creatorLat = creator.lat ?? null;
    const creatorLng = creator.lng ?? null;

    const filtered = rows.filter((row) => {
      const metadata = (row.metadata ?? {}) as Record<string, unknown>;
      const radiusMiles = toNumber(metadata.locationRadiusMiles);
      if (!radiusMiles || radiusMiles <= 0) return true;
      if (
        creatorLat === null ||
        creatorLng === null ||
        row.brandLat === null ||
        row.brandLng === null
      ) {
        return false;
      }
      const distance = haversineMiles(creatorLat, creatorLng, row.brandLat, row.brandLng);
      return distance <= radiusMiles;
    });

    return Response.json({
      ok: true,
      blocked: false,
      offers: filtered.map((r) => {
        const metadata = (r.metadata ?? {}) as Record<string, unknown>;
        const radiusMiles = toNumber(metadata.locationRadiusMiles);
        const distanceMiles =
          creatorLat !== null &&
          creatorLng !== null &&
          r.brandLat !== null &&
          r.brandLng !== null
            ? haversineMiles(creatorLat, creatorLng, r.brandLat, r.brandLng)
            : null;
        return {
          id: r.id,
          brandName: r.brandName,
          title: r.title,
          valueUsd: 0,
          deliverable: r.deliverable,
          usageRightsRequired: r.usageRightsRequired,
          usageRightsScope: r.usageRightsScope ?? null,
          countriesAllowed: r.countriesAllowed,
          deadlineDaysAfterDelivery: r.deadlineDaysAfterDelivery,
          maxClaims: r.maxClaims,
          locationRadiusMiles: radiusMiles ?? null,
          distanceMiles,
        };
      }),
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "DB error" },
      { status: 500 },
    );
  }
}
