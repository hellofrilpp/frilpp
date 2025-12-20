import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands, offers } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ offerId: string }> }) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const { offerId } = await context.params;

    const rows = await db
      .select({
      id: offers.id,
      title: offers.title,
      template: offers.template,
      status: offers.status,
      countriesAllowed: offers.countriesAllowed,
      maxClaims: offers.maxClaims,
      deadlineDaysAfterDelivery: offers.deadlineDaysAfterDelivery,
      deliverableType: offers.deliverableType,
      usageRightsRequired: offers.usageRightsRequired,
      usageRightsScope: offers.usageRightsScope,
      publishedAt: offers.publishedAt,
      brandName: brands.name,
    })
    .from(offers)
    .innerJoin(brands, eq(brands.id, offers.brandId))
    .where(eq(offers.id, offerId))
    .limit(1);

  const offer = rows[0];
  if (!offer) return Response.json({ ok: false, error: "Offer not found" }, { status: 404 });
  if (offer.status !== "PUBLISHED") {
    return Response.json({ ok: false, error: "Offer not available" }, { status: 400 });
  }

  return Response.json({
    ok: true,
    offer: {
      id: offer.id,
      title: offer.title,
      template: offer.template,
      countriesAllowed: offer.countriesAllowed,
      maxClaims: offer.maxClaims,
      deadlineDaysAfterDelivery: offer.deadlineDaysAfterDelivery,
      deliverableType: offer.deliverableType,
      usageRightsRequired: offer.usageRightsRequired,
      usageRightsScope: offer.usageRightsScope ?? null,
      publishedAt: offer.publishedAt?.toISOString() ?? null,
      brandName: offer.brandName,
    },
  });
}
