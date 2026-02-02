import crypto from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { adminOtps } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { log } from "@/lib/logger";
import { ipKey, rateLimit } from "@/lib/rate-limit";
import { getAdminEmail } from "@/lib/admin";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
});

function generateOtp(): string {
  const digits = "0123456789";
  let otp = "";
  const randomBytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    otp += digits[randomBytes[i]! % 10];
  }
  return otp;
}

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

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

  const otp = generateOtp();
  const codeHash = hashOtp(otp);
  const otpId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await db.insert(adminOtps).values({
    id: otpId,
    email,
    codeHash,
    attempts: 0,
    expiresAt,
    createdAt: new Date(),
  });

  const jar = await cookies();
  jar.set("admin_otp_id", otpId, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 5, // 5 minutes
  });
  jar.set("auth_next", "/idiot/dashboard", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #000; color: #fff; padding: 40px; }
    .container { max-width: 400px; margin: 0 auto; text-align: center; }
    .otp { font-size: 32px; font-family: monospace; letter-spacing: 8px; background: #111; padding: 20px 30px; border-radius: 8px; border: 1px solid #333; margin: 30px 0; }
    .expires { color: #888; font-size: 14px; }
    h1 { color: #0f0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Frilpp Admin Login</h1>
    <p>Your one-time verification code is:</p>
    <div class="otp">${otp}</div>
    <p class="expires">This code expires in 5 minutes.</p>
    <p class="expires">Do not share this code with anyone.</p>
  </div>
</body>
</html>
  `.trim();

  const send = await sendEmail({
    to: email,
    subject: `${otp} is your Frilpp admin verification code`,
    html,
    text: `Your Frilpp admin verification code is: ${otp}\n\nThis code expires in 5 minutes. Do not share this code with anyone.`,
  });

  if (!send.ok) {
    return Response.json(
      { ok: false, error: send.error ?? "Email send failed" },
      { status: send.skipped ? 500 : 502 },
    );
  }

  return Response.json({ ok: true, sent: true, requiresOtp: true });
}
