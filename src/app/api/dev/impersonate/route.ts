import { cookies } from "next/headers";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { brandMemberships, creators, sessions, users } from "@/db/schema";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { planKeyFor, marketFromRequest } from "@/lib/billing";
import { upsertBillingSubscriptionBySubject } from "@/lib/billing-store";
import { sanitizeNextPath } from "@/lib/redirects";

export const runtime = "nodejs";

function normalizeNextPath(params: { role: "brand" | "creator"; next?: string }) {
  const raw = sanitizeNextPath(params.next, params.role === "brand" ? "/brand/dashboard" : "/influencer/discover");
  if (params.role === "brand" && (raw === "/brand/offers" || raw.startsWith("/brand/offers/"))) {
    return "/brand/dashboard";
  }
  if (params.role === "creator" && (raw === "/influencer/discover" || raw.startsWith("/influencer/discover/"))) {
    return "/influencer/discover";
  }
  return raw;
}

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
  try {
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
    const nextPath = normalizeNextPath({ role, next: parsed.data.next });

    const now = new Date();
    const secure = process.env.NODE_ENV === "production";
    const market = marketFromRequest(request);
    const lane = role === "brand" ? "brand" : "creator";

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
        const creatorRows = await tx
          .select({ id: creators.id })
          .from(creators)
          .where(eq(creators.id, userId))
          .limit(1);
        if (!creatorRows[0]) {
          await tx.execute(sql`
            insert into "creators"
              ("id", "ig_user_id", "username", "followers_count", "created_at", "updated_at")
            values
              (${userId}, ${null}, ${"dev_creator"}, ${2500}, ${now}, ${now})
            on conflict ("id") do nothing
          `);
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
          await tx.execute(sql`
            insert into "brands"
              ("id", "name", "countries_default", "instagram_handle",
               "acceptance_followers_threshold", "acceptance_above_threshold_auto_accept",
               "created_at", "updated_at")
            values
              (
                ${brandId},
                ${"Dev Brand"},
                ARRAY[]::text[],
                ${"devbrand"},
                ${5000},
                ${true},
                ${now},
                ${now}
              )
            on conflict ("id") do nothing
          `);

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

    let activeBrandId: string | null = null;
    if (role === "brand") {
      const row = (
        await db
          .select({ activeBrandId: users.activeBrandId })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1)
      )[0];
      activeBrandId = row?.activeBrandId ?? null;
    }

    const seededSubject =
      role === "creator"
        ? ({ subjectType: "CREATOR", subjectId: userId } as const)
        : activeBrandId
          ? ({ subjectType: "BRAND", subjectId: activeBrandId } as const)
          : null;

    if (seededSubject) {
      try {
        const provider = market === "IN" ? "RAZORPAY" : "STRIPE";
        await upsertBillingSubscriptionBySubject({
          subjectType: seededSubject.subjectType,
          subjectId: seededSubject.subjectId,
          provider,
          providerCustomerId: `dev_${seededSubject.subjectId}`,
          providerSubscriptionId: `dev_${provider}_${seededSubject.subjectType}_${seededSubject.subjectId}`,
          status: "ACTIVE",
          market,
          planKey: planKeyFor(lane, market),
          cancelAtPeriodEnd: false,
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        });
      } catch (err) {
        console.error("dev impersonate subscription seed failed", err);
      }
    }

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
  } catch (err) {
    console.error("dev impersonate failed", err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Dev impersonate failed" },
      { status: 500 },
    );
  }
}
