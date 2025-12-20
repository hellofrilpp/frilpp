import { z } from "zod";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireBrandContext } from "@/lib/auth";

export const runtime = "nodejs";

const updateSchema = z.object({
  threshold: z.number().int().min(0).max(100_000_000),
  aboveThresholdAutoAccept: z.boolean(),
});

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  try {
    const ctx = await requireBrandContext(request);
    if (ctx instanceof Response) return ctx;

    const brandRows = await db.select().from(brands).where(eq(brands.id, ctx.brandId)).limit(1);
    const brand = brandRows[0];
    if (!brand) return Response.json({ ok: false, error: "Brand not found" }, { status: 404 });

    return Response.json({
      ok: true,
      acceptance: {
        threshold: brand.acceptanceFollowersThreshold,
        aboveThresholdAutoAccept: brand.acceptanceAboveThresholdAutoAccept,
      },
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "DB error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const ctx = await requireBrandContext(request);
    if (ctx instanceof Response) return ctx;
    await db
      .update(brands)
      .set({
        acceptanceFollowersThreshold: parsed.data.threshold,
        acceptanceAboveThresholdAutoAccept: parsed.data.aboveThresholdAutoAccept,
        updatedAt: new Date(),
      })
      .where(eq(brands.id, ctx.brandId));

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "DB error" },
      { status: 500 },
    );
  }
}
