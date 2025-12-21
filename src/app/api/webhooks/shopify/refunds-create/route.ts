import crypto from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { attributedOrders } from "@/db/schema";
import { log } from "@/lib/logger";
import { sendAlert } from "@/lib/alerts";
import { captureException } from "@/lib/telemetry";

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

type ShopifyRefundWebhook = {
  id: number;
  order_id: number;
  currency?: string;
  transactions?: Array<{ amount?: string; kind?: string }>;
};

function parseCents(amount: string) {
  const normalized = Number(amount);
  if (!Number.isFinite(normalized)) return 0;
  return Math.round(normalized * 100);
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
  const payload = JSON.parse(raw.toString("utf8")) as ShopifyRefundWebhook;

  const orderId = String(payload.order_id ?? "");
  if (!orderId) return Response.json({ ok: true, attributed: false });

  const refundTotal = (payload.transactions ?? [])
    .filter((t) => !t.kind || t.kind === "refund")
    .reduce((sum, t) => sum + parseCents(t.amount ?? "0"), 0);

  if (!refundTotal) {
    return Response.json({ ok: true, attributed: false });
  }

  const orderRows = await db
    .select({ matchId: attributedOrders.matchId })
    .from(attributedOrders)
    .where(
      sql`${attributedOrders.shopDomain} = ${shopDomain} AND ${attributedOrders.shopifyOrderId} = ${orderId}`,
    )
    .limit(1);
  const match = orderRows[0];
  if (!match) return Response.json({ ok: true, attributed: false });

  const refundId = String(payload.id ?? "");
  if (!refundId) return Response.json({ ok: true, attributed: false });

  const inserted = await db
    .execute(sql`
      INSERT INTO attributed_refunds (id, match_id, shop_domain, shopify_order_id, shopify_refund_id, currency, total_refund_cents)
      VALUES (
        ${crypto.randomUUID()},
        ${match.matchId},
        ${shopDomain},
        ${orderId},
        ${refundId},
        ${payload.currency ?? "USD"},
        ${refundTotal}
      )
      ON CONFLICT (shop_domain, shopify_refund_id) DO NOTHING
    `)
    .catch((err) => {
      log("error", "shopify refunds/create insert failed", {
        error: err instanceof Error ? err.message : "unknown",
      });
      captureException(err, { webhook: "shopify/refunds-create", shopDomain });
      void sendAlert({
        subject: "Shopify refunds/create webhook error",
        text: err instanceof Error ? err.stack ?? err.message : "Unknown error",
        data: { shopDomain },
      });
      throw err;
    });

  const deduped = Number(inserted.rowCount ?? 0) === 0;
  return Response.json({ ok: true, attributed: true, deduped });
}
