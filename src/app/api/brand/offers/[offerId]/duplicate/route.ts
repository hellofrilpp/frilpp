import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { brands, offers } from "@/db/schema";
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

  const brandRows = await db
    .select({ lat: brands.lat, lng: brands.lng })
    .from(brands)
    .where(eq(brands.id, ctx.brandId))
    .limit(1);
  const brand = brandRows[0] ?? null;
  if (brand?.lat === null || brand?.lat === undefined || brand?.lng === null || brand?.lng === undefined) {
    return Response.json(
      {
        ok: false,
        error: "Please add your brand location in Settings before duplicating campaigns.",
        code: "NEEDS_LOCATION",
      },
      { status: 409 },
    );
  }

  const offerRows = await db
    .select()
    .from(offers)
    .where(and(eq(offers.id, offerId), eq(offers.brandId, ctx.brandId)))
    .limit(1);
  const offer = offerRows[0];
  if (!offer) return Response.json({ ok: false, error: "Offer not found" }, { status: 404 });

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
    acceptanceAboveThresholdAutoAccept: false,
    metadata: offer.metadata,
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  return Response.json({ ok: true, offerId: newId });
}
