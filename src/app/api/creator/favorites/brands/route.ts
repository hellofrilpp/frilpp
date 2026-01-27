import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { creatorBrandFavorites, deliverables, matches, offers } from "@/db/schema";
import { requireCreatorContext } from "@/lib/auth";

export const runtime = "nodejs";

const favoriteSchema = z.object({
  brandId: z.string().min(1),
  favorite: z.boolean(),
});

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctx = await requireCreatorContext(request);
  if (ctx instanceof Response) return ctx;

  const rows = await db
    .select({ brandId: creatorBrandFavorites.brandId })
    .from(creatorBrandFavorites)
    .where(eq(creatorBrandFavorites.creatorId, ctx.creator.id));

  return Response.json({ ok: true, favorites: rows });
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctx = await requireCreatorContext(request);
  if (ctx instanceof Response) return ctx;

  const json = await request.json().catch(() => null);
  const parsed = favoriteSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const { brandId, favorite } = parsed.data;

  if (favorite) {
    const completed = await db
      .select({ id: matches.id })
      .from(matches)
      .innerJoin(offers, eq(offers.id, matches.offerId))
      .innerJoin(deliverables, eq(deliverables.matchId, matches.id))
      .where(
        and(
          eq(matches.creatorId, ctx.creator.id),
          eq(offers.brandId, brandId),
          eq(deliverables.status, "VERIFIED"),
        ),
      )
      .limit(1);

    if (!completed[0]) {
      return Response.json(
        { ok: false, error: "Favorite requires a completed deal" },
        { status: 409 },
      );
    }

    await db
      .insert(creatorBrandFavorites)
      .values({
        id: crypto.randomUUID(),
        creatorId: ctx.creator.id,
        brandId,
        createdAt: new Date(),
      })
      .onConflictDoNothing();
  } else {
    await db
      .delete(creatorBrandFavorites)
      .where(
        and(eq(creatorBrandFavorites.creatorId, ctx.creator.id), eq(creatorBrandFavorites.brandId, brandId)),
      );
  }

  return Response.json({ ok: true });
}
