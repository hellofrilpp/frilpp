import { z } from "zod";
import { db } from "@/db";
import { brandMemberships, brands, creators, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

const querySchema = z.object({
  secret: z.string().min(1),
});

async function ensureUser(params: { email: string; name: string }) {
  const email = params.email.trim().toLowerCase();
  const now = new Date();
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) return existing[0].id;

  const id = crypto.randomUUID();
  await db.insert(users).values({
    id,
    email,
    name: params.name,
    activeBrandId: null,
    tosAcceptedAt: now,
    privacyAcceptedAt: now,
    igDataAccessAcceptedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  return id;
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
  const parsed = querySchema.safeParse({ secret: url.searchParams.get("secret") });
  if (!parsed.success || parsed.data.secret !== secret) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const origin = url.origin;
  const now = new Date();

  const brandUserId = await ensureUser({ email: "dev-brand@frilpp.test", name: "Dev Brand Owner" });
  const creatorUserId = await ensureUser({ email: "dev-creator@frilpp.test", name: "Dev Creator" });

  const creatorRows = await db.select({ id: creators.id }).from(creators).where(eq(creators.id, creatorUserId)).limit(1);
  if (!creatorRows[0]) {
    await db.insert(creators).values({
      id: creatorUserId,
      igUserId: null,
      username: "dev_creator",
      followersCount: 10_000,
      country: "US",
      categories: ["OTHER"],
      categoriesOther: "Lifestyle",
      fullName: "Dev Creator",
      email: "dev-creator@frilpp.test",
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

  const membershipRows = await db
    .select({ brandId: brandMemberships.brandId })
    .from(brandMemberships)
    .where(eq(brandMemberships.userId, brandUserId))
    .limit(1);
  if (!membershipRows[0]) {
    const brandId = crypto.randomUUID();
    await db.insert(brands).values({
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
    await db.insert(brandMemberships).values({
      id: crypto.randomUUID(),
      brandId,
      userId: brandUserId,
      role: "OWNER",
      createdAt: now,
    });
    await db.update(users).set({ activeBrandId: brandId, updatedAt: now }).where(eq(users.id, brandUserId));
  }

  const brandLogin = new URL("/api/dev/impersonate", origin);
  brandLogin.searchParams.set("role", "brand");
  brandLogin.searchParams.set("secret", secret);
  brandLogin.searchParams.set("next", "/brand/offers");

  const creatorLogin = new URL("/api/dev/impersonate", origin);
  creatorLogin.searchParams.set("role", "creator");
  creatorLogin.searchParams.set("secret", secret);
  creatorLogin.searchParams.set("next", "/influencer/feed");

  return Response.json({
    ok: true,
    brand: { email: "dev-brand@frilpp.test", loginUrl: brandLogin.toString() },
    creator: { email: "dev-creator@frilpp.test", loginUrl: creatorLogin.toString() },
  });
}

