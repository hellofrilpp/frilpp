import crypto from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brandMemberships, sessions, users } from "@/db/schema";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { sanitizeNextPath } from "@/lib/redirects";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  next: z.string().optional(),
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
  const nextPath = sanitizeNextPath(parsed.data.next, "/brand/dashboard");

  const userRows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = userRows[0] ?? null;
  if (!user?.passwordHash) {
    return Response.json({ ok: false, error: "Invalid email or password" }, { status: 401 });
  }

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    return Response.json({ ok: false, error: "Invalid email or password" }, { status: 401 });
  }

  const membershipRows = await db
    .select({ id: brandMemberships.id })
    .from(brandMemberships)
    .where(eq(brandMemberships.userId, user.id))
    .limit(1);
  if (!membershipRows[0]) {
    return Response.json({ ok: false, error: "Brand access required" }, { status: 403 });
  }

  const now = new Date();
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
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

  if (user.tosAcceptedAt && user.privacyAcceptedAt) {
    jar.set("frilpp_legal", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  jar.set("frilpp_lane", "brand", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  const needsLegal = !(user.tosAcceptedAt && user.privacyAcceptedAt);
  const finalNext = needsLegal
    ? `/legal/accept?next=${encodeURIComponent(nextPath)}`
    : nextPath;

  return Response.json({ ok: true, nextPath: finalNext });
}
