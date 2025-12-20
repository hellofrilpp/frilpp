import crypto from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
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

type ShopifyOrderWebhook = {
  id: number;
  currency: string;
  total_price: string;
  discount_codes?: Array<{ code: string }>;
};

function parseCents(totalPrice: string) {
  const normalized = Number(totalPrice);
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
  const payload = JSON.parse(raw.toString("utf8")) as ShopifyOrderWebhook;

  const codes = (payload.discount_codes ?? [])
    .map((d) => d.code)
    .filter((c): c is string => Boolean(c && typeof c === "string"));

  if (!codes.length) return Response.json({ ok: true, attributed: false });

  const matchedCode = codes.find((c) => c.startsWith("FRILP-")) ?? codes[0]!;
  const matchRows = await db
    .select({ id: matches.id })
    .from(matches)
    .where(eq(matches.campaignCode, matchedCode))
    .limit(1);
  const match = matchRows[0];
  if (!match) return Response.json({ ok: true, attributed: false });

  const orderId = String(payload.id);
  const inserted = await db
    .execute(sql`
      INSERT INTO attributed_orders (id, match_id, shop_domain, shopify_order_id, currency, total_price_cents)
      VALUES (
        ${crypto.randomUUID()},
        ${match.id},
        ${shopDomain},
        ${orderId},
        ${payload.currency ?? "USD"},
        ${parseCents(payload.total_price ?? "0")}
      )
      ON CONFLICT (shop_domain, shopify_order_id) DO NOTHING
    `)
    .catch((err) => {
      log("error", "shopify orders/create insert failed", { error: err instanceof Error ? err.message : "unknown" });
      captureException(err, { webhook: "shopify/orders-create", shopDomain });
      void sendAlert({
        subject: "Shopify orders/create webhook error",
        text: err instanceof Error ? err.stack ?? err.message : "Unknown error",
        data: { shopDomain },
      });
      throw err;
    });

  const deduped = Number(inserted.rowCount ?? 0) === 0;
  return Response.json({ ok: true, attributed: true, deduped });
}
