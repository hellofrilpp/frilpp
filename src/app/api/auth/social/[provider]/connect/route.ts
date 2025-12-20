import { cookies } from "next/headers";
import { z } from "zod";
import { sanitizeNextPath } from "@/lib/redirects";
import { buildInstagramOAuthUrl } from "@/lib/meta";
import { buildTikTokOAuthUrl } from "@/lib/tiktok";

export const runtime = "nodejs";

const providerSchema = z.enum(["instagram", "tiktok"]);

function isUsCountry(request: Request) {
  const country = request.headers.get("x-vercel-ip-country") ||
    request.headers.get("x-country-code") ||
    "";
  if (!country) return true;
  return country.toUpperCase() === "US";
}

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const params = await context.params;
  const providerParsed = providerSchema.safeParse(params.provider);
  if (!providerParsed.success) {
    return Response.json({ ok: false, error: "Unsupported provider" }, { status: 404 });
  }

  const provider = providerParsed.data;
  const url = new URL(request.url);
  const nextPath = sanitizeNextPath(url.searchParams.get("next"), "/onboarding");
  const role = url.searchParams.get("role");

  if (provider === "tiktok" && !isUsCountry(request)) {
    return Response.json(
      { ok: false, error: "TikTok login is only available in the US" },
      { status: 403 },
    );
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  const defaultRedirectUri = `${origin}/api/auth/social/${provider}/callback`;
  const redirectUri =
    provider === "tiktok" && process.env.TIKTOK_REDIRECT_URL
      ? process.env.TIKTOK_REDIRECT_URL
      : defaultRedirectUri;

  const state = crypto.randomUUID();
  const jar = await cookies();
  jar.set("social_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  jar.set("social_oauth_provider", provider, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  jar.set("social_oauth_next", nextPath, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  if (role) {
    jar.set("social_oauth_role", role, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    });
  }

  const authUrl = (() => {
    if (provider === "instagram") {
      return buildInstagramOAuthUrl({
        redirectUri,
        state,
        scopes: [
          "instagram_basic",
          "pages_show_list",
          "pages_read_engagement",
          "instagram_manage_insights",
        ],
      });
    }
    return buildTikTokOAuthUrl({
      redirectUri,
      state,
      scopes: ["user.info.basic"],
    });
  })();

  return Response.redirect(authUrl, 302);
}
