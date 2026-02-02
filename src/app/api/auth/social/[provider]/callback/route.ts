import { cookies } from "next/headers";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { brands, creators, pendingSocialAccounts, sessions, userSocialAccounts, users } from "@/db/schema";
import { getSessionUser, SESSION_COOKIE_NAME } from "@/lib/auth";
import { sanitizeNextPath } from "@/lib/redirects";
import { discoverInstagramAccount, exchangeMetaCode, fetchInstagramProfile } from "@/lib/meta";
import { exchangeTikTokCode, fetchTikTokProfile } from "@/lib/tiktok";
import { exchangeYouTubeCode, fetchYouTubeChannel } from "@/lib/youtube";
import { getCreatorProfileMissingFields } from "@/lib/creator-profile";

export const runtime = "nodejs";

const providerSchema = z.enum(["instagram", "tiktok", "youtube"]);
const callbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

const creatorDashboardPath = "/influencer/discover";
const creatorProfilePath = "/influencer/profile";

async function createSession(userId: string) {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
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
    maxAge: 60 * 60 * 24 * 7, // 7 days
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

async function resolveCreatorNextPath(userId: string, fallback: string) {
  const rows = await db
    .select({
      fullName: creators.fullName,
      email: creators.email,
      phone: creators.phone,
      address1: creators.address1,
      city: creators.city,
      province: creators.province,
      zip: creators.zip,
      lat: creators.lat,
      lng: creators.lng,
    })
    .from(creators)
    .where(eq(creators.id, userId))
    .limit(1);
  const creator = rows[0];
  if (!creator) return fallback;
  const missing = getCreatorProfileMissingFields(creator);
  return missing.length ? `${creatorProfilePath}?onboarding=1` : fallback;
}

function redirectWithError(origin: string, message: string) {
  const target = new URL("/auth/callback", origin);
  target.searchParams.set("error", message);
  return Response.redirect(target, 302);
}

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const params = await context.params;
  const providerParsed = providerSchema.safeParse(params.provider);
  if (!providerParsed.success) {
    return redirectWithError(url.origin, "Unsupported provider");
  }

  const provider = providerParsed.data;
  const providerId = provider === "instagram" ? "INSTAGRAM" : provider === "tiktok" ? "TIKTOK" : "YOUTUBE";
  const parsed = callbackSchema.safeParse({
    code: url.searchParams.get("code"),
    state: url.searchParams.get("state"),
  });
  if (!parsed.success) {
    return redirectWithError(url.origin, "Invalid callback");
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  const defaultRedirectUri = `${origin}/api/auth/social/${provider}/callback`;
  const redirectUri =
    provider === "tiktok" && process.env.TIKTOK_REDIRECT_URL
      ? process.env.TIKTOK_REDIRECT_URL
      : provider === "youtube" && process.env.YOUTUBE_REDIRECT_URL
        ? process.env.YOUTUBE_REDIRECT_URL
        : defaultRedirectUri;
  const redirectOrigin = new URL(redirectUri).origin;
  if (redirectOrigin !== url.origin) {
    const canonicalUrl = new URL(url.pathname + url.search, redirectOrigin);
    return Response.redirect(canonicalUrl.toString(), 302);
  }

  const jar = await cookies();
  const stateCookie = jar.get("social_oauth_state")?.value;
  const providerCookie = jar.get("social_oauth_provider")?.value;
  const nextCookie = jar.get("social_oauth_next")?.value;
  const roleCookie = jar.get("social_oauth_role")?.value ?? null;
  let nextPath = sanitizeNextPath(nextCookie, "/");

  if (nextPath === "/" && roleCookie === "brand") {
    nextPath = "/brand/dashboard";
  } else if (nextPath === "/" && roleCookie === "creator") {
    nextPath = "/influencer/discover";
  }

  const isCreatorFlow = roleCookie === "creator" || nextPath.startsWith("/influencer");

  if (!stateCookie || stateCookie !== parsed.data.state || providerCookie !== provider) {
    return redirectWithError(url.origin, "Invalid state");
  }


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
      return redirectWithError(url.origin, "Instagram account not found");
    }
    providerUserId = ig.igUserId;

    const profile = await fetchInstagramProfile({
      accessToken: exchanged.accessToken,
      igUserId: ig.igUserId,
    }).catch(() => null);
    username = profile?.username ?? ig.igUsername ?? null;
  } else if (provider === "tiktok") {
    const exchanged = await exchangeTikTokCode({ code: parsed.data.code, redirectUri });
    accessTokenEncrypted = exchanged.accessTokenEncrypted;
    refreshTokenEncrypted = exchanged.refreshTokenEncrypted;
    expiresAt = exchanged.expiresAt;
    scopes = exchanged.scopes;
    providerUserId = exchanged.openId;

    const profile = await fetchTikTokProfile({ accessToken: exchanged.accessToken }).catch(() => null);
    username = profile?.displayName ?? null;
  } else {
    const exchanged = await exchangeYouTubeCode({ code: parsed.data.code, redirectUri });
    accessTokenEncrypted = exchanged.accessTokenEncrypted;
    refreshTokenEncrypted = exchanged.refreshTokenEncrypted;
    expiresAt = exchanged.expiresAt;
    scopes = exchanged.scopes;

    const channel = await fetchYouTubeChannel({ accessToken: exchanged.accessToken });
    providerUserId = channel.channelId;
    username = channel.username;
  }

  if (!providerUserId) {
    return redirectWithError(url.origin, "Unable to identify account");
  }

  const session = await getSessionUser(request);
  if (!session && provider === "youtube") {
    jar.delete("social_oauth_state");
    jar.delete("social_oauth_provider");
    jar.delete("social_oauth_next");
    jar.delete("social_oauth_role");
    return redirectWithError(
      url.origin,
      "YouTube connect requires an existing account (settings-only)",
    );
  }
  const existingSocial = await db
    .select()
    .from(userSocialAccounts)
    .where(
      and(eq(userSocialAccounts.provider, providerId), eq(userSocialAccounts.providerUserId, providerUserId)),
    )
    .limit(1);
  const existing = existingSocial[0] ?? null;

  if (session && existing && existing.userId !== session.user.id) {
    await createSession(existing.userId);
    jar.set("frilpp_lane", "creator", {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    jar.delete("social_oauth_state");
    jar.delete("social_oauth_provider");
    jar.delete("social_oauth_next");
    jar.delete("social_oauth_role");
    jar.delete("pending_social_id");

    const target = isCreatorFlow
      ? await resolveCreatorNextPath(existing.userId, nextPath || creatorDashboardPath)
      : nextPath || creatorDashboardPath;
    return Response.redirect(new URL(target, origin), 302);
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

    if (roleCookie === "brand" && providerId === "INSTAGRAM" && username) {
      const brandId = session.user.activeBrandId;
      if (brandId) {
        await db
          .update(brands)
          .set({ instagramHandle: username, updatedAt: new Date() })
          .where(eq(brands.id, brandId));
      }
    }

    jar.delete("social_oauth_state");
    jar.delete("social_oauth_provider");
    jar.delete("social_oauth_next");
    jar.delete("social_oauth_role");
    jar.delete("pending_social_id");

    return Response.redirect(new URL(nextPath, origin), 302);
  }

  if (existing) {
    await createSession(existing.userId);

    jar.set("frilpp_lane", "creator", {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    jar.delete("social_oauth_state");
    jar.delete("social_oauth_provider");
    jar.delete("social_oauth_next");
    jar.delete("social_oauth_role");

    const target = isCreatorFlow
      ? await resolveCreatorNextPath(existing.userId, nextPath || creatorDashboardPath)
      : nextPath || creatorDashboardPath;
    return Response.redirect(new URL(target, origin), 302);
  }

  if (roleCookie === "creator") {
    const now = new Date();
    const userId = crypto.randomUUID();

    await db.insert(users).values({
      id: userId,
      email: null,
      name: username,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(userSocialAccounts).values({
      id: crypto.randomUUID(),
      userId,
      provider: providerId,
      providerUserId,
      username,
      accessTokenEncrypted,
      refreshTokenEncrypted,
      expiresAt,
      scopes,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(creators).values({
      id: userId,
      username,
      createdAt: now,
      updatedAt: now,
    });

    await createSession(userId);

    jar.set("frilpp_lane", "creator", {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    jar.delete("social_oauth_state");
    jar.delete("social_oauth_provider");
    jar.delete("social_oauth_next");
    jar.delete("social_oauth_role");
    jar.delete("pending_social_id");

    const target = isCreatorFlow
      ? await resolveCreatorNextPath(userId, nextPath || creatorDashboardPath)
      : nextPath || creatorDashboardPath;
    return Response.redirect(new URL(target, origin), 302);
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
