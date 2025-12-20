import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { creators, matches, offers, shopifyOrders } from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";

export const runtime = "nodejs";

const querySchema = z.object({
  status: z
    .enum(["PENDING", "DRAFT_CREATED", "COMPLETED", "FULFILLED", "CANCELED", "ERROR"])
    .optional(),
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

  const where = parsed.data.status
    ? and(eq(offers.brandId, ctx.brandId), eq(shopifyOrders.status, parsed.data.status))
    : eq(offers.brandId, ctx.brandId);

  const rows = await db
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
      creatorId: creators.id,
      creatorUsername: creators.username,
      creatorEmail: creators.email,
      creatorCountry: creators.country,
    })
    .from(shopifyOrders)
    .innerJoin(matches, eq(matches.id, shopifyOrders.matchId))
    .innerJoin(offers, eq(offers.id, matches.offerId))
    .innerJoin(creators, eq(creators.id, matches.creatorId))
    .where(where)
    .orderBy(desc(shopifyOrders.updatedAt))
    .limit(200);

  return Response.json({
    ok: true,
    shipments: rows.map((r) => ({
      id: r.shopifyOrderRowId,
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
  });
}

