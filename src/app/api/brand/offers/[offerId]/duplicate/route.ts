import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { offerProducts, offers } from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ offerId: string }> }) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctx = await requireBrandContext(request);
  if (ctx instanceof Response) return ctx;
  const { offerId } = await context.params;

  const offerRows = await db
    .select()
    .from(offers)
    .where(and(eq(offers.id, offerId), eq(offers.brandId, ctx.brandId)))
    .limit(1);
  const offer = offerRows[0];
  if (!offer) return Response.json({ ok: false, error: "Offer not found" }, { status: 404 });

  const products = await db
    .select()
    .from(offerProducts)
    .where(eq(offerProducts.offerId, offer.id))
    .limit(50);

  const newId = crypto.randomUUID();
  const now = new Date();

  await db.insert(offers).values({
    id: newId,
    brandId: offer.brandId,
    title: offer.title,
    template: offer.template,
    status: "PUBLISHED",
    countriesAllowed: offer.countriesAllowed,
    maxClaims: offer.maxClaims,
    deadlineDaysAfterDelivery: offer.deadlineDaysAfterDelivery,
    deliverableType: offer.deliverableType,
    requiresCaptionCode: offer.requiresCaptionCode,
    usageRightsRequired: offer.usageRightsRequired,
    usageRightsScope: offer.usageRightsScope,
    acceptanceFollowersThreshold: offer.acceptanceFollowersThreshold,
    acceptanceAboveThresholdAutoAccept: offer.acceptanceAboveThresholdAutoAccept,
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  if (products.length) {
    await db.insert(offerProducts).values(
      products.map((p) => ({
        id: crypto.randomUUID(),
        offerId: newId,
        shopifyProductId: p.shopifyProductId,
        shopifyVariantId: p.shopifyVariantId,
        quantity: p.quantity,
      })),
    );
  }

  return Response.json({ ok: true, offerId: newId });
}
