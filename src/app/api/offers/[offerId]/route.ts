import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands, offers } from "@/db/schema";

export const runtime = "nodejs";

const kmToMiles = (km: number) => km / 1.609344;
const milesToKm = (miles: number) => miles * 1.609344;

export async function GET(_request: Request, context: { params: Promise<{ offerId: string }> }) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const { offerId } = await context.params;

    const rows = await db
      .select({
      id: offers.id,
      title: offers.title,
      template: offers.template,
      status: offers.status,
      countriesAllowed: offers.countriesAllowed,
      maxClaims: offers.maxClaims,
      deadlineDaysAfterDelivery: offers.deadlineDaysAfterDelivery,
      deliverableType: offers.deliverableType,
      usageRightsRequired: offers.usageRightsRequired,
      usageRightsScope: offers.usageRightsScope,
      metadata: offers.metadata,
      publishedAt: offers.publishedAt,
      brandName: brands.name,
      brandAddress1: brands.address1,
      brandCity: brands.city,
      brandProvince: brands.province,
      brandZip: brands.zip,
      brandCountry: brands.country,
    })
    .from(offers)
    .innerJoin(brands, eq(brands.id, offers.brandId))
    .where(eq(offers.id, offerId))
    .limit(1);

  const offer = rows[0];
  if (!offer) return Response.json({ ok: false, error: "Offer not found" }, { status: 404 });
  if (offer.status !== "PUBLISHED") {
    return Response.json({ ok: false, error: "Offer not available" }, { status: 400 });
  }

  const metadata =
    offer.metadata && typeof offer.metadata === "object"
      ? (offer.metadata as Record<string, unknown>)
      : {};
  const fulfillmentType =
    typeof metadata.fulfillmentType === "string" ? metadata.fulfillmentType.toUpperCase() : null;
  const manualFulfillmentMethod =
    typeof metadata.manualFulfillmentMethod === "string"
      ? metadata.manualFulfillmentMethod.toUpperCase()
      : null;
  const manualFulfillmentNotes =
    typeof metadata.manualFulfillmentNotes === "string" && metadata.manualFulfillmentNotes.trim()
      ? metadata.manualFulfillmentNotes.trim()
      : null;
  const locationRadiusKmRaw =
    typeof metadata.locationRadiusKm === "number"
      ? metadata.locationRadiusKm
      : typeof metadata.locationRadiusKm === "string"
        ? Number(metadata.locationRadiusKm)
        : null;
  const locationRadiusMilesRaw =
    typeof metadata.locationRadiusMiles === "number"
      ? metadata.locationRadiusMiles
      : typeof metadata.locationRadiusMiles === "string"
        ? Number(metadata.locationRadiusMiles)
        : null;
  const locationRadiusKm =
    locationRadiusKmRaw && Number.isFinite(locationRadiusKmRaw) && locationRadiusKmRaw > 0
      ? locationRadiusKmRaw
      : locationRadiusMilesRaw && Number.isFinite(locationRadiusMilesRaw) && locationRadiusMilesRaw > 0
        ? milesToKm(locationRadiusMilesRaw)
        : null;
  const locationRadiusMiles = locationRadiusKm ? kmToMiles(locationRadiusKm) : null;

  const pickupAddressParts = [
    offer.brandAddress1,
    offer.brandCity,
    offer.brandProvince,
    offer.brandZip,
    offer.brandCountry,
  ].filter(Boolean);
  const pickupAddress = pickupAddressParts.length ? pickupAddressParts.join(", ") : null;

  return Response.json({
    ok: true,
    offer: {
      id: offer.id,
      title: offer.title,
      template: offer.template,
      countriesAllowed: offer.countriesAllowed,
      maxClaims: offer.maxClaims,
      deadlineDaysAfterDelivery: offer.deadlineDaysAfterDelivery,
      deliverableType: offer.deliverableType,
      usageRightsRequired: offer.usageRightsRequired,
      usageRightsScope: offer.usageRightsScope ?? null,
      fulfillmentType: fulfillmentType === "MANUAL" || fulfillmentType === "SHOPIFY" ? fulfillmentType : null,
      manualFulfillmentMethod:
        manualFulfillmentMethod === "PICKUP" || manualFulfillmentMethod === "LOCAL_DELIVERY"
          ? manualFulfillmentMethod
          : null,
      manualFulfillmentNotes,
      locationRadiusKm: locationRadiusKm ? Math.round(locationRadiusKm * 10) / 10 : null,
      locationRadiusMiles: locationRadiusMiles ? Math.round(locationRadiusMiles * 10) / 10 : null,
      pickupAddress,
      publishedAt: offer.publishedAt?.toISOString() ?? null,
      brandName: offer.brandName,
    },
  });
}
