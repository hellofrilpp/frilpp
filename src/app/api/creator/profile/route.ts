import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { creators } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { CREATOR_CATEGORIES } from "@/lib/picklists";

export const runtime = "nodejs";

const patchSchema = z
  .object({
    username: z.string().min(1).max(64).nullable().optional(),
    followersCount: z.number().int().min(0).max(50_000_000).nullable().optional(),
    country: z.enum(["US", "IN"]).nullable().optional(),
    categories: z.array(z.enum(CREATOR_CATEGORIES)).max(20).nullable().optional(),
    categoriesOther: z.string().trim().min(2).max(64).nullable().optional(),
    fullName: z.string().min(1).max(128).nullable().optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().min(3).max(32).nullable().optional(),
    address1: z.string().min(1).max(128).nullable().optional(),
    address2: z.string().max(128).nullable().optional(),
    city: z.string().min(1).max(64).nullable().optional(),
    province: z.string().max(64).nullable().optional(),
    zip: z.string().min(1).max(16).nullable().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
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

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const sessionOrResponse = await requireUser(request);
  if (sessionOrResponse instanceof Response) return sessionOrResponse;

  const creatorRows = await db
    .select()
    .from(creators)
    .where(eq(creators.id, sessionOrResponse.user.id))
    .limit(1);
  const creator = creatorRows[0];
  if (!creator) {
    return Response.json(
      { ok: false, error: "Creator profile required", code: "NEEDS_CREATOR_PROFILE" },
      { status: 409 },
    );
  }
  return Response.json({
    ok: true,
    creator: {
      id: creator.id,
      username: creator.username,
      followersCount: creator.followersCount,
      country: creator.country,
      categories: creator.categories ?? null,
      categoriesOther: creator.categoriesOther ?? null,
      fullName: creator.fullName,
      email: creator.email,
      phone: creator.phone,
      address1: creator.address1,
      address2: creator.address2,
      city: creator.city,
      province: creator.province,
      zip: creator.zip,
    },
  });
}

export async function PATCH(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const sessionOrResponse = await requireUser(request);
  if (sessionOrResponse instanceof Response) return sessionOrResponse;

  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const userId = sessionOrResponse.user.id;
  const existing = await db.select({ id: creators.id }).from(creators).where(eq(creators.id, userId)).limit(1);

  if (existing[0]) {
    await db
      .update(creators)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(creators.id, userId));
  } else {
    await db.insert(creators).values({
      id: userId,
      igUserId: null,
      username: parsed.data.username ?? null,
      followersCount: parsed.data.followersCount ?? null,
      country: parsed.data.country ?? null,
      categories: parsed.data.categories ?? null,
      categoriesOther: parsed.data.categoriesOther ?? null,
      fullName: parsed.data.fullName ?? null,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      address1: parsed.data.address1 ?? null,
      address2: parsed.data.address2 ?? null,
      city: parsed.data.city ?? null,
      province: parsed.data.province ?? null,
      zip: parsed.data.zip ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  const updatedRows = await db.select().from(creators).where(eq(creators.id, userId)).limit(1);
  const updated = updatedRows[0];
  if (!updated) return Response.json({ ok: false, error: "Failed to save creator" }, { status: 500 });

  return Response.json({
    ok: true,
    creator: {
      id: updated.id,
      username: updated.username,
      followersCount: updated.followersCount,
      country: updated.country,
      categories: updated.categories ?? null,
      categoriesOther: updated.categoriesOther ?? null,
      fullName: updated.fullName,
      email: updated.email,
      phone: updated.phone,
      address1: updated.address1,
      address2: updated.address2,
      city: updated.city,
      province: updated.province,
      zip: updated.zip,
    },
  });
}
