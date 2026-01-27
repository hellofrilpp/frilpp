import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  brands,
  creators,
  deliverables,
  manualShipments,
  matches,
  offers,
  shopifyOrders,
  userSocialAccounts,
} from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";

export const runtime = "nodejs";

const kmToMiles = (km: number) => km / 1.609344;

const querySchema = z.object({
  status: z
    .enum(["PENDING_APPROVAL", "ACCEPTED", "REVOKED", "CANCELED", "CLAIMED"])
    .optional(),
  offerId: z.string().min(1).optional(),
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
  const parsed = querySchema.safeParse({
    status: url.searchParams.get("status") ?? undefined,
    offerId: url.searchParams.get("offerId") ?? undefined,
  });
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid query" }, { status: 400 });
  }

  const ctx = await requireBrandContext(request);
  if (ctx instanceof Response) return ctx;

  const status = parsed.data.status;
  const offerId = parsed.data.offerId;

  const brandRows = await db
    .select({ lat: brands.lat, lng: brands.lng })
    .from(brands)
    .where(eq(brands.id, ctx.brandId))
    .limit(1);
  const brand = brandRows[0];
  const brandLat = brand?.lat ?? null;
  const brandLng = brand?.lng ?? null;

  const filters = [eq(offers.brandId, ctx.brandId)];
  if (status) {
    filters.push(eq(matches.status, status));
  }
  if (offerId) {
    filters.push(eq(matches.offerId, offerId));
  }

  const whereClause = filters.length > 1 ? and(...filters) : filters[0];

  const rows = await db
    .select({
      matchId: matches.id,
      matchStatus: matches.status,
      campaignCode: matches.campaignCode,
      createdAt: matches.createdAt,
      acceptedAt: matches.acceptedAt,
      rejectedAt: matches.rejectedAt,
      rejectionReason: matches.rejectionReason,
      deliverableStatus: deliverables.status,
      deliverableDueAt: deliverables.dueAt,
      deliverableSubmittedAt: deliverables.submittedAt,
      deliverableSubmittedPermalink: deliverables.submittedPermalink,
      deliverableSubmittedNotes: deliverables.submittedNotes,
      deliverableVerifiedAt: deliverables.verifiedAt,
      deliverableVerifiedPermalink: deliverables.verifiedPermalink,
      orderStatus: shopifyOrders.status,
      orderTrackingNumber: shopifyOrders.trackingNumber,
      orderTrackingUrl: shopifyOrders.trackingUrl,
      manualStatus: manualShipments.status,
      manualCarrier: manualShipments.carrier,
      manualTrackingNumber: manualShipments.trackingNumber,
      manualTrackingUrl: manualShipments.trackingUrl,
      offerId: offers.id,
      offerTitle: offers.title,
      creatorId: creators.id,
      creatorUsername: creators.username,
      creatorFollowers: creators.followersCount,
      creatorFullName: creators.fullName,
      creatorEmail: creators.email,
      creatorPhone: creators.phone,
      creatorAddress1: creators.address1,
      creatorCity: creators.city,
      creatorProvince: creators.province,
      creatorZip: creators.zip,
      creatorLat: creators.lat,
      creatorLng: creators.lng,
      creatorTikTokId: userSocialAccounts.providerUserId,
    })
    .from(matches)
    .innerJoin(offers, eq(matches.offerId, offers.id))
    .innerJoin(creators, eq(matches.creatorId, creators.id))
    .leftJoin(deliverables, eq(deliverables.matchId, matches.id))
    .leftJoin(shopifyOrders, eq(shopifyOrders.matchId, matches.id))
    .leftJoin(manualShipments, eq(manualShipments.matchId, matches.id))
    .leftJoin(
      userSocialAccounts,
      and(eq(userSocialAccounts.userId, creators.id), eq(userSocialAccounts.provider, "TIKTOK")),
    )
    .where(whereClause)
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
        rejectionReason: r.rejectionReason ?? null,
        rejectedAt: r.rejectedAt?.toISOString() ?? null,
        campaignCode: r.campaignCode,
        createdAt: r.createdAt.toISOString(),
        acceptedAt: r.acceptedAt?.toISOString() ?? null,
        deliverable: r.deliverableStatus
          ? {
              status: r.deliverableStatus,
              dueAt: r.deliverableDueAt?.toISOString() ?? null,
              submittedAt: r.deliverableSubmittedAt?.toISOString() ?? null,
              submittedPermalink: r.deliverableSubmittedPermalink ?? null,
              submittedNotes: r.deliverableSubmittedNotes ?? null,
              verifiedAt: r.deliverableVerifiedAt?.toISOString() ?? null,
              verifiedPermalink: r.deliverableVerifiedPermalink ?? null,
            }
          : null,
        shipment: {
          orderStatus: r.orderStatus ?? null,
          orderTrackingNumber: r.orderTrackingNumber ?? null,
          orderTrackingUrl: r.orderTrackingUrl ?? null,
          manualStatus: r.manualStatus ?? null,
          manualCarrier: r.manualCarrier ?? null,
          manualTrackingNumber: r.manualTrackingNumber ?? null,
          manualTrackingUrl: r.manualTrackingUrl ?? null,
        },
        offer: { id: r.offerId, title: r.offerTitle },
        creator: {
          id: r.creatorId,
          username: r.creatorUsername,
          followersCount: r.creatorFollowers ?? null,
          fullName: r.creatorFullName ?? null,
          email: r.creatorEmail ?? null,
          phone: r.creatorPhone ?? null,
          city: r.creatorCity ?? null,
          province: r.creatorProvince ?? null,
          zip: r.creatorZip ?? null,
          tiktokUserId: r.creatorTikTokId ?? null,
          shippingReady: Boolean(r.creatorAddress1 && r.creatorCity && r.creatorZip),
          distanceKm,
          distanceMiles: distanceKm !== null ? kmToMiles(distanceKm) : null,
        },
      };
    }),
  });
}
