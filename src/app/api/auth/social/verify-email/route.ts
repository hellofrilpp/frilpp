import crypto from "node:crypto";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pendingSocialAccounts, sessions, userSocialAccounts, users } from "@/db/schema";
import { getSessionUser, SESSION_COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    email: z.string().email(),
    acceptTerms: z.boolean(),
    acceptPrivacy: z.boolean(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.acceptTerms) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["acceptTerms"],
        message: "Terms acceptance required",
      });
    }
    if (!data.acceptPrivacy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["acceptPrivacy"],
        message: "Privacy acceptance required",
      });
    }
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

  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  jar.set("frilpp_legal", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json({ ok: false, error: "DATABASE_URL is not configured" }, { status: 500 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const jar = await cookies();
  const pendingId = jar.get("pending_social_id")?.value ?? null;
  if (!pendingId) {
    return Response.json({ ok: false, error: "No pending social login" }, { status: 400 });
  }

  const pendingRows = await db
    .select()
    .from(pendingSocialAccounts)
    .where(eq(pendingSocialAccounts.id, pendingId))
    .limit(1);
  const pending = pendingRows[0] ?? null;
  if (!pending) {
    return Response.json({ ok: false, error: "Pending login expired. Try again." }, { status: 404 });
  }

  const session = await getSessionUser(request);

  const existingSocial = await db
    .select()
    .from(userSocialAccounts)
    .where(
      and(
        eq(userSocialAccounts.provider, pending.provider),
        eq(userSocialAccounts.providerUserId, pending.providerUserId),
      ),
    )
    .limit(1);
  const social = existingSocial[0] ?? null;

  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const now = new Date();

  const userId = (() => {
    if (session) return session.user.id;
    if (social) return social.userId;
    return null;
  })();

  const finalUserId = userId ?? crypto.randomUUID();

  if (!session && !social) {
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);
    if (existingUser[0]) {
      // Link to existing email account.
      const existingId = existingUser[0].id;
      if (!social) {
        await db.insert(userSocialAccounts).values({
          id: crypto.randomUUID(),
          userId: existingId,
          provider: pending.provider,
          providerUserId: pending.providerUserId,
          username: pending.username ?? null,
          accessTokenEncrypted: pending.accessTokenEncrypted ?? null,
          refreshTokenEncrypted: pending.refreshTokenEncrypted ?? null,
          expiresAt: pending.expiresAt ?? null,
          scopes: pending.scopes ?? null,
          createdAt: now,
          updatedAt: now,
        });
      }

      await db.delete(pendingSocialAccounts).where(eq(pendingSocialAccounts.id, pendingId));
      jar.delete("pending_social_id");
      await createSession(existingId);
      await db
        .update(users)
        .set({ tosAcceptedAt: now, privacyAcceptedAt: now, updatedAt: now })
        .where(eq(users.id, existingId));
      return Response.json({ ok: true });
    }
  }

  await db.transaction(async (tx) => {
    const userRows = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, finalUserId))
      .limit(1);

    if (!userRows[0]) {
      await tx.insert(users).values({
        id: finalUserId,
        email: normalizedEmail,
        name: null,
        activeBrandId: null,
        tosAcceptedAt: now,
        privacyAcceptedAt: now,
        igDataAccessAcceptedAt: null,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await tx
        .update(users)
        .set({ email: normalizedEmail, tosAcceptedAt: now, privacyAcceptedAt: now, updatedAt: now })
        .where(eq(users.id, finalUserId));
    }

    const linked = await tx
      .select({ id: userSocialAccounts.id, userId: userSocialAccounts.userId })
      .from(userSocialAccounts)
      .where(
        and(
          eq(userSocialAccounts.provider, pending.provider),
          eq(userSocialAccounts.providerUserId, pending.providerUserId),
        ),
      )
      .limit(1);

    if (!linked[0]) {
      await tx.insert(userSocialAccounts).values({
        id: crypto.randomUUID(),
        userId: finalUserId,
        provider: pending.provider,
        providerUserId: pending.providerUserId,
        username: pending.username ?? null,
        accessTokenEncrypted: pending.accessTokenEncrypted ?? null,
        refreshTokenEncrypted: pending.refreshTokenEncrypted ?? null,
        expiresAt: pending.expiresAt ?? null,
        scopes: pending.scopes ?? null,
        createdAt: now,
        updatedAt: now,
      });
    }

    await tx.delete(pendingSocialAccounts).where(eq(pendingSocialAccounts.id, pendingId));
  });

  jar.delete("pending_social_id");
  await createSession(finalUserId);

  return Response.json({ ok: true });
}

