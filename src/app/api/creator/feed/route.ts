import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { brands, creatorOfferRejections, matches, offers } from "@/db/schema";
import { requireCreatorContext } from "@/lib/auth";
import { getActiveStrikeCount, getCreatorFollowerRange, getStrikeLimit } from "@/lib/eligibility";
import { getCreatorProfileMissingFields } from "@/lib/creator-profile";

export const runtime = "nodejs";

const kmToMiles = (km: number) => km / 1.609344;
const milesToKm = (miles: number) => miles * 1.609344;

const toNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

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

function parseRadiusKm(metadata: Record<string, unknown>) {
  const km = toNumber(metadata.locationRadiusKm);
  if (km && km > 0) return km;
  const miles = toNumber(metadata.locationRadiusMiles);
  if (miles && miles > 0) return milesToKm(miles);
  return null;
}

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  try {
    const ctx = await requireCreatorContext(request);
    if (ctx instanceof Response) return ctx;

    const creator = ctx.creator;
    const unit = "MI" as const;
    const missingProfileFields = getCreatorProfileMissingFields(creator);
    const profileComplete = missingProfileFields.length === 0;

    const strikeLimit = getStrikeLimit();
    const strikes = await getActiveStrikeCount(creator.id);
    if (strikes >= strikeLimit) {
      return Response.json({
        ok: true,
        blocked: true,
        reason: "Too many strikes",
        profileComplete,
        missingProfileFields,
        offers: [],
        unit,
      });
    }

    const range = getCreatorFollowerRange();
    if (creator.followersCount !== null && creator.followersCount !== undefined) {
      const followers = creator.followersCount;
      if (followers < range.min || followers > range.max) {
        return Response.json({
          ok: true,
          blocked: true,
          reason: "Follower count outside nano range",
          profileComplete,
          missingProfileFields,
          offers: [],
          unit,
        });
      }
    }

    const whereClause = and(
      eq(offers.status, "PUBLISHED"),
      sql`NOT EXISTS (
        SELECT 1 FROM ${matches}
        WHERE ${matches.offerId} = ${offers.id}
          AND ${matches.creatorId} = ${creator.id}
      )`,
      sql`NOT EXISTS (
        SELECT 1 FROM ${creatorOfferRejections}
        WHERE ${creatorOfferRejections.offerId} = ${offers.id}
          AND ${creatorOfferRejections.creatorId} = ${creator.id}
      )`,
    );

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
      const radiusKm = parseRadiusKm(metadata);
      if (!radiusKm || radiusKm <= 0) return true;

      // If either side lacks coordinates, we can't evaluate eligibility here.
      // Keep the offer visible; the claim endpoint enforces local eligibility.
      if (
        creatorLat === null ||
        creatorLng === null ||
        row.brandLat === null ||
        row.brandLng === null
      ) {
        return true;
      }

      const distanceKm = haversineKm(creatorLat, creatorLng, row.brandLat, row.brandLng);
      return distanceKm <= radiusKm;
    });

    return Response.json({
      ok: true,
      blocked: false,
      profileComplete,
      missingProfileFields,
      unit,
      offers: filtered.map((r) => {
        const metadata = (r.metadata ?? {}) as Record<string, unknown>;
        const radiusKm = parseRadiusKm(metadata);
        const distanceKm =
          creatorLat !== null &&
          creatorLng !== null &&
          r.brandLat !== null &&
          r.brandLng !== null
            ? haversineKm(creatorLat, creatorLng, r.brandLat, r.brandLng)
            : null;
        const locationRadius = radiusKm !== null ? kmToMiles(radiusKm) : null;
        const distance = distanceKm !== null ? kmToMiles(distanceKm) : null;
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
          locationRadius: locationRadius !== null && Number.isFinite(locationRadius) ? Math.round(locationRadius * 10) / 10 : null,
          distance: distance !== null && Number.isFinite(distance) ? Math.round(distance * 10) / 10 : null,
          unit,
          fulfillmentType:
            typeof metadata.fulfillmentType === "string"
              ? (metadata.fulfillmentType.toUpperCase() === "SHOPIFY"
                  ? "SHOPIFY"
                  : metadata.fulfillmentType.toUpperCase() === "MANUAL"
                    ? "MANUAL"
                    : null)
              : null,
          manualFulfillmentMethod:
            typeof metadata.manualFulfillmentMethod === "string"
              ? (metadata.manualFulfillmentMethod.toUpperCase() === "LOCAL_DELIVERY"
                  ? "LOCAL_DELIVERY"
                  : metadata.manualFulfillmentMethod.toUpperCase() === "PICKUP"
                    ? "PICKUP"
                    : null)
              : null,
          manualFulfillmentNotes:
            typeof metadata.manualFulfillmentNotes === "string" && metadata.manualFulfillmentNotes.trim()
              ? metadata.manualFulfillmentNotes.trim()
              : null,
        };
      }),
    });
  } catch {
    return Response.json(
      { ok: false, error: "Failed to load offers" },
      { status: 500 },
    );
  }
}
