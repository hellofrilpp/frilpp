import crypto from "node:crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brandMemberships, users } from "@/db/schema";
import { ipKey, rateLimit } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
  lane: z.enum(["brand"]),
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

  const email = parsed.data.email.trim().toLowerCase();

  try {
    const ipBucket = ipKey(request);
    const emailBucket = `pwd:${crypto.createHash("sha256").update(email).digest("hex")}`;

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
    log("error", "password continue rate limit failed", { error: err instanceof Error ? err.message : "unknown" });
  }

  const userRows = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const user = userRows[0] ?? null;

  if (!user?.passwordHash) {
    return Response.json({ ok: true, allowPassword: false });
  }

  const membershipRows = await db
    .select({ id: brandMemberships.id })
    .from(brandMemberships)
    .where(eq(brandMemberships.userId, user.id))
    .limit(1);

  return Response.json({ ok: true, allowPassword: Boolean(membershipRows[0]) });
}
