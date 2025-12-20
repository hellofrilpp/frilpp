import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { brands, creators, deliverables, matches, offers, shopifyOrders } from "@/db/schema";
import { sendAlert } from "@/lib/alerts";
import { log } from "@/lib/logger";
import { captureException } from "@/lib/telemetry";
import { enqueueNotification } from "@/lib/notifications";

export const runtime = "nodejs";

async function readRawBody(request: Request) {
  const arrayBuffer = await request.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function verifyWebhookHmac(rawBody: Buffer, hmacHeader: string | null) {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret || !hmacHeader) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}

type ShopifyFulfillmentWebhook = {
  id: number;
  order_id: number;
  tracking_number?: string | null;
  tracking_numbers?: string[] | null;
  tracking_url?: string | null;
  tracking_urls?: string[] | null;
};

function pickFirst(value?: string | null, list?: string[] | null) {
  if (value && typeof value === "string") return value;
  const fromList = (list ?? []).find((x) => x && typeof x === "string");
  return fromList ?? null;
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const raw = await readRawBody(request);
  const hmac = request.headers.get("x-shopify-hmac-sha256");
  if (!verifyWebhookHmac(raw, hmac)) {
    return Response.json({ ok: false, error: "Invalid webhook HMAC" }, { status: 401 });
  }

  const shopDomain = request.headers.get("x-shopify-shop-domain") ?? "unknown";
  const payload = JSON.parse(raw.toString("utf8")) as ShopifyFulfillmentWebhook;

  const orderId = payload.order_id ? String(payload.order_id) : null;
  if (!orderId) return Response.json({ ok: true, updated: false });

  const trackingNumber = pickFirst(payload.tracking_number, payload.tracking_numbers);
  const trackingUrl = pickFirst(payload.tracking_url, payload.tracking_urls);
  const now = new Date();

  const orderRows = await db
    .select({ id: shopifyOrders.id, matchId: shopifyOrders.matchId })
    .from(shopifyOrders)
    .where(and(eq(shopifyOrders.shopDomain, shopDomain), eq(shopifyOrders.shopifyOrderId, orderId)))
    .limit(1);

  const order = orderRows[0];
  if (!order) return Response.json({ ok: true, updated: false });

  try {
    await db
      .update(shopifyOrders)
      .set({
        status: "FULFILLED",
        trackingNumber,
        trackingUrl,
        error: null,
        updatedAt: now,
      })
      .where(eq(shopifyOrders.id, order.id));
  } catch (err) {
    log("error", "shopify fulfillments/create update failed", {
      shopDomain,
      orderId,
      error: err instanceof Error ? err.message : "unknown",
    });
    captureException(err, { webhook: "shopify/fulfillments-create", shopDomain, orderId });
    void sendAlert({
      subject: "Shopify fulfillments/create webhook error",
      text: err instanceof Error ? err.stack ?? err.message : "Unknown error",
      data: { shopDomain, orderId },
    });
    return Response.json({ ok: false, error: "DB error" }, { status: 500 });
  }

  const matchRows = await db
    .select({ offerId: matches.offerId })
    .from(matches)
    .where(eq(matches.id, order.matchId))
    .limit(1);
  const match = matchRows[0];
  if (match) {
    const offerRows = await db
      .select({ deadlineDaysAfterDelivery: offers.deadlineDaysAfterDelivery })
      .from(offers)
      .where(eq(offers.id, match.offerId))
      .limit(1);
    const offer = offerRows[0];
    if (offer) {
      const dueAt = new Date(now.getTime() + offer.deadlineDaysAfterDelivery * 24 * 60 * 60 * 1000);
      await db
        .update(deliverables)
        .set({ dueAt })
        .where(eq(deliverables.matchId, order.matchId));
    }
  }

  try {
    const creatorRows = await db
      .select({ email: creators.email, phone: creators.phone })
      .from(matches)
      .innerJoin(creators, eq(creators.id, matches.creatorId))
      .where(eq(matches.id, order.matchId))
      .limit(1);
    const creatorEmail = creatorRows[0]?.email ?? null;
    const creatorPhone = creatorRows[0]?.phone ?? null;

    const brandRows = await db
      .select({ name: brands.name })
      .from(offers)
      .innerJoin(brands, eq(brands.id, offers.brandId))
      .where(eq(offers.id, match?.offerId ?? ""))
      .limit(1);
    const brandName = brandRows[0]?.name ?? "Brand";

    const payload = { brandName, trackingNumber, trackingUrl };
    if (creatorEmail) await enqueueNotification({ channel: "EMAIL", to: creatorEmail, type: "shipment_fulfilled", payload });
    if (creatorPhone && process.env.TWILIO_FROM_NUMBER) {
      await enqueueNotification({ channel: "SMS", to: creatorPhone, type: "shipment_fulfilled", payload });
    }
    if (creatorPhone && process.env.TWILIO_WHATSAPP_FROM) {
      await enqueueNotification({ channel: "WHATSAPP", to: creatorPhone, type: "shipment_fulfilled", payload });
    }
  } catch {
    // ignore notification failures
  }

  return Response.json({ ok: true, updated: true });
}
