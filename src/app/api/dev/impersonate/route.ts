import { cookies } from "next/headers";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brandMemberships, brands, creators, sessions, users } from "@/db/schema";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { sanitizeNextPath } from "@/lib/redirects";

export const runtime = "nodejs";

const querySchema = z.object({
  secret: z.string().min(1),
  role: z.enum(["brand", "creator"]),
  email: z.string().email().optional(),
  next: z.string().optional(),
});

async function createSession(userId: string) {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const now = new Date();

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
  jar.set("frilpp_legal", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json({ ok: false, error: "DATABASE_URL is not configured" }, { status: 500 });
  }

  const secret = process.env.DEV_IMPERSONATE_SECRET;
  if (!secret) {
    return Response.json(
      { ok: false, error: "DEV_IMPERSONATE_SECRET is not configured" },
      { status: 404 },
    );
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    secret: url.searchParams.get("secret"),
    role: url.searchParams.get("role"),
    email: url.searchParams.get("email") ?? undefined,
    next: url.searchParams.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  if (parsed.data.secret !== secret) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const role = parsed.data.role;
  const defaultEmail = role === "brand" ? "dev-brand@frilpp.test" : "dev-creator@frilpp.test";
  const email = (parsed.data.email ?? defaultEmail).trim().toLowerCase();
  const nextPath = sanitizeNextPath(
    parsed.data.next,
    role === "brand" ? "/brand/offers" : "/influencer/feed",
  );

  const now = new Date();
  const secure = process.env.NODE_ENV === "production";

  const userRows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const existingUser = userRows[0] ?? null;
  const userId = existingUser?.id ?? crypto.randomUUID();

  await db.transaction(async (tx) => {
    if (!existingUser) {
      await tx.insert(users).values({
        id: userId,
        email,
        name: role === "brand" ? "Dev Brand Owner" : "Dev Creator",
        activeBrandId: null,
        tosAcceptedAt: now,
        privacyAcceptedAt: now,
        igDataAccessAcceptedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await tx
        .update(users)
        .set({
          tosAcceptedAt: existingUser.tosAcceptedAt ?? now,
          privacyAcceptedAt: existingUser.privacyAcceptedAt ?? now,
          igDataAccessAcceptedAt: existingUser.igDataAccessAcceptedAt ?? now,
          updatedAt: now,
        })
        .where(eq(users.id, userId));
    }

    if (role === "creator") {
      const creatorRows = await tx.select({ id: creators.id }).from(creators).where(eq(creators.id, userId)).limit(1);
      if (!creatorRows[0]) {
        await tx.insert(creators).values({
          id: userId,
          igUserId: null,
          username: "dev_creator",
          followersCount: 10_000,
          country: "US",
          categories: ["OTHER"],
          categoriesOther: "Lifestyle",
          fullName: "Dev Creator",
          email,
          phone: null,
          address1: "123 Main St",
          address2: null,
          city: "San Francisco",
          province: "CA",
          zip: "94105",
          lat: 37.789,
          lng: -122.394,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    if (role === "brand") {
      const membershipRows = await tx
        .select({ brandId: brandMemberships.brandId })
        .from(brandMemberships)
        .where(eq(brandMemberships.userId, userId))
        .limit(1);

      const existingBrandId = membershipRows[0]?.brandId ?? null;
      const brandId = existingBrandId ?? crypto.randomUUID();

      if (!existingBrandId) {
        await tx.insert(brands).values({
          id: brandId,
          name: "Dev Brand",
          website: "https://example.com",
          description: "Dev workspace for recordings",
          industry: "Food",
          location: "San Francisco, CA",
          address1: "123 Main St",
          address2: null,
          city: "San Francisco",
          province: "CA",
          zip: "94105",
          country: "US",
          lat: 37.789,
          lng: -122.394,
          logoUrl: null,
          countriesDefault: ["US"],
          instagramHandle: "devbrand",
          acceptanceFollowersThreshold: 5000,
          acceptanceAboveThresholdAutoAccept: true,
          notificationNewMatch: true,
          notificationContentReceived: true,
          notificationWeeklyDigest: false,
          notificationMarketing: false,
          createdAt: now,
          updatedAt: now,
        });

        await tx.insert(brandMemberships).values({
          id: crypto.randomUUID(),
          brandId,
          userId,
          role: "OWNER",
          createdAt: now,
        });
      }

      await tx.update(users).set({ activeBrandId: brandId, updatedAt: now }).where(eq(users.id, userId));
    }
  });

  // Create a fresh session (outside transaction to avoid cookie side effects inside tx).
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await createSession(userId);

  const jar = await cookies();
  jar.set("frilpp_lane", role, {
    httpOnly: false,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return Response.redirect(new URL(nextPath, url.origin), 302);
}
