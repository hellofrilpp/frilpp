import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { brands, deliverables, manualShipments, matches, offers, shopifyOrders } from "@/db/schema";
import { requireCreatorContext } from "@/lib/auth";

export const runtime = "nodejs";

function mapDealStatus(params: {
  matchStatus: "PENDING_APPROVAL" | "ACCEPTED" | "REVOKED" | "CANCELED" | "CLAIMED";
  orderStatus: string | null;
  manualStatus: string | null;
  deliverableStatus: "DUE" | "VERIFIED" | "FAILED" | null;
  submittedAt: Date | null;
}) {
  if (params.matchStatus === "PENDING_APPROVAL") return "pending";
  if (params.matchStatus !== "ACCEPTED") return "pending";

  if (params.deliverableStatus === "VERIFIED") return "complete";
  if (params.submittedAt) return "posted";

  const shippedStatuses = new Set(["DRAFT_CREATED", "COMPLETED", "FULFILLED"]);
  const shipped =
    (params.orderStatus && shippedStatuses.has(params.orderStatus)) || params.manualStatus === "SHIPPED";
  if (shipped) return "shipped";

  return "approved";
}

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctx = await requireCreatorContext(request);
  if (ctx instanceof Response) return ctx;

  const rows = await db
    .select({
      matchId: matches.id,
      matchStatus: matches.status,
      matchCreatedAt: matches.createdAt,
      offerTitle: offers.title,
      brandName: brands.name,
      orderStatus: shopifyOrders.status,
      trackingNumber: shopifyOrders.trackingNumber,
      trackingUrl: shopifyOrders.trackingUrl,
      manualStatus: manualShipments.status,
      manualCarrier: manualShipments.carrier,
      manualTrackingNumber: manualShipments.trackingNumber,
      manualTrackingUrl: manualShipments.trackingUrl,
      deliverableStatus: deliverables.status,
      deliverableDueAt: deliverables.dueAt,
      deliverableSubmittedAt: deliverables.submittedAt,
    })
    .from(matches)
    .innerJoin(offers, eq(offers.id, matches.offerId))
    .innerJoin(brands, eq(brands.id, offers.brandId))
    .leftJoin(shopifyOrders, eq(shopifyOrders.matchId, matches.id))
    .leftJoin(manualShipments, eq(manualShipments.matchId, matches.id))
    .leftJoin(deliverables, eq(deliverables.matchId, matches.id))
    .where(
      and(
        eq(matches.creatorId, ctx.creator.id),
        inArray(matches.status, ["PENDING_APPROVAL", "ACCEPTED"]),
      ),
    )
    .orderBy(desc(matches.createdAt))
    .limit(100);

  return Response.json({
    ok: true,
    deals: rows.map((row) => ({
      id: row.matchId,
      brand: row.brandName,
      product: row.offerTitle,
      valueUsd: null,
      status: mapDealStatus({
        matchStatus: row.matchStatus,
        orderStatus: row.orderStatus ?? null,
        manualStatus: row.manualStatus ?? null,
        deliverableStatus: row.deliverableStatus ?? null,
        submittedAt: row.deliverableSubmittedAt ?? null,
      }),
      matchDate: row.matchCreatedAt.toISOString(),
      deadline: row.deliverableDueAt ? row.deliverableDueAt.toISOString() : null,
      trackingNumber: row.trackingNumber ?? row.manualTrackingNumber ?? null,
      trackingUrl: row.trackingUrl ?? row.manualTrackingUrl ?? null,
      carrier: row.manualCarrier ?? null,
    })),
  });
}
