import { cookies } from "next/headers";
import { z } from "zod";
import { upsertShopifyStore } from "@/db/shopify";
import { encryptSecret } from "@/lib/crypto";
import { exchangeAccessToken, normalizeShopDomain, verifyShopifyHmac } from "@/lib/shopify";

export const runtime = "nodejs";

const schema = z.object({
  shop: z.string().min(3),
  code: z.string().min(1),
  state: z.string().min(1),
});

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  try {
    const url = new URL(request.url);
    if (!verifyShopifyHmac(url.searchParams)) {
      return Response.json({ ok: false, error: "Invalid HMAC" }, { status: 400 });
    }

    const parsed = schema.safeParse({
      shop: url.searchParams.get("shop"),
      code: url.searchParams.get("code"),
      state: url.searchParams.get("state"),
    });
    if (!parsed.success) {
      return Response.json({ ok: false, error: "Invalid callback" }, { status: 400 });
    }

    const cookieJar = await cookies();
    const stateCookie = cookieJar.get("shopify_oauth_state")?.value;
    if (!stateCookie || stateCookie !== parsed.data.state) {
      return Response.json({ ok: false, error: "Invalid state" }, { status: 400 });
    }

    const brandId = cookieJar.get("shopify_brand_id")?.value;
    if (!brandId) {
      return Response.json({ ok: false, error: "Missing brand context" }, { status: 400 });
    }

    const shopDomain = normalizeShopDomain(parsed.data.shop);
    const { accessToken, scope } = await exchangeAccessToken(shopDomain, parsed.data.code);

    await upsertShopifyStore({
      brandId,
      shopDomain,
      accessTokenEncrypted: encryptSecret(accessToken),
      scopes: scope,
    });

    cookieJar.delete("shopify_oauth_state");
    cookieJar.delete("shopify_brand_id");

    return Response.redirect(new URL("/brand/offers/new?shopify=connected", url), 302);
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Shopify callback failed" },
      { status: 500 },
    );
  }
}
