import crypto from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { adminOtps, sessions, users } from "@/db/schema";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { log } from "@/lib/logger";
import { ipKey, rateLimit } from "@/lib/rate-limit";
import { getAdminEmail } from "@/lib/admin";

export const runtime = "nodejs";

const MAX_OTP_ATTEMPTS = 3;
const ADMIN_SESSION_DURATION_HOURS = 4;

const bodySchema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/),
});

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

  const jar = await cookies();
  const otpId = jar.get("admin_otp_id")?.value;
  if (!otpId) {
    return Response.json(
      { ok: false, error: "No pending OTP verification. Please request a new code." },
      { status: 400 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid code format" }, { status: 400 });
  }

  try {
    const ipBucket = ipKey(request);
    const ipRes = await rateLimit({
      key: `admin-otp-verify:${ipBucket}`,
      limit: 10,
      windowSeconds: 60 * 5,
    });
    if (!ipRes.allowed) {
      return Response.json(
        { ok: false, error: "Too many attempts. Try again later.", code: "RATE_LIMITED" },
        { status: 429 },
      );
    }
  } catch (err) {
    log("error", "admin otp verify rate limit failed", {
      error: err instanceof Error ? err.message : "unknown",
    });
  }

  const now = new Date();
  const otpRows = await db
    .select()
    .from(adminOtps)
    .where(
      and(
        eq(adminOtps.id, otpId),
        gt(adminOtps.expiresAt, now),
        isNull(adminOtps.usedAt),
      ),
    )
    .limit(1);

  const otpRecord = otpRows[0];
  if (!otpRecord) {
    jar.delete("admin_otp_id");
    return Response.json(
      { ok: false, error: "OTP expired or invalid. Please request a new code." },
      { status: 400 },
    );
  }

  if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
    await db
      .update(adminOtps)
      .set({ usedAt: now })
      .where(eq(adminOtps.id, otpId));
    jar.delete("admin_otp_id");
    return Response.json(
      { ok: false, error: "Too many failed attempts. Please request a new code." },
      { status: 400 },
    );
  }

  const codeHash = hashOtp(parsed.data.code);
  const isValidCode = crypto.timingSafeEqual(
    Buffer.from(codeHash),
    Buffer.from(otpRecord.codeHash),
  );

  if (!isValidCode) {
    await db
      .update(adminOtps)
      .set({ attempts: otpRecord.attempts + 1 })
      .where(eq(adminOtps.id, otpId));

    const remainingAttempts = MAX_OTP_ATTEMPTS - otpRecord.attempts - 1;
    return Response.json(
      {
        ok: false,
        error: remainingAttempts > 0
          ? `Invalid code. ${remainingAttempts} attempt(s) remaining.`
          : "Invalid code. Please request a new code.",
      },
      { status: 400 },
    );
  }

  await db
    .update(adminOtps)
    .set({ usedAt: now })
    .where(eq(adminOtps.id, otpId));

  jar.delete("admin_otp_id");

  const adminEmail = getAdminEmail();
  if (otpRecord.email !== adminEmail) {
    return Response.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  let userRows = await db
    .select()
    .from(users)
    .where(eq(users.email, otpRecord.email))
    .limit(1);

  let user = userRows[0];
  if (!user) {
    const userId = crypto.randomUUID();
    await db.insert(users).values({
      id: userId,
      email: otpRecord.email,
      name: "Admin",
      tosAcceptedAt: now,
      privacyAcceptedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    userRows = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    user = userRows[0]!;
  }

  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_DURATION_HOURS * 60 * 60 * 1000);

  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    expiresAt,
    createdAt: now,
  });

  const secure = process.env.NODE_ENV === "production";
  jar.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: ADMIN_SESSION_DURATION_HOURS * 60 * 60,
  });
  jar.set("frilpp_legal", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  jar.set("frilpp_lane", "admin", {
    httpOnly: false,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: ADMIN_SESSION_DURATION_HOURS * 60 * 60,
  });

  const nextPath = jar.get("auth_next")?.value ?? "/idiot/dashboard";
  jar.delete("auth_next");

  log("info", "admin login success", { email: otpRecord.email });

  return Response.json({
    ok: true,
    redirectTo: nextPath,
  });
}
