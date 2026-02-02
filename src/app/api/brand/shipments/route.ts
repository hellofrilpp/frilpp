import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { creators, manualShipments, matches, offers } from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";

export const runtime = "nodejs";

const querySchema = z.object({
  status: z.enum(["PENDING", "SHIPPED"]).optional(),
});

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
  const whereClause = statusFilter
    ? and(eq(offers.brandId, ctx.brandId), eq(manualShipments.status, statusFilter))
    : eq(offers.brandId, ctx.brandId);

  const rows = await db
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
      creatorFullName: creators.fullName,
      creatorEmail: creators.email,
    })
    .from(manualShipments)
    .innerJoin(matches, eq(matches.id, manualShipments.matchId))
    .innerJoin(offers, eq(offers.id, matches.offerId))
    .innerJoin(creators, eq(creators.id, matches.creatorId))
    .where(whereClause)
    .orderBy(desc(manualShipments.updatedAt))
    .limit(200);

  const parseOfferFulfillment = (metadata: Record<string, unknown>) => {
    const fulfillmentType =
      typeof metadata.fulfillmentType === "string"
        ? metadata.fulfillmentType.toUpperCase() === "MANUAL"
          ? "MANUAL"
          : null
        : null;
    const manualFulfillmentMethod =
      typeof metadata.manualFulfillmentMethod === "string"
        ? metadata.manualFulfillmentMethod.toUpperCase() === "LOCAL_DELIVERY"
          ? "LOCAL_DELIVERY"
          : metadata.manualFulfillmentMethod.toUpperCase() === "PICKUP"
            ? "PICKUP"
            : null
        : null;
    const manualFulfillmentNotes =
      typeof metadata.manualFulfillmentNotes === "string" && metadata.manualFulfillmentNotes.trim()
        ? metadata.manualFulfillmentNotes.trim()
        : null;
    return { fulfillmentType, manualFulfillmentMethod, manualFulfillmentNotes };
  };

  return Response.json({
    ok: true,
    shipments: rows.map((r) => {
      const parsed = parseOfferFulfillment((r.offerMetadata ?? {}) as Record<string, unknown>);
      return {
        id: r.shipmentId,
        fulfillmentType: "MANUAL",
        status: r.status,
        trackingNumber: r.trackingNumber ?? null,
        trackingUrl: r.trackingUrl ?? null,
        carrier: r.carrier ?? null,
        updatedAt: r.updatedAt.toISOString(),
        match: { id: r.matchId, campaignCode: r.campaignCode },
        offer: {
          title: r.offerTitle,
          fulfillmentType: parsed.fulfillmentType,
          manualFulfillmentMethod: parsed.manualFulfillmentMethod,
          manualFulfillmentNotes: parsed.manualFulfillmentNotes,
        },
        creator: {
          id: r.creatorId,
          username: r.creatorUsername,
          fullName: r.creatorFullName ?? null,
          email: r.creatorEmail ?? null,
        },
      };
    }),
  });
}
