import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { brands, deliverables, matches, offers, shopifyOrders } from "@/db/schema";
import { requireCreatorContext } from "@/lib/auth";

export const runtime = "nodejs";

function mapDealStatus(params: {
  matchStatus: "PENDING_APPROVAL" | "ACCEPTED" | "REVOKED" | "CANCELED" | "CLAIMED";
  orderStatus: string | null;
  deliverableStatus: "DUE" | "VERIFIED" | "FAILED" | null;
  submittedAt: Date | null;
}) {
  if (params.matchStatus === "PENDING_APPROVAL") return "pending";
  if (params.matchStatus !== "ACCEPTED") return "pending";

  if (params.deliverableStatus === "VERIFIED") return "complete";
  if (params.deliverableStatus === "DUE") return "post_required";

  const shippedStatuses = new Set(["DRAFT_CREATED", "COMPLETED", "FULFILLED"]);
  if (params.orderStatus && shippedStatuses.has(params.orderStatus)) return "shipped";

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
      deliverableStatus: deliverables.status,
      deliverableDueAt: deliverables.dueAt,
      deliverableSubmittedAt: deliverables.submittedAt,
    })
    .from(matches)
    .innerJoin(offers, eq(offers.id, matches.offerId))
    .innerJoin(brands, eq(brands.id, offers.brandId))
    .leftJoin(shopifyOrders, eq(shopifyOrders.matchId, matches.id))
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
        deliverableStatus: row.deliverableStatus ?? null,
        submittedAt: row.deliverableSubmittedAt ?? null,
      }),
      matchDate: row.matchCreatedAt.toISOString(),
      deadline: row.deliverableDueAt ? row.deliverableDueAt.toISOString() : null,
      trackingNumber: row.trackingNumber ?? null,
    })),
  });
}
