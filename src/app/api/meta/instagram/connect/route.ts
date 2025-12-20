import { cookies } from "next/headers";
import { requireCreatorContext } from "@/lib/auth";
import { buildInstagramOAuthUrl } from "@/lib/meta";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctx = await requireCreatorContext(request);
  if (ctx instanceof Response) return ctx;

  if (!ctx.user.tosAcceptedAt || !ctx.user.privacyAcceptedAt || !ctx.user.igDataAccessAcceptedAt) {
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    const next = "/api/meta/instagram/connect";
    return Response.redirect(new URL(`/legal/accept?next=${encodeURIComponent(next)}`, origin), 302);
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const redirectUri = `${origin}/api/meta/instagram/callback`;

  const state = crypto.randomUUID();
  const jar = await cookies();
  jar.set("meta_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  const scopes = [
    "instagram_basic",
    "pages_show_list",
    "pages_read_engagement",
    "instagram_manage_insights",
  ];

  const url = buildInstagramOAuthUrl({ redirectUri, state, scopes });
  return Response.redirect(url, 302);
}
