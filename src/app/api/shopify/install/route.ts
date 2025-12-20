import { cookies } from "next/headers";
import { z } from "zod";
import { buildInstallUrl, normalizeShopDomain } from "@/lib/shopify";
import { requireBrandContext } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  shop: z.string().min(3),
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
  const parsed = schema.safeParse({ shop: url.searchParams.get("shop") });
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Missing shop" }, { status: 400 });
  }

  const shopDomain = normalizeShopDomain(parsed.data.shop);
  const appUrl = process.env.SHOPIFY_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return Response.json(
      { ok: false, error: "SHOPIFY_APP_URL (or NEXT_PUBLIC_APP_URL) is not configured" },
      { status: 500 },
    );
  }

  const state = crypto.randomUUID();
  const redirectUri = `${appUrl.replace(/\/$/, "")}/api/shopify/callback`;

  const cookieJar = await cookies();
  cookieJar.set("shopify_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  cookieJar.set("shopify_brand_id", ctx.brandId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  const installUrl = buildInstallUrl(shopDomain, redirectUri, state);
  return Response.redirect(installUrl, 302);
}
