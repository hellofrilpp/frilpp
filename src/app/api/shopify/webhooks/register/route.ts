import { getShopifyStoreForBrand } from "@/db/shopify";
import { requireBrandContext } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { shopifyRest } from "@/lib/shopify";

export const runtime = "nodejs";

type ShopifyWebhookListResponse = {
  webhooks: Array<{ id: number; address: string; topic: string }>;
};

type ShopifyWebhookCreateResponse = {
  webhook: { id: number; topic: string; address: string };
};

async function ensureWebhook(params: {
  shopDomain: string;
  accessToken: string;
  topic: string;
  address: string;
}) {
  const existing = await shopifyRest<ShopifyWebhookListResponse>(
    params.shopDomain,
    params.accessToken,
    `/webhooks.json?topic=${encodeURIComponent(params.topic)}&address=${encodeURIComponent(params.address)}`,
  );

  const already = existing.webhooks.find(
    (w) => w.topic === params.topic && w.address === params.address,
  );
  if (already) {
    return { ok: true as const, already: true as const, webhookId: String(already.id) };
  }

  const created = await shopifyRest<ShopifyWebhookCreateResponse>(
    params.shopDomain,
    params.accessToken,
    "/webhooks.json",
    {
      method: "POST",
      body: JSON.stringify({
        webhook: {
          topic: params.topic,
          address: params.address,
          format: "json",
        },
      }),
    },
  );

  return {
    ok: true as const,
    already: false as const,
    webhookId: String(created.webhook.id),
    address: created.webhook.address,
  };
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  try {
    const appUrl = process.env.SHOPIFY_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return Response.json(
        { ok: false, error: "SHOPIFY_APP_URL (or NEXT_PUBLIC_APP_URL) is not configured" },
        { status: 500 },
      );
    }

    const ctx = await requireBrandContext(request);
    if (ctx instanceof Response) return ctx;

    const store = await getShopifyStoreForBrand(ctx.brandId);
    if (!store) {
      return Response.json({ ok: false, error: "Shopify not connected" }, { status: 400 });
    }

    const token = decryptSecret(store.accessTokenEncrypted);
    const base = appUrl.replace(/\/$/, "");

    const orders = await ensureWebhook({
      shopDomain: store.shopDomain,
      accessToken: token,
      topic: "orders/create",
      address: `${base}/api/webhooks/shopify/orders-create`,
    });

    const fulfillments = await ensureWebhook({
      shopDomain: store.shopDomain,
      accessToken: token,
      topic: "fulfillments/create",
      address: `${base}/api/webhooks/shopify/fulfillments-create`,
    });

    const uninstalled = await ensureWebhook({
      shopDomain: store.shopDomain,
      accessToken: token,
      topic: "app/uninstalled",
      address: `${base}/api/webhooks/shopify/app-uninstalled`,
    });

    return Response.json({ ok: true, webhooks: { orders, fulfillments, uninstalled } });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Webhook registration failed" },
      { status: 500 },
    );
  }
}
