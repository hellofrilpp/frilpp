import { cookies } from "next/headers";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pendingSocialAccounts, sessions, userSocialAccounts, users } from "@/db/schema";
import { getSessionUser, SESSION_COOKIE_NAME } from "@/lib/auth";
import { sanitizeNextPath } from "@/lib/redirects";
import { discoverInstagramAccount, exchangeMetaCode, fetchInstagramProfile } from "@/lib/meta";
import { exchangeTikTokCode, fetchTikTokProfile } from "@/lib/tiktok";

export const runtime = "nodejs";

const providerSchema = z.enum(["instagram", "tiktok"]);
const callbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

async function createSession(userId: string) {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
    createdAt: new Date(),
  });
  const userRows = await db
    .select({ tosAcceptedAt: users.tosAcceptedAt, privacyAcceptedAt: users.privacyAcceptedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const user = userRows[0] ?? null;
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  if (user?.tosAcceptedAt && user?.privacyAcceptedAt) {
    jar.set("frilpp_legal", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
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
  const providerId = provider === "instagram" ? "INSTAGRAM" : "TIKTOK";
  const url = new URL(request.url);
  const parsed = callbackSchema.safeParse({
    code: url.searchParams.get("code"),
    state: url.searchParams.get("state"),
  });
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid callback" }, { status: 400 });
  }

  const jar = await cookies();
  const stateCookie = jar.get("social_oauth_state")?.value;
  const providerCookie = jar.get("social_oauth_provider")?.value;
  const nextCookie = jar.get("social_oauth_next")?.value;
  const nextPath = sanitizeNextPath(nextCookie, "/onboarding");

  if (!stateCookie || stateCookie !== parsed.data.state || providerCookie !== provider) {
    return Response.json({ ok: false, error: "Invalid state" }, { status: 400 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  const defaultRedirectUri = `${origin}/api/auth/social/${provider}/callback`;
  const redirectUri =
    provider === "tiktok" && process.env.TIKTOK_REDIRECT_URL
      ? process.env.TIKTOK_REDIRECT_URL
      : defaultRedirectUri;

  let providerUserId: string | null = null;
  let username: string | null = null;
  let accessTokenEncrypted: string | null = null;
  let refreshTokenEncrypted: string | null = null;
  let expiresAt: Date | null = null;
  let scopes: string | null = null;

  if (provider === "instagram") {
    const exchanged = await exchangeMetaCode({ code: parsed.data.code, redirectUri });
    accessTokenEncrypted = exchanged.accessTokenEncrypted;
    expiresAt = exchanged.expiresAt;

    const ig = await discoverInstagramAccount({ accessToken: exchanged.accessToken });
    if (!ig?.igUserId) {
      return Response.json({ ok: false, error: "Instagram account not found" }, { status: 400 });
    }
    providerUserId = ig.igUserId;

    const profile = await fetchInstagramProfile({
      accessToken: exchanged.accessToken,
      igUserId: ig.igUserId,
    }).catch(() => null);
    username = profile?.username ?? ig.igUsername ?? null;
  } else {
    const exchanged = await exchangeTikTokCode({ code: parsed.data.code, redirectUri });
    accessTokenEncrypted = exchanged.accessTokenEncrypted;
    refreshTokenEncrypted = exchanged.refreshTokenEncrypted;
    expiresAt = exchanged.expiresAt;
    scopes = exchanged.scopes;
    providerUserId = exchanged.openId;

    const profile = await fetchTikTokProfile({ accessToken: exchanged.accessToken }).catch(() => null);
    username = profile?.displayName ?? null;
  }

  if (!providerUserId) {
    return Response.json({ ok: false, error: "Unable to identify account" }, { status: 400 });
  }

  const session = await getSessionUser(request);
  const existingSocial = await db
    .select()
    .from(userSocialAccounts)
    .where(
      and(eq(userSocialAccounts.provider, providerId), eq(userSocialAccounts.providerUserId, providerUserId)),
    )
    .limit(1);
  const existing = existingSocial[0] ?? null;

  if (session && existing && existing.userId !== session.user.id) {
    return Response.json({ ok: false, error: "Social account already linked" }, { status: 409 });
  }

  if (session) {
    if (existing) {
      await db
        .update(userSocialAccounts)
        .set({
          username: username ?? existing.username,
          accessTokenEncrypted: accessTokenEncrypted ?? existing.accessTokenEncrypted,
          refreshTokenEncrypted: refreshTokenEncrypted ?? existing.refreshTokenEncrypted,
          expiresAt,
          scopes: scopes ?? existing.scopes,
          updatedAt: new Date(),
        })
        .where(eq(userSocialAccounts.id, existing.id));
    } else {
      await db.insert(userSocialAccounts).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        provider: providerId,
        providerUserId,
        username,
        accessTokenEncrypted,
        refreshTokenEncrypted,
        expiresAt,
        scopes,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    jar.delete("social_oauth_state");
    jar.delete("social_oauth_provider");
    jar.delete("social_oauth_next");
    jar.delete("social_oauth_role");

    return Response.redirect(new URL(nextPath, origin), 302);
  }

  if (existing) {
    await createSession(existing.userId);

    jar.delete("social_oauth_state");
    jar.delete("social_oauth_provider");
    jar.delete("social_oauth_next");
    jar.delete("social_oauth_role");

    return Response.redirect(new URL(nextPath, origin), 302);
  }

  const pendingId = crypto.randomUUID();
  await db
    .delete(pendingSocialAccounts)
    .where(
      and(
        eq(pendingSocialAccounts.provider, providerId),
        eq(pendingSocialAccounts.providerUserId, providerUserId),
      ),
    );
  await db.insert(pendingSocialAccounts).values({
    id: pendingId,
    provider: providerId,
    providerUserId,
    username,
    accessTokenEncrypted,
    refreshTokenEncrypted,
    expiresAt,
    scopes,
    createdAt: new Date(),
  });

  jar.set("pending_social_id", pendingId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  jar.delete("social_oauth_state");
  jar.delete("social_oauth_provider");
  jar.delete("social_oauth_next");
  jar.delete("social_oauth_role");

  const verifyUrl = new URL("/verify-email", origin);
  verifyUrl.searchParams.set("next", nextPath);
  verifyUrl.searchParams.set("provider", provider);
  return Response.redirect(verifyUrl, 302);
}
