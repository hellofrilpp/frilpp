import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { getShopifyStoreForBrand } from "@/db/shopify";
import { brands, linkClicks, matches, offerProducts, offers } from "@/db/schema";
import { decryptSecret } from "@/lib/crypto";
import { log } from "@/lib/logger";
import { ipKey, rateLimit } from "@/lib/rate-limit";
import { shopifyRest } from "@/lib/shopify";

export const runtime = "nodejs";

function sha256Base64(input: string) {
  return crypto.createHash("sha256").update(input).digest("base64");
}

type ShopifySingleProductResponse = { product: { id: number; handle: string } };

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  try {
    const perMinute = Number(process.env.RATE_LIMIT_REDIRECTS_PER_MINUTE ?? "120");
    const rl = await rateLimit({
      key: `r:${ipKey(request)}`,
      limit: Number.isFinite(perMinute) && perMinute > 0 ? Math.floor(perMinute) : 120,
      windowSeconds: 60,
    });
    if (!rl.allowed) {
      return new Response("Too many requests", { status: 429 });
    }
  } catch (err) {
    log("error", "rate limit check failed (redirect)", {
      error: err instanceof Error ? err.message : "unknown",
    });
  }

  const { code } = await context.params;
  const campaignCode = decodeURIComponent(code);

  const matchRows = await db
    .select({
      id: matches.id,
      offerId: matches.offerId,
      brandId: offers.brandId,
      brandWebsite: brands.website,
      brandName: brands.name,
      brandAddress1: brands.address1,
      brandCity: brands.city,
      brandProvince: brands.province,
      brandZip: brands.zip,
      offerMetadata: offers.metadata,
    })
    .from(matches)
    .innerJoin(offers, eq(offers.id, matches.offerId))
    .innerJoin(brands, eq(brands.id, offers.brandId))
    .where(eq(matches.campaignCode, campaignCode))
    .limit(1);
  const match = matchRows[0];
  if (!match) return Response.redirect(new URL("/", request.url), 302);

  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwardedFor.split(",")[0]?.trim() ?? "";
  const ipHash = ip ? sha256Base64(ip) : null;
  const userAgent = request.headers.get("user-agent");
  const referer = request.headers.get("referer");
  await db.insert(linkClicks).values({
    id: crypto.randomUUID(),
    matchId: match.id,
    ipHash,
    userAgent,
    referer,
  });

  const store = await getShopifyStoreForBrand(match.brandId);

  const offerProductRows = await db
    .select({ shopifyProductId: offerProducts.shopifyProductId })
    .from(offerProducts)
    .where(eq(offerProducts.offerId, match.offerId))
    .limit(1);

  let targetUrl: string | null = null;

  if (store) {
    targetUrl = `https://${store.shopDomain}`;
    if (offerProductRows[0]) {
      try {
        const token = decryptSecret(store.accessTokenEncrypted);
        const productId = offerProductRows[0].shopifyProductId;
        const productJson = await shopifyRest<ShopifySingleProductResponse>(
          store.shopDomain,
          token,
          `/products/${productId}.json?fields=id,handle`,
        );
        targetUrl = `https://${store.shopDomain}/products/${productJson.product.handle}`;
      } catch {
        targetUrl = `https://${store.shopDomain}`;
      }
    }
  }

  if (!targetUrl) {
    const metadata =
      match.offerMetadata && typeof match.offerMetadata === "object"
        ? (match.offerMetadata as Record<string, unknown>)
        : null;
    const ctaUrl = metadata && typeof metadata.ctaUrl === "string" ? metadata.ctaUrl.trim() : "";
    if (ctaUrl) {
      try {
        targetUrl = new URL(ctaUrl).toString();
      } catch {
        targetUrl = null;
      }
    }
  }

  if (!targetUrl && match.brandWebsite) {
    try {
      targetUrl = new URL(match.brandWebsite).toString();
    } catch {
      targetUrl = null;
    }
  }

  if (!targetUrl) {
    const parts = [
      match.brandName,
      match.brandAddress1,
      match.brandCity,
      match.brandProvince,
      match.brandZip,
    ].filter(Boolean);
    if (parts.length) {
      const query = encodeURIComponent(parts.join(" "));
      targetUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    }
  }

  if (!targetUrl) return Response.redirect(new URL("/", request.url), 302);

  const target = new URL(targetUrl);
  target.searchParams.set("utm_source", "frilpp");
  target.searchParams.set("utm_medium", "creator");
  target.searchParams.set("utm_campaign", match.offerId);
  target.searchParams.set("utm_content", campaignCode);
  target.searchParams.set("code", campaignCode);
  if (store) {
    target.searchParams.set("discount", campaignCode);
  }

  return Response.redirect(target, 302);
}
