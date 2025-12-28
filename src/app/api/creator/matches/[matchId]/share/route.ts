import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { brands, deliverables, matches, offers } from "@/db/schema";
import { requireCreatorContext } from "@/lib/auth";

export const runtime = "nodejs";

function normalizeHandle(raw: string | null) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
}

export async function GET(request: Request, context: { params: Promise<{ matchId: string }> }) {
  if (!process.env.DATABASE_URL) {
    return Response.json({ ok: false, error: "DATABASE_URL is not configured" }, { status: 500 });
  }

  const ctx = await requireCreatorContext(request);
  if (ctx instanceof Response) return ctx;

  const { matchId } = await context.params;

  const rows = await db
    .select({
      matchId: matches.id,
      matchStatus: matches.status,
      campaignCode: matches.campaignCode,
      offerId: offers.id,
      offerTitle: offers.title,
      offerDeliverableType: offers.deliverableType,
      offerMetadata: offers.metadata,
      brandName: brands.name,
      brandInstagramHandle: brands.instagramHandle,
      brandAddress1: brands.address1,
      brandCity: brands.city,
      brandProvince: brands.province,
      brandZip: brands.zip,
      brandCountry: brands.country,
      brandWebsite: brands.website,
      brandLat: brands.lat,
      brandLng: brands.lng,
      deliverableStatus: deliverables.status,
      deliverableDueAt: deliverables.dueAt,
    })
    .from(matches)
    .innerJoin(offers, eq(offers.id, matches.offerId))
    .innerJoin(brands, eq(brands.id, offers.brandId))
    .leftJoin(deliverables, eq(deliverables.matchId, matches.id))
    .where(and(eq(matches.id, matchId), eq(matches.creatorId, ctx.creator.id)))
    .limit(1);

  const row = rows[0] ?? null;
  if (!row) return Response.json({ ok: false, error: "Match not found" }, { status: 404 });

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const shareUrl = `${origin}/r/${encodeURIComponent(row.campaignCode)}`;
  const instagramHandle = normalizeHandle(row.brandInstagramHandle ?? null);

  const metadata =
    row.offerMetadata && typeof row.offerMetadata === "object"
      ? (row.offerMetadata as Record<string, unknown>)
      : {};
  const ctaUrl = typeof metadata.ctaUrl === "string" ? metadata.ctaUrl.trim() : "";
  const platformsRaw = Array.isArray(metadata.platforms) ? metadata.platforms : [];
  const platforms = platformsRaw
    .map((p) => String(p).toUpperCase())
    .filter((p): p is "INSTAGRAM" | "TIKTOK" => p === "INSTAGRAM" || p === "TIKTOK");

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

  const pickupAddressParts = [
    row.brandAddress1,
    row.brandCity,
    row.brandProvince,
    row.brandZip,
    row.brandCountry,
  ].filter(Boolean);
  const pickupAddress = pickupAddressParts.length ? pickupAddressParts.join(", ") : null;
  const mapsUrl = pickupAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pickupAddress)}`
    : row.brandLat !== null && row.brandLng !== null
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${row.brandLat},${row.brandLng}`,
        )}`
      : null;

  const disclosure = "#gifted";
  const captionLines = [
    `Trying ${row.offerTitle} from ${row.brandName}.`,
    instagramHandle ? `@${instagramHandle}` : null,
    `Link: ${shareUrl}`,
    `Code: ${row.campaignCode}`,
    disclosure,
  ].filter(Boolean);
  const caption = captionLines.join("\n");

  return Response.json({
    ok: true,
    match: {
      id: row.matchId,
      status: row.matchStatus,
      campaignCode: row.campaignCode,
    },
    offer: {
      id: row.offerId,
      title: row.offerTitle,
      deliverableType: row.offerDeliverableType,
      platforms,
      fulfillmentType: fulfillmentType === "SHOPIFY" || fulfillmentType === "MANUAL" ? fulfillmentType : null,
      manualFulfillmentMethod:
        manualFulfillmentMethod === "PICKUP" || manualFulfillmentMethod === "LOCAL_DELIVERY"
          ? manualFulfillmentMethod
          : null,
      manualFulfillmentNotes,
      ctaUrl: ctaUrl || null,
    },
    brand: {
      name: row.brandName,
      instagramHandle,
      address: pickupAddress,
      mapsUrl,
      website: row.brandWebsite ?? null,
    },
    deliverable: row.deliverableDueAt
      ? {
          status: row.deliverableStatus ?? null,
          dueAt: row.deliverableDueAt.toISOString(),
        }
      : null,
    shareUrl,
    caption,
  });
}
