import crypto from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { loginTokens, pendingSocialAccounts, userSocialAccounts, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateLoginToken, hashLoginToken } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { log } from "@/lib/logger";
import { ipKey, rateLimit } from "@/lib/rate-limit";
import { sanitizeNextPath } from "@/lib/redirects";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
  next: z.string().optional(),
  acceptTerms: z.boolean(),
  acceptPrivacy: z.boolean(),
});

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  if (!parsed.data.acceptTerms || !parsed.data.acceptPrivacy) {
    return Response.json({ ok: false, error: "Terms and Privacy must be accepted" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const nextPath = sanitizeNextPath(parsed.data.next, "/onboarding");
  const jar = await cookies();

  const userRows = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  const user = userRows[0] ?? null;
  if (!user) {
    const pendingSocialId = jar.get("pending_social_id")?.value ?? null;
    if (!pendingSocialId) {
      return Response.json(
        { ok: false, error: "Connect a social account to sign up", code: "SOCIAL_REQUIRED" },
        { status: 400 },
      );
    }
    const pending = await db
      .select({ id: pendingSocialAccounts.id })
      .from(pendingSocialAccounts)
      .where(eq(pendingSocialAccounts.id, pendingSocialId))
      .limit(1);
    if (!pending[0]) {
      return Response.json(
        { ok: false, error: "Social connection expired. Try again.", code: "SOCIAL_EXPIRED" },
        { status: 400 },
      );
    }
  } else {
    const social = await db
      .select({ id: userSocialAccounts.id })
      .from(userSocialAccounts)
      .where(eq(userSocialAccounts.userId, user.id))
      .limit(1);
    if (!social[0]) {
      // Allow existing users to continue signing in, but they must link a social later.
    }
  }

  try {
    const ipBucket = ipKey(request);
    const emailBucket = `email:${crypto.createHash("sha256").update(email).digest("hex")}`;

    const ipLimit = Number(process.env.RATE_LIMIT_AUTH_PER_IP_PER_HOUR ?? "20");
    const emailLimit = Number(process.env.RATE_LIMIT_AUTH_PER_EMAIL_PER_HOUR ?? "8");

    const ipRes = await rateLimit({
      key: `auth:${ipBucket}`,
      limit: Number.isFinite(ipLimit) && ipLimit > 0 ? Math.floor(ipLimit) : 20,
      windowSeconds: 60 * 60,
    });
    if (!ipRes.allowed) {
      return Response.json(
        { ok: false, error: "Too many requests. Try again later.", code: "RATE_LIMITED" },
        { status: 429 },
      );
    }

    const emailRes = await rateLimit({
      key: `auth:${emailBucket}`,
      limit: Number.isFinite(emailLimit) && emailLimit > 0 ? Math.floor(emailLimit) : 8,
      windowSeconds: 60 * 60,
    });
    if (!emailRes.allowed) {
      return Response.json(
        { ok: false, error: "Too many requests. Try again later.", code: "RATE_LIMITED" },
        { status: 429 },
      );
    }
  } catch (err) {
    log("error", "auth rate limit failed", { error: err instanceof Error ? err.message : "unknown" });
  }

  const token = generateLoginToken();
  const tokenHash = hashLoginToken(token);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(loginTokens).values({
    id: crypto.randomUUID(),
    email,
    tokenHash,
    expiresAt,
    createdAt: new Date(),
  });

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const callbackUrl = `${origin}/api/auth/callback?token=${encodeURIComponent(token)}`;

  jar.set("auth_next", nextPath, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  jar.set("pending_tos", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  jar.set("pending_privacy", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  const html = [
    `<div style="font-family: ui-sans-serif, system-ui; line-height: 1.5;">`,
    `<h2>Sign in to Frilpp</h2>`,
    `<p>Click to sign in (valid for 10 minutes):</p>`,
    `<p><a href="${callbackUrl}">${callbackUrl}</a></p>`,
    `<p style="color:#666; font-size: 12px;">If you didn’t request this, you can ignore this email.</p>`,
    `</div>`,
  ].join("");

  const send = await sendEmail({
    to: email,
    subject: "Your Frilpp sign-in link",
    html,
    text: `Sign in to Frilpp: ${callbackUrl}`,
  });

  if (!send.ok) {
    return Response.json(
      { ok: false, error: send.error ?? "Email send failed" },
      { status: send.skipped ? 500 : 502 },
    );
  }

  return Response.json({ ok: true, sent: true });
}
