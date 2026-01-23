import { and, eq, gte, isNotNull, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { brands, creators } from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";
import { getCreatorFollowerRange } from "@/lib/eligibility";
import { hasActiveSubscription } from "@/lib/billing";

export const runtime = "nodejs";

const milesToKm = (miles: number) => miles * 1.609344;

const querySchema = z.object({
  radiusKm: z.coerce.number().finite().min(1).max(800).optional(),
  radiusMiles: z.coerce.number().finite().min(1).max(500).optional(), // legacy
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const r = 6371;
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
    return Response.json({ ok: false, error: "DATABASE_URL is not configured" }, { status: 500 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    radiusKm: url.searchParams.get("radiusKm") ?? undefined,
    radiusMiles: url.searchParams.get("radiusMiles") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid query" }, { status: 400 });
  }

  const ctx = await requireBrandContext(request);
  if (ctx instanceof Response) return ctx;
  const subscribed = await hasActiveSubscription({ subjectType: "BRAND", subjectId: ctx.brandId });

  const radiusKm =
    parsed.data.radiusKm ?? (parsed.data.radiusMiles ? milesToKm(parsed.data.radiusMiles) : 40.2336);
  const limit = parsed.data.limit ?? 8;
  const brandRows = await db
    .select({ lat: brands.lat, lng: brands.lng })
    .from(brands)
    .where(eq(brands.id, ctx.brandId))
    .limit(1);
  const brand = brandRows[0] ?? null;
  const brandLat = brand?.lat ?? null;
  const brandLng = brand?.lng ?? null;
  if (brandLat === null || brandLng === null) {
    return Response.json(
      { ok: false, error: "Brand location is not set (set it in Settings → Profile)" },
      { status: 409 },
    );
  }

  const latRad = (brandLat * Math.PI) / 180;
  const latDelta = radiusKm / 111.32;
  const lngDelta = radiusKm / Math.max(0.1, 111.32 * Math.cos(latRad));

  const minLat = brandLat - latDelta;
  const maxLat = brandLat + latDelta;
  const minLng = brandLng - lngDelta;
  const maxLng = brandLng + lngDelta;

  const followerRange = getCreatorFollowerRange();

  const where = [
    isNotNull(creators.lat),
    isNotNull(creators.lng),
    gte(creators.lat, minLat),
    lte(creators.lat, maxLat),
    gte(creators.lng, minLng),
    lte(creators.lng, maxLng),
    gte(creators.followersCount, followerRange.min),
    lte(creators.followersCount, followerRange.max),
  ];

  const rows = await db
    .select({
      id: creators.id,
      username: creators.username,
      followersCount: creators.followersCount,
      lat: creators.lat,
      lng: creators.lng,
    })
    .from(creators)
    .where(and(...where))
    .limit(600);

  const inRadius = rows
    .map((row) => {
      if (row.lat === null || row.lng === null) return null;
      const distanceKm = haversineKm(brandLat, brandLng, row.lat, row.lng);
      if (distanceKm > radiusKm) return null;
      return {
        id: row.id,
        username: row.username ?? "Creator",
        followersCount: row.followersCount ?? 0,
        distanceKm: Math.round(distanceKm * 10) / 10,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const top = [...inRadius]
    .sort((a, b) => a.distanceKm - b.distanceKm || b.followersCount - a.followersCount)
    .slice(0, limit);

  return Response.json({
    ok: true,
    radiusKm,
    creatorCount: inRadius.length,
    creators: top.map((c, idx) => ({
      ...c,
      username: subscribed ? c.username : `Creator #${idx + 1}`,
    })),
    preview: !subscribed,
  });
}
