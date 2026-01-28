import crypto from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { loginTokens } from "@/db/schema";
import { generateLoginToken, hashLoginToken } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { renderMagicLinkEmail } from "@/lib/email-templates/magic-link";
import { log } from "@/lib/logger";
import { ipKey, rateLimit } from "@/lib/rate-limit";
import { getAdminEmail } from "@/lib/admin";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
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

  const adminEmail = getAdminEmail();
  const email = parsed.data.email.trim().toLowerCase();
  if (email !== adminEmail) {
    return Response.json(
      { ok: false, error: "This login is restricted." },
      { status: 403 },
    );
  }

  try {
    const ipBucket = ipKey(request);
    const emailBucket = `admin:${crypto.createHash("sha256").update(email).digest("hex")}`;

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
    log("error", "admin auth rate limit failed", {
      error: err instanceof Error ? err.message : "unknown",
    });
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

  const jar = await cookies();
  jar.set("auth_next", "/idiot/setup", {
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

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const callbackUrl = `${origin}/auth/callback#token=${encodeURIComponent(token)}`;

  const html = renderMagicLinkEmail({
    callbackUrl,
    logoUrl: `${origin}/email/frilpp-logo.png`,
    copyIconUrl: `${origin}/email/icons/copy.svg`,
    expiresMinutes: 10,
  });

  const send = await sendEmail({
    to: email,
    subject: "Your Frilpp admin sign-in link",
    html,
    text: `Frilpp admin sign-in link (expires in 10 minutes): ${callbackUrl}`,
  });

  if (!send.ok) {
    return Response.json(
      { ok: false, error: send.error ?? "Email send failed" },
      { status: send.skipped ? 500 : 502 },
    );
  }

  return Response.json({ ok: true, sent: true });
}
