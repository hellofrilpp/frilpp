import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { brands, deliverables, matches, offers } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

type Params = { params: { offerId: string } };

export async function GET(request: Request, { params }: Params) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const sessionOrResponse = await requireAdmin(request);
  if (sessionOrResponse instanceof Response) return sessionOrResponse;

  const offerRows = await db
    .select({
      id: offers.id,
      title: offers.title,
      status: offers.status,
      template: offers.template,
      deliverableType: offers.deliverableType,
      createdAt: offers.createdAt,
      publishedAt: offers.publishedAt,
      maxClaims: offers.maxClaims,
      deadlineDaysAfterDelivery: offers.deadlineDaysAfterDelivery,
      metadata: offers.metadata,
      brandId: brands.id,
      brandName: brands.name,
    })
    .from(offers)
    .innerJoin(brands, eq(brands.id, offers.brandId))
    .where(eq(offers.id, params.offerId))
    .limit(1);

  const offer = offerRows[0];
  if (!offer) {
    return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const matchCounts = await db
    .select({ status: matches.status, total: count(matches.id) })
    .from(matches)
    .where(eq(matches.offerId, params.offerId))
    .groupBy(matches.status);

  const deliverableCounts = await db
    .select({ status: deliverables.status, total: count(deliverables.id) })
    .from(deliverables)
    .innerJoin(matches, eq(matches.id, deliverables.matchId))
    .where(eq(matches.offerId, params.offerId))
    .groupBy(deliverables.status);

  return Response.json({
    ok: true,
    campaign: {
      id: offer.id,
      title: offer.title,
      status: offer.status,
      template: offer.template,
      deliverableType: offer.deliverableType,
      createdAt: offer.createdAt.toISOString(),
      publishedAt: offer.publishedAt?.toISOString() ?? null,
      maxClaims: offer.maxClaims,
      deadlineDaysAfterDelivery: offer.deadlineDaysAfterDelivery,
      metadata: offer.metadata,
      brandId: offer.brandId,
      brandName: offer.brandName,
      matchCounts: matchCounts.map((row) => ({
        status: row.status,
        total: Number(row.total ?? 0),
      })),
      deliverableCounts: deliverableCounts.map((row) => ({
        status: row.status,
        total: Number(row.total ?? 0),
      })),
    },
  });
}
