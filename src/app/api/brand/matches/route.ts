import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { brands, creators, matches, offers } from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";

export const runtime = "nodejs";

const kmToMiles = (km: number) => km / 1.609344;

const querySchema = z.object({
  status: z
    .enum(["PENDING_APPROVAL", "ACCEPTED", "REVOKED", "CANCELED", "CLAIMED"])
    .optional(),
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
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ status: url.searchParams.get("status") ?? undefined });
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid query" }, { status: 400 });
  }

  const ctx = await requireBrandContext(request);
  if (ctx instanceof Response) return ctx;

  const status = parsed.data.status ?? "PENDING_APPROVAL";

  const brandRows = await db
    .select({ lat: brands.lat, lng: brands.lng })
    .from(brands)
    .where(eq(brands.id, ctx.brandId))
    .limit(1);
  const brand = brandRows[0];
  const brandLat = brand?.lat ?? null;
  const brandLng = brand?.lng ?? null;

  const rows = await db
    .select({
      matchId: matches.id,
      matchStatus: matches.status,
      campaignCode: matches.campaignCode,
      createdAt: matches.createdAt,
      acceptedAt: matches.acceptedAt,
      offerId: offers.id,
      offerTitle: offers.title,
      creatorId: creators.id,
      creatorUsername: creators.username,
      creatorFollowers: creators.followersCount,
      creatorCountry: creators.country,
      creatorAddress1: creators.address1,
      creatorCity: creators.city,
      creatorZip: creators.zip,
      creatorLat: creators.lat,
      creatorLng: creators.lng,
    })
    .from(matches)
    .innerJoin(offers, eq(matches.offerId, offers.id))
    .innerJoin(creators, eq(matches.creatorId, creators.id))
    .where(and(eq(offers.brandId, ctx.brandId), eq(matches.status, status)))
    .orderBy(desc(matches.createdAt))
    .limit(100);

  return Response.json({
    ok: true,
    matches: rows.map((r) => {
      const distanceKm =
        brandLat !== null &&
        brandLng !== null &&
        r.creatorLat !== null &&
        r.creatorLng !== null
          ? haversineKm(brandLat, brandLng, r.creatorLat, r.creatorLng)
          : null;
      return {
        matchId: r.matchId,
        status: r.matchStatus,
        campaignCode: r.campaignCode,
        createdAt: r.createdAt.toISOString(),
        acceptedAt: r.acceptedAt?.toISOString() ?? null,
        offer: { id: r.offerId, title: r.offerTitle },
        creator: {
          id: r.creatorId,
          username: r.creatorUsername,
          followersCount: r.creatorFollowers ?? null,
          country: r.creatorCountry ?? null,
          shippingReady: Boolean(r.creatorAddress1 && r.creatorCity && r.creatorZip),
          distanceKm,
          distanceMiles: distanceKm !== null ? kmToMiles(distanceKm) : null,
        },
      };
    }),
  });
}
