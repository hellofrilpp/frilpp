import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { creators, manualShipments, matches, offers, shopifyOrders } from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";

export const runtime = "nodejs";

const querySchema = z.object({
  status: z
    .enum(["PENDING", "SHIPPED", "DRAFT_CREATED", "COMPLETED", "FULFILLED", "CANCELED", "ERROR"])
    .optional(),
});

type ShopifyShipmentStatus =
  | "PENDING"
  | "DRAFT_CREATED"
  | "COMPLETED"
  | "FULFILLED"
  | "CANCELED"
  | "ERROR";

type ManualShipmentStatus = "PENDING" | "SHIPPED";

function isShopifyShipmentStatus(value: string): value is ShopifyShipmentStatus {
  return (
    value === "PENDING" ||
    value === "DRAFT_CREATED" ||
    value === "COMPLETED" ||
    value === "FULFILLED" ||
    value === "CANCELED" ||
    value === "ERROR"
  );
}

function isManualShipmentStatus(value: string): value is ManualShipmentStatus {
  return value === "PENDING" || value === "SHIPPED";
}

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctx = await requireBrandContext(request);
  if (ctx instanceof Response) return ctx;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ status: url.searchParams.get("status") ?? undefined });
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid query" }, { status: 400 });
  }

  const statusFilter = parsed.data.status ?? null;
  const shopifyStatus = statusFilter && isShopifyShipmentStatus(statusFilter) ? statusFilter : null;
  const manualStatus = statusFilter && isManualShipmentStatus(statusFilter) ? statusFilter : null;
  const shopifyWhere =
    shopifyStatus
      ? and(eq(offers.brandId, ctx.brandId), eq(shopifyOrders.status, shopifyStatus))
      : eq(offers.brandId, ctx.brandId);

  const shopifyRows =
    statusFilter && !shopifyStatus
      ? []
      : await db
          .select({
            shopifyOrderRowId: shopifyOrders.id,
            status: shopifyOrders.status,
            shopDomain: shopifyOrders.shopDomain,
            shopifyOrderId: shopifyOrders.shopifyOrderId,
            shopifyOrderName: shopifyOrders.shopifyOrderName,
            trackingNumber: shopifyOrders.trackingNumber,
            trackingUrl: shopifyOrders.trackingUrl,
            error: shopifyOrders.error,
            updatedAt: shopifyOrders.updatedAt,
            matchId: matches.id,
            campaignCode: matches.campaignCode,
            offerTitle: offers.title,
            offerMetadata: offers.metadata,
            creatorId: creators.id,
            creatorUsername: creators.username,
            creatorEmail: creators.email,
            creatorCountry: creators.country,
          })
          .from(shopifyOrders)
          .innerJoin(matches, eq(matches.id, shopifyOrders.matchId))
          .innerJoin(offers, eq(offers.id, matches.offerId))
          .innerJoin(creators, eq(creators.id, matches.creatorId))
          .where(shopifyWhere)
          .orderBy(desc(shopifyOrders.updatedAt))
          .limit(200);

  const manualWhere =
    manualStatus
      ? and(eq(offers.brandId, ctx.brandId), eq(manualShipments.status, manualStatus))
      : eq(offers.brandId, ctx.brandId);

  const manualRows =
    statusFilter && !manualStatus
      ? []
      : await db
          .select({
            shipmentId: manualShipments.id,
            status: manualShipments.status,
            carrier: manualShipments.carrier,
            trackingNumber: manualShipments.trackingNumber,
            trackingUrl: manualShipments.trackingUrl,
            updatedAt: manualShipments.updatedAt,
            matchId: matches.id,
            campaignCode: matches.campaignCode,
            offerTitle: offers.title,
            offerMetadata: offers.metadata,
            creatorId: creators.id,
            creatorUsername: creators.username,
            creatorEmail: creators.email,
            creatorCountry: creators.country,
          })
          .from(manualShipments)
          .innerJoin(matches, eq(matches.id, manualShipments.matchId))
          .innerJoin(offers, eq(offers.id, matches.offerId))
          .innerJoin(creators, eq(creators.id, matches.creatorId))
          .where(manualWhere)
          .orderBy(desc(manualShipments.updatedAt))
          .limit(200);

  const shipments = [
    ...shopifyRows.map((r) => ({
      offerMetadata: (r.offerMetadata ?? {}) as Record<string, unknown>,
      id: r.shopifyOrderRowId,
      fulfillmentType: "SHOPIFY",
      status: r.status,
      shopDomain: r.shopDomain,
      shopifyOrderId: r.shopifyOrderId ?? null,
      shopifyOrderName: r.shopifyOrderName ?? null,
      trackingNumber: r.trackingNumber ?? null,
      trackingUrl: r.trackingUrl ?? null,
      error: r.error ?? null,
      updatedAt: r.updatedAt.toISOString(),
      match: { id: r.matchId, campaignCode: r.campaignCode },
      offer: { title: r.offerTitle },
      creator: {
        id: r.creatorId,
        username: r.creatorUsername,
        email: r.creatorEmail ?? null,
        country: r.creatorCountry ?? null,
      },
    })),
    ...manualRows.map((r) => ({
      offerMetadata: (r.offerMetadata ?? {}) as Record<string, unknown>,
      id: r.shipmentId,
      fulfillmentType: "MANUAL",
      status: r.status,
      shopDomain: null,
      shopifyOrderId: null,
      shopifyOrderName: null,
      trackingNumber: r.trackingNumber ?? null,
      trackingUrl: r.trackingUrl ?? null,
      error: null,
      carrier: r.carrier ?? null,
      updatedAt: r.updatedAt.toISOString(),
      match: { id: r.matchId, campaignCode: r.campaignCode },
      offer: { title: r.offerTitle },
      creator: {
        id: r.creatorId,
        username: r.creatorUsername,
        email: r.creatorEmail ?? null,
        country: r.creatorCountry ?? null,
      },
    })),
  ].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  const parseOfferFulfillment = (metadata: Record<string, unknown>) => {
    const fulfillmentType =
      typeof metadata.fulfillmentType === "string"
        ? (metadata.fulfillmentType.toUpperCase() === "SHOPIFY"
            ? "SHOPIFY"
            : metadata.fulfillmentType.toUpperCase() === "MANUAL"
              ? "MANUAL"
              : null)
        : null;
    const manualFulfillmentMethod =
      typeof metadata.manualFulfillmentMethod === "string"
        ? (metadata.manualFulfillmentMethod.toUpperCase() === "LOCAL_DELIVERY"
            ? "LOCAL_DELIVERY"
            : metadata.manualFulfillmentMethod.toUpperCase() === "PICKUP"
              ? "PICKUP"
              : null)
        : null;
    const manualFulfillmentNotes =
      typeof metadata.manualFulfillmentNotes === "string" && metadata.manualFulfillmentNotes.trim()
        ? metadata.manualFulfillmentNotes.trim()
        : null;
    return { fulfillmentType, manualFulfillmentMethod, manualFulfillmentNotes };
  };

  return Response.json({
    ok: true,
    shipments: shipments.map((s) => {
      const parsed = parseOfferFulfillment(s.offerMetadata);
      return {
        ...s,
        offer: {
          ...s.offer,
          fulfillmentType: parsed.fulfillmentType,
          manualFulfillmentMethod: parsed.manualFulfillmentMethod,
          manualFulfillmentNotes: parsed.manualFulfillmentNotes,
        },
        offerMetadata: undefined,
      };
    }),
  });
}
