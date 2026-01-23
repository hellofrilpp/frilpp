import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { brands, deliverables, manualShipments, matches, offerProducts, offers, shopifyOrders } from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/billing";
import { templateToDeliverableType, type OfferTemplateId } from "@/lib/offer-template";
import { coerceDraftMetadata, validatePublishMetadata } from "@/lib/offer-metadata";
import { USAGE_RIGHTS_SCOPES } from "@/lib/usage-rights";

export const runtime = "nodejs";

const patchSchema = z
  .object({
    title: z.string().min(3).max(160).optional(),
    template: z.enum(["REEL", "FEED", "REEL_PLUS_STORY", "UGC_ONLY"]).optional(),
    countriesAllowed: z.array(z.enum(["US", "IN"])).min(1).optional(),
    maxClaims: z.number().int().min(1).max(10000).optional(),
    deadlineDaysAfterDelivery: z.number().int().min(1).max(365).optional(),
    followersThreshold: z.number().int().min(0).max(100_000_000).optional(),
    aboveThresholdAutoAccept: z.boolean().optional(),
    usageRightsRequired: z.boolean().optional(),
    usageRightsScope: z.enum(USAGE_RIGHTS_SCOPES).optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    products: z
      .array(
        z.object({
          shopifyProductId: z.string().min(1),
          shopifyVariantId: z.string().min(1),
          quantity: z.number().int().min(1).max(100).default(1),
        }),
      )
      .optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
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
      metadata: offer.metadata ?? {},
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
        error: "Please add your brand location in Settings before updating campaigns.",
        code: "NEEDS_LOCATION",
      },
      { status: 409 },
    );
  }

  const existingRows = await db
    .select({
      id: offers.id,
      status: offers.status,
      countriesAllowed: offers.countriesAllowed,
      template: offers.template,
      metadata: offers.metadata,
    })
    .from(offers)
    .where(and(eq(offers.id, offerId), eq(offers.brandId, ctx.brandId)))
    .limit(1);
  const existing = existingRows[0];
  if (!existing) return Response.json({ ok: false, error: "Offer not found" }, { status: 404 });

  if (patch.status === "DRAFT" && existing.status !== "DRAFT") {
    return Response.json({ ok: false, error: "Cannot revert to draft" }, { status: 400 });
  }

  const nextCountriesAllowed = patch.countriesAllowed ?? existing.countriesAllowed;
  const nextTemplate = (patch.template ?? existing.template) as OfferTemplateId;

  const publishing = patch.status === "PUBLISHED" && existing.status !== "PUBLISHED";
  const storedMetadata = (() => {
    if (publishing) {
      const validated = validatePublishMetadata({
        raw: patch.metadata ?? existing.metadata,
        countriesAllowed: nextCountriesAllowed as Array<"US" | "IN">,
      });
      if (!validated.ok) return validated.response;
      return validated.metadata;
    }
    if (patch.metadata !== undefined) return coerceDraftMetadata(patch.metadata);
    return undefined;
  })();
  if (storedMetadata instanceof Response) return storedMetadata;

  if (publishing) {
    const subscribed = await hasActiveSubscription({
      subjectType: "BRAND",
      subjectId: ctx.brandId,
    });
    if (!subscribed) {
      return Response.json(
        {
          ok: false,
          error: "Subscription required to publish offers",
          code: "PAYWALL",
          lane: "brand",
        },
        { status: 402 },
      );
    }
  }

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.template !== undefined) {
    const deliverableType = templateToDeliverableType(nextTemplate);
    update.template = nextTemplate;
    update.deliverableType = deliverableType;
    update.requiresCaptionCode = deliverableType !== "UGC_ONLY";
  }
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
  if (storedMetadata !== undefined) update.metadata = storedMetadata;
  if (patch.status !== undefined) {
    update.status = patch.status;
    if (publishing) {
      update.publishedAt = new Date();
    }
  }

  const updated = await db
    .transaction(async (tx) => {
      await tx.execute(sql`set local lock_timeout = '3s'`);
      await tx.execute(sql`set local statement_timeout = '10s'`);

      if (patch.products) {
        await tx.delete(offerProducts).where(eq(offerProducts.offerId, offerId));
        if (patch.products.length) {
          await tx.insert(offerProducts).values(
            patch.products.map((p) => ({
              id: crypto.randomUUID(),
              offerId,
              shopifyProductId: p.shopifyProductId,
              shopifyVariantId: p.shopifyVariantId,
              quantity: p.quantity,
            })),
          );
        }
      }

      return tx
        .update(offers)
        .set(update)
        .where(and(eq(offers.id, offerId), eq(offers.brandId, ctx.brandId)))
        .returning({ id: offers.id })
        .catch(() => []);
    })
    .catch(() => []);

  if (!updated.length) return Response.json({ ok: false, error: "Offer not found" }, { status: 404 });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request, context: { params: Promise<{ offerId: string }> }) {
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
    .select({ id: offers.id, status: offers.status })
    .from(offers)
    .where(and(eq(offers.id, offerId), eq(offers.brandId, ctx.brandId)))
    .limit(1);
  const offer = offerRows[0];
  if (!offer) return Response.json({ ok: false, error: "Offer not found" }, { status: 404 });

  if (offer.status !== "DRAFT") {
    return Response.json(
      { ok: false, error: "Only draft campaigns can be permanently deleted", code: "ONLY_DRAFT_CAN_DELETE" },
      { status: 409 },
    );
  }

  const [matchRow] = await db
    .select({ id: matches.id })
    .from(matches)
    .where(eq(matches.offerId, offerId))
    .limit(1);
  if (matchRow) {
    return Response.json(
      { ok: false, error: "Campaign has matches and cannot be deleted", code: "OFFER_HAS_ACTIVITY" },
      { status: 409 },
    );
  }

  const [deliverableRow] = await db
    .select({ id: deliverables.id })
    .from(deliverables)
    .innerJoin(matches, eq(deliverables.matchId, matches.id))
    .where(eq(matches.offerId, offerId))
    .limit(1);
  if (deliverableRow) {
    return Response.json(
      { ok: false, error: "Campaign has deliverables and cannot be deleted", code: "OFFER_HAS_ACTIVITY" },
      { status: 409 },
    );
  }

  const [manualShipmentRow] = await db
    .select({ id: manualShipments.id })
    .from(manualShipments)
    .innerJoin(matches, eq(manualShipments.matchId, matches.id))
    .where(eq(matches.offerId, offerId))
    .limit(1);
  if (manualShipmentRow) {
    return Response.json(
      { ok: false, error: "Campaign has shipments and cannot be deleted", code: "OFFER_HAS_ACTIVITY" },
      { status: 409 },
    );
  }

  const [shopifyOrderRow] = await db
    .select({ id: shopifyOrders.id })
    .from(shopifyOrders)
    .innerJoin(matches, eq(shopifyOrders.matchId, matches.id))
    .where(eq(matches.offerId, offerId))
    .limit(1);
  if (shopifyOrderRow) {
    return Response.json(
      { ok: false, error: "Campaign has shipments and cannot be deleted", code: "OFFER_HAS_ACTIVITY" },
      { status: 409 },
    );
  }

  const deleted = await db.transaction(async (tx) => {
    await tx.delete(offerProducts).where(eq(offerProducts.offerId, offerId));
    return tx
      .delete(offers)
      .where(and(eq(offers.id, offerId), eq(offers.brandId, ctx.brandId)))
      .returning({ id: offers.id })
      .catch(() => []);
  });

  if (!deleted.length) return Response.json({ ok: false, error: "Offer not found" }, { status: 404 });
  return Response.json({ ok: true });
}
