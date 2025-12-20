import { z } from "zod";
import { db } from "@/db";
import { creators } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { CREATOR_CATEGORIES } from "@/lib/picklists";

export const runtime = "nodejs";

const bodySchema = z.object({
  username: z.string().min(1).max(64).optional(),
  followersCount: z.number().int().min(0).max(50_000_000).optional(),
  country: z.enum(["US", "IN"]),
  categories: z.array(z.enum(CREATOR_CATEGORIES)).max(20).optional(),
  categoriesOther: z.string().trim().min(2).max(64).optional(),
  fullName: z.string().min(1).max(128),
  email: z.string().email(),
  phone: z.string().min(3).max(32).optional(),
  address1: z.string().min(1).max(128),
  address2: z.string().max(128).optional(),
  city: z.string().min(1).max(64),
  province: z.string().max(64).optional(),
  zip: z.string().min(1).max(16),
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
  const existing = await db.select({ id: creators.id }).from(creators).where(eq(creators.id, userId)).limit(1);
  if (existing[0]) {
    await db
      .update(creators)
      .set({ ...parsed.data, updatedAt: new Date() })
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
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone ?? null,
      address1: parsed.data.address1,
      address2: parsed.data.address2 ?? null,
      city: parsed.data.city,
      province: parsed.data.province ?? null,
      zip: parsed.data.zip,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return Response.json({ ok: true });
}
