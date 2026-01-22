import { z } from "zod";
import { db } from "@/db";
import { creatorMeta, creators, userSocialAccounts, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { CREATOR_CATEGORIES } from "@/lib/picklists";
import { decryptSecret } from "@/lib/crypto";
import { fetchInstagramProfile } from "@/lib/meta";

export const runtime = "nodejs";

const bodySchema = z.object({
  username: z.string().min(1).max(64).optional(),
  followersCount: z.number().int().min(0).max(50_000_000).optional(),
  country: z.enum(["US", "IN"]),
  categories: z.array(z.enum(CREATOR_CATEGORIES)).max(20).optional(),
  categoriesOther: z.string().trim().min(2).max(64).optional(),
  fullName: z.string().min(1).max(128).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(3).max(32).optional(),
  address1: z.string().min(1).max(128).optional(),
  address2: z.string().max(128).optional(),
  city: z.string().min(1).max(64).optional(),
  province: z.string().max(64).optional(),
  zip: z.string().min(1).max(16).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
}).superRefine((data, ctx) => {
  const categories = data.categories ?? [];
  if (categories.includes("OTHER") && !data.categoriesOther) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["categoriesOther"],
      message: "categoriesOther is required when categories include OTHER",
    });
  }
  if (!categories.includes("OTHER") && data.categoriesOther) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["categoriesOther"],
      message: "categoriesOther is only allowed when categories include OTHER",
    });
  }
});

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const sessionOrResponse = await requireUser(request);
  if (sessionOrResponse instanceof Response) return sessionOrResponse;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const userId = sessionOrResponse.user.id;
  const userEmail = sessionOrResponse.user.email;
  const existing = await db.select({ id: creators.id }).from(creators).where(eq(creators.id, userId)).limit(1);
  const now = new Date();

  const resolvedEmail = parsed.data.email ?? userEmail ?? null;

  if (existing[0]) {
    await db
      .update(creators)
      .set({ ...parsed.data, email: resolvedEmail, updatedAt: now })
      .where(eq(creators.id, userId));
  } else {
    await db.insert(creators).values({
      id: userId,
      igUserId: null,
      username: parsed.data.username ?? null,
      followersCount: parsed.data.followersCount ?? null,
      country: parsed.data.country,
      categories: parsed.data.categories ?? null,
      categoriesOther: parsed.data.categoriesOther ?? null,
      fullName: parsed.data.fullName ?? null,
      email: resolvedEmail,
      phone: parsed.data.phone ?? null,
      address1: parsed.data.address1 ?? null,
      address2: parsed.data.address2 ?? null,
      city: parsed.data.city ?? null,
      province: parsed.data.province ?? null,
      zip: parsed.data.zip ?? null,
      lat: parsed.data.lat ?? null,
      lng: parsed.data.lng ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (parsed.data.email !== undefined) {
    await db.update(users).set({ email: parsed.data.email, updatedAt: now }).where(eq(users.id, userId));
  }

  const metaRows = await db
    .select()
    .from(creatorMeta)
    .where(eq(creatorMeta.creatorId, userId))
    .limit(1);
  if (!metaRows[0]) {
    const socialRows = await db
      .select()
      .from(userSocialAccounts)
      .where(
        and(eq(userSocialAccounts.userId, userId), eq(userSocialAccounts.provider, "INSTAGRAM")),
      )
      .limit(1);
    const social = socialRows[0] ?? null;
    if (social?.accessTokenEncrypted && social.providerUserId) {
      let profile: Awaited<ReturnType<typeof fetchInstagramProfile>> | null = null;
      try {
        const accessToken = decryptSecret(social.accessTokenEncrypted);
        profile = await fetchInstagramProfile({
          accessToken,
          igUserId: social.providerUserId,
        });
      } catch {
        profile = null;
      }

      await db.insert(creatorMeta).values({
        id: crypto.randomUUID(),
        creatorId: userId,
        igUserId: social.providerUserId,
        accountType: profile?.accountType ?? null,
        accessTokenEncrypted: social.accessTokenEncrypted,
        expiresAt: social.expiresAt ?? null,
        profileSyncedAt: profile ? now : null,
        profileError: profile ? null : "Profile sync failed",
        scopes: social.scopes ?? null,
        createdAt: now,
        updatedAt: now,
      });

      await db
        .update(creators)
        .set({
          igUserId: social.providerUserId,
          username: profile?.username ?? parsed.data.username ?? null,
          followersCount: profile?.followersCount ?? parsed.data.followersCount ?? null,
          updatedAt: now,
        })
        .where(eq(creators.id, userId));
    }
  }

  return Response.json({ ok: true });
}
