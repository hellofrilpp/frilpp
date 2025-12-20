import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";

export const runtime = "nodejs";

const patchSchema = z.object({
  newMatch: z.boolean(),
  contentReceived: z.boolean(),
  weeklyDigest: z.boolean(),
  marketing: z.boolean(),
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

  const rows = await db
    .select({
      newMatch: brands.notificationNewMatch,
      contentReceived: brands.notificationContentReceived,
      weeklyDigest: brands.notificationWeeklyDigest,
      marketing: brands.notificationMarketing,
    })
    .from(brands)
    .where(eq(brands.id, ctx.brandId))
    .limit(1);
  const settings = rows[0];
  if (!settings) return Response.json({ ok: false, error: "Brand not found" }, { status: 404 });

  return Response.json({ ok: true, notifications: settings });
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
    .set({
      notificationNewMatch: parsed.data.newMatch,
      notificationContentReceived: parsed.data.contentReceived,
      notificationWeeklyDigest: parsed.data.weeklyDigest,
      notificationMarketing: parsed.data.marketing,
      updatedAt: new Date(),
    })
    .where(eq(brands.id, ctx.brandId));

  return Response.json({ ok: true });
}
