import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { offerProducts, offers } from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";

export const runtime = "nodejs";

const patchSchema = z
  .object({
    title: z.string().min(3).max(160).optional(),
    countriesAllowed: z.array(z.enum(["US", "IN"])).min(1).optional(),
    maxClaims: z.number().int().min(1).max(10000).optional(),
    deadlineDaysAfterDelivery: z.number().int().min(1).max(365).optional(),
    followersThreshold: z.number().int().min(0).max(100_000_000).optional(),
    aboveThresholdAutoAccept: z.boolean().optional(),
    usageRightsRequired: z.boolean().optional(),
    usageRightsScope: z.string().max(64).optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  })
  .strict();

export async function GET(request: Request, context: { params: Promise<{ offerId: string }> }) {
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
    .select({
      shopifyProductId: offerProducts.shopifyProductId,
      shopifyVariantId: offerProducts.shopifyVariantId,
      quantity: offerProducts.quantity,
    })
    .from(offerProducts)
    .where(eq(offerProducts.offerId, offer.id))
    .limit(50);

  return Response.json({
    ok: true,
    offer: {
      id: offer.id,
      title: offer.title,
      template: offer.template,
      status: offer.status,
      countriesAllowed: offer.countriesAllowed,
      maxClaims: offer.maxClaims,
      deadlineDaysAfterDelivery: offer.deadlineDaysAfterDelivery,
      deliverableType: offer.deliverableType,
      requiresCaptionCode: offer.requiresCaptionCode,
      usageRightsRequired: offer.usageRightsRequired,
      usageRightsScope: offer.usageRightsScope ?? null,
      acceptanceFollowersThreshold: offer.acceptanceFollowersThreshold,
      acceptanceAboveThresholdAutoAccept: offer.acceptanceAboveThresholdAutoAccept,
      publishedAt: offer.publishedAt?.toISOString() ?? null,
      createdAt: offer.createdAt.toISOString(),
      updatedAt: offer.updatedAt.toISOString(),
      products,
    },
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ offerId: string }> }) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctx = await requireBrandContext(request);
  if (ctx instanceof Response) return ctx;
  const { offerId } = await context.params;

  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const patch = parsed.data;
  if (!Object.keys(patch).length) {
    return Response.json({ ok: false, error: "No changes" }, { status: 400 });
  }

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.countriesAllowed !== undefined) update.countriesAllowed = patch.countriesAllowed;
  if (patch.maxClaims !== undefined) update.maxClaims = patch.maxClaims;
  if (patch.deadlineDaysAfterDelivery !== undefined)
    update.deadlineDaysAfterDelivery = patch.deadlineDaysAfterDelivery;
  if (patch.followersThreshold !== undefined)
    update.acceptanceFollowersThreshold = patch.followersThreshold;
  if (patch.aboveThresholdAutoAccept !== undefined)
    update.acceptanceAboveThresholdAutoAccept = patch.aboveThresholdAutoAccept;
  if (patch.usageRightsRequired !== undefined)
    update.usageRightsRequired = patch.usageRightsRequired;
  if (patch.usageRightsScope !== undefined) update.usageRightsScope = patch.usageRightsScope;
  if (patch.status !== undefined) {
    update.status = patch.status;
    if (patch.status === "PUBLISHED") update.publishedAt = new Date();
  }

  const updated = await db
    .update(offers)
    .set(update)
    .where(and(eq(offers.id, offerId), eq(offers.brandId, ctx.brandId)))
    .returning({ id: offers.id })
    .catch(() => []);

  if (!updated.length) return Response.json({ ok: false, error: "Offer not found" }, { status: 404 });

  return Response.json({ ok: true });
}
