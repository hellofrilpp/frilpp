import { desc, count, inArray, eq } from "drizzle-orm";
import { db } from "@/db";
import { brands, matches, offers } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const sessionOrResponse = await requireAdmin(request);
  if (sessionOrResponse instanceof Response) return sessionOrResponse;

  const rows = await db
    .select({
      id: offers.id,
      title: offers.title,
      status: offers.status,
      template: offers.template,
      createdAt: offers.createdAt,
      publishedAt: offers.publishedAt,
      brandId: brands.id,
      brandName: brands.name,
    })
    .from(offers)
    .innerJoin(brands, eq(brands.id, offers.brandId))
    .orderBy(desc(offers.createdAt))
    .limit(200);

  const offerIds = rows.map((row) => row.id);
  const matchCounts = offerIds.length
    ? await db
        .select({ offerId: matches.offerId, total: count(matches.id) })
        .from(matches)
        .where(inArray(matches.offerId, offerIds))
        .groupBy(matches.offerId)
    : [];
  const matchCountByOffer = new Map(matchCounts.map((r) => [r.offerId, Number(r.total ?? 0)]));

  return Response.json({
    ok: true,
    campaigns: rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      template: row.template,
      brandId: row.brandId,
      brandName: row.brandName,
      createdAt: row.createdAt.toISOString(),
      publishedAt: row.publishedAt?.toISOString() ?? null,
      matchCount: matchCountByOffer.get(row.id) ?? 0,
    })),
  });
}
