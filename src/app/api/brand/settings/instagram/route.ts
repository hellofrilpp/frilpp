import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";

export const runtime = "nodejs";

const patchSchema = z.object({
  instagramHandle: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .transform((v) => v.replace(/^@/, "")),
});

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctx = await requireBrandContext(request);
  if (ctx instanceof Response) return ctx;

  const rows = await db.select({ instagramHandle: brands.instagramHandle }).from(brands).where(eq(brands.id, ctx.brandId)).limit(1);
  const brand = rows[0];
  if (!brand) return Response.json({ ok: false, error: "Brand not found" }, { status: 404 });

  return Response.json({ ok: true, instagramHandle: brand.instagramHandle ?? null });
}

export async function PATCH(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctx = await requireBrandContext(request);
  if (ctx instanceof Response) return ctx;

  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  await db
    .update(brands)
    .set({ instagramHandle: parsed.data.instagramHandle, updatedAt: new Date() })
    .where(eq(brands.id, ctx.brandId));

  return Response.json({ ok: true });
}

