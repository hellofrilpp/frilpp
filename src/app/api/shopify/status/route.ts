import { getShopifyStoreForBrand } from "@/db/shopify";
import { requireBrandContext } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctx = await requireBrandContext(request);
  if (ctx instanceof Response) return ctx;

  const store = await getShopifyStoreForBrand(ctx.brandId);
  return Response.json({
    ok: true,
    connected: Boolean(store),
    shopDomain: store?.shopDomain ?? null,
    scopes: store?.scopes ?? null,
  });
}
