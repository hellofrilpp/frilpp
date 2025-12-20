import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shopifyStores } from "@/db/schema";
import { sendAlert } from "@/lib/alerts";
import { log } from "@/lib/logger";
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
  const now = new Date();

  try {
    await db.update(shopifyStores).set({ uninstalledAt: now }).where(eq(shopifyStores.shopDomain, shopDomain));
    log("info", "shopify app uninstalled", { shopDomain });
  } catch (err) {
    log("error", "shopify app-uninstalled update failed", { shopDomain, error: err instanceof Error ? err.message : "unknown" });
    captureException(err, { webhook: "shopify/app-uninstalled", shopDomain });
    void sendAlert({
      subject: "Shopify app/uninstalled webhook error",
      text: err instanceof Error ? err.stack ?? err.message : "Unknown error",
      data: { shopDomain },
    });
    return Response.json({ ok: false, error: "DB error" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
