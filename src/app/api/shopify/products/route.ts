import { z } from "zod";
import { getShopifyStoreForBrand } from "@/db/shopify";
import { requireBrandContext } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { shopifyRest } from "@/lib/shopify";

export const runtime = "nodejs";

const querySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 10))
    .pipe(z.number().int().min(1).max(50)),
  query: z.string().optional(),
});

type ShopifyProductsResponse = {
  products: Array<{
    id: number;
    title: string;
    image: null | { src: string };
    variants: Array<{ id: number; title: string }>;
  }>;
};

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  try {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      limit: url.searchParams.get("limit") ?? undefined,
      query: url.searchParams.get("query") ?? undefined,
    });
    if (!parsed.success) {
      return Response.json({ ok: false, error: "Invalid query" }, { status: 400 });
    }

    const ctx = await requireBrandContext(request);
    if (ctx instanceof Response) return ctx;

    const store = await getShopifyStoreForBrand(ctx.brandId);
    if (!store) {
      return Response.json({ ok: false, error: "Shopify not connected" }, { status: 400 });
    }
    const token = decryptSecret(store.accessTokenEncrypted);

    const params = new URLSearchParams();
    params.set("limit", String(parsed.data.limit));
    params.set("fields", "id,title,image,variants");
    if (parsed.data.query) params.set("title", parsed.data.query);

    const json = await shopifyRest<ShopifyProductsResponse>(
      store.shopDomain,
      token,
      `/products.json?${params.toString()}`,
    );

    return Response.json({
      ok: true,
      products: json.products.map((p) => ({
        id: String(p.id),
        title: p.title,
        imageUrl: p.image?.src ?? null,
        variants: p.variants.map((v) => ({ id: String(v.id), title: v.title })),
      })),
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to fetch products" },
      { status: 500 },
    );
  }
}
