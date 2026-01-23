import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { loginTokens, pendingSocialAccounts, sessions, userSocialAccounts, users } from "@/db/schema";
import { hashLoginToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { sanitizeNextPath } from "@/lib/redirects";

export const runtime = "nodejs";

const tokenSchema = z.object({
  token: z.string().min(1),
});

type RedeemResult =
  | { ok: true; nextPath: string }
  | { ok: false; error: string; status: number; code?: string };

async function redeemToken(token: string): Promise<RedeemResult> {
  const tokenHash = hashLoginToken(token);
  const now = new Date();

  const tokenRows = await db
    .select()
    .from(loginTokens)
    .where(eq(loginTokens.tokenHash, tokenHash))
    .limit(1);
  const tokenRow = tokenRows[0];
  if (!tokenRow) return { ok: false, error: "Invalid token", status: 400, code: "TOKEN_INVALID" };
  if (tokenRow.usedAt) {
    return {
      ok: false,
      error: "This link has already been used to sign in.",
      status: 409,
      code: "TOKEN_USED",
    };
  }
  if (tokenRow.expiresAt && tokenRow.expiresAt <= now) {
    return {
      ok: false,
      error: "This link has expired. Request a new sign-in link.",
      status: 410,
      code: "TOKEN_EXPIRED",
    };
  }

  await db.update(loginTokens).set({ usedAt: now }).where(eq(loginTokens.id, tokenRow.id));

  const email = tokenRow.email.trim().toLowerCase();
  let userId: string | null = null;
  let tosAcceptedAt: Date | null = null;
  let privacyAcceptedAt: Date | null = null;

  const userRows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (userRows[0]) {
    userId = userRows[0].id;
    tosAcceptedAt = userRows[0].tosAcceptedAt ?? null;
    privacyAcceptedAt = userRows[0].privacyAcceptedAt ?? null;

    const jar = await cookies();
    const pendingTos = jar.get("pending_tos")?.value === "1";
    const pendingPrivacy = jar.get("pending_privacy")?.value === "1";
    const set: Record<string, unknown> = { updatedAt: now };
    if (pendingTos && !tosAcceptedAt) {
      tosAcceptedAt = now;
      set.tosAcceptedAt = now;
    }
    if (pendingPrivacy && !privacyAcceptedAt) {
      privacyAcceptedAt = now;
      set.privacyAcceptedAt = now;
    }
    await db.update(users).set(set).where(eq(users.id, userId));
  } else {
    userId = crypto.randomUUID();
    await db.insert(users).values({
      id: userId,
      email,
      name: null,
      activeBrandId: null,
      tosAcceptedAt: now,
      privacyAcceptedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    tosAcceptedAt = now;
    privacyAcceptedAt = now;
  }

  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
    createdAt: now,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  if (tosAcceptedAt && privacyAcceptedAt) {
    jar.set("frilpp_legal", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  const pendingSocialId = jar.get("pending_social_id")?.value ?? null;
  if (pendingSocialId) {
    const pendingRows = await db
      .select()
      .from(pendingSocialAccounts)
      .where(eq(pendingSocialAccounts.id, pendingSocialId))
      .limit(1);
    const pending = pendingRows[0] ?? null;
    if (pending) {
      const conflictRows = await db
        .select()
        .from(userSocialAccounts)
        .where(
          and(
            eq(userSocialAccounts.provider, pending.provider),
            eq(userSocialAccounts.providerUserId, pending.providerUserId),
          ),
        )
        .limit(1);
      const conflict = conflictRows[0] ?? null;
      if (conflict && conflict.userId !== userId) {
        await db.delete(pendingSocialAccounts).where(eq(pendingSocialAccounts.id, pendingSocialId));
        jar.delete("pending_social_id");
      } else {
        const existingSocialRows = await db
          .select()
          .from(userSocialAccounts)
          .where(
            and(
              eq(userSocialAccounts.userId, userId),
              eq(userSocialAccounts.provider, pending.provider),
            ),
          )
          .limit(1);
        const existingSocial = existingSocialRows[0] ?? null;
        if (existingSocial) {
          await db
            .update(userSocialAccounts)
            .set({
              providerUserId: pending.providerUserId,
              username: pending.username,
              accessTokenEncrypted: pending.accessTokenEncrypted,
              refreshTokenEncrypted: pending.refreshTokenEncrypted,
              expiresAt: pending.expiresAt,
              scopes: pending.scopes,
              updatedAt: now,
            })
            .where(eq(userSocialAccounts.id, existingSocial.id));
        } else {
          await db.insert(userSocialAccounts).values({
            id: crypto.randomUUID(),
            userId,
            provider: pending.provider,
            providerUserId: pending.providerUserId,
            username: pending.username,
            accessTokenEncrypted: pending.accessTokenEncrypted,
            refreshTokenEncrypted: pending.refreshTokenEncrypted,
            expiresAt: pending.expiresAt,
            scopes: pending.scopes,
            createdAt: now,
            updatedAt: now,
          });
        }
        await db.delete(pendingSocialAccounts).where(eq(pendingSocialAccounts.id, pendingSocialId));
      }
    }
    jar.delete("pending_social_id");
  }

  let nextPath = sanitizeNextPath(jar.get("auth_next")?.value ?? null, "/onboarding");
  jar.delete("auth_next");
  jar.delete("pending_tos");
  jar.delete("pending_privacy");

  if (nextPath.startsWith("/brand/")) {
    jar.set("frilpp_lane", "brand", {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  } else if (nextPath.startsWith("/influencer/")) {
    jar.set("frilpp_lane", "creator", {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  if (!tosAcceptedAt || !privacyAcceptedAt) {
    nextPath = `/legal/accept?next=${encodeURIComponent(nextPath)}`;
  }

  return { ok: true, nextPath };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return Response.redirect(new URL("/auth/callback?error=missing", url.origin), 302);
  }
  return Response.redirect(new URL(`/auth/callback#token=${encodeURIComponent(token)}`, url.origin), 302);
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = tokenSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Missing token" }, { status: 400 });
  }

  const result = await redeemToken(parsed.data.token);
  if (!result.ok) {
    return Response.json(
      { ok: false, error: result.error, code: result.code },
      { status: result.status },
    );
  }

  return Response.json({ ok: true, nextPath: result.nextPath });
}
