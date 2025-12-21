import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { getShopifyStoreForBrand } from "@/db/shopify";
import { brands, creators, deliverables, matchDiscounts, matches, offerProducts, offers } from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { enqueueNotification } from "@/lib/notifications";
import { createDiscountForMatch } from "@/lib/shopify-discounts";
import { ensureManualShipmentForMatch } from "@/lib/manual-shipments";
import { ensureShopifyOrderForMatch } from "@/lib/shopify-orders";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ matchId: string }> }) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctx = await requireBrandContext(request);
  if (ctx instanceof Response) return ctx;

  const { matchId } = await context.params;
  const now = new Date();

  const matchRows = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  const match = matchRows[0];
  if (!match) return Response.json({ ok: false, error: "Match not found" }, { status: 404 });

  const offerRows = await db.select().from(offers).where(eq(offers.id, match.offerId)).limit(1);
  const offer = offerRows[0];
  if (!offer) return Response.json({ ok: false, error: "Offer not found" }, { status: 404 });
  if (offer.brandId !== ctx.brandId) {
    return Response.json({ ok: false, error: "Match not found" }, { status: 404 });
  }

  const acceptedAt = match.status === "ACCEPTED" ? (match.acceptedAt ?? now) : now;

  if (match.status !== "ACCEPTED") {
    await db
      .update(matches)
      .set({ status: "ACCEPTED", acceptedAt })
      .where(eq(matches.id, matchId));
  }

  const existingDeliverable = await db
    .select({ id: deliverables.id })
    .from(deliverables)
    .where(eq(deliverables.matchId, matchId))
    .limit(1);
  if (!existingDeliverable[0]) {
    const dueAt = new Date(
      acceptedAt.getTime() + (offer.deadlineDaysAfterDelivery + 14) * 24 * 60 * 60 * 1000,
    );
    await db.insert(deliverables).values({
      id: crypto.randomUUID(),
      matchId,
      status: "DUE",
      expectedType: offer.deliverableType,
      dueAt,
    });
  }

  let discountCreated = false;
  let orderCreated = false;
  const errors: string[] = [];

  const store = await getShopifyStoreForBrand(offer.brandId);
  const offerProductRows = store
    ? await db
        .select({ shopifyProductId: offerProducts.shopifyProductId })
        .from(offerProducts)
        .where(eq(offerProducts.offerId, offer.id))
        .limit(20)
    : [];
  const fulfillmentType =
    typeof offer.metadata === "object" && offer.metadata
      ? String((offer.metadata as Record<string, unknown>).fulfillmentType ?? "")
      : "";
  const wantsManual = fulfillmentType === "MANUAL";
  const needsManualShipment =
    offer.deliverableType !== "UGC_ONLY" &&
    (wantsManual || !store || offerProductRows.length === 0);

  try {
    if (store && offer.deliverableType !== "UGC_ONLY") {
      const existingDiscount = await db
        .select({ id: matchDiscounts.id })
        .from(matchDiscounts)
        .where(eq(matchDiscounts.matchId, matchId))
        .limit(1);
      if (!existingDiscount[0]) {
        if (!offerProductRows.length) {
          throw new Error("Offer has no Shopify products selected");
        }
        const percent = Number(process.env.DEFAULT_CREATOR_DISCOUNT_PERCENT ?? "10");
        const token = decryptSecret(store.accessTokenEncrypted);

        const created = await createDiscountForMatch({
          shopDomain: store.shopDomain,
          accessToken: token,
          code: match.campaignCode,
          entitledProductIds: offerProductRows.map((p) => p.shopifyProductId),
          percentOff: Number.isFinite(percent) ? percent : 10,
          daysValid: 30,
        });

        await db
          .insert(matchDiscounts)
          .values({
            id: crypto.randomUUID(),
            matchId,
            shopDomain: store.shopDomain,
            shopifyPriceRuleId: created.shopifyPriceRuleId,
            shopifyDiscountCodeId: created.shopifyDiscountCodeId,
          })
          .onConflictDoNothing();
      }
      discountCreated = true;
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Discount creation failed");
  }

  if (store) {
    try {
      await ensureShopifyOrderForMatch(matchId);
      orderCreated = true;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Order creation failed");
    }
  }

  if (needsManualShipment) {
    try {
      await ensureManualShipmentForMatch(matchId);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Manual shipment creation failed");
    }
  }

  try {
    const creatorRows = await db.select().from(creators).where(eq(creators.id, match.creatorId)).limit(1);
    const creator = creatorRows[0];
    const brandRows = await db.select({ name: brands.name }).from(brands).where(eq(brands.id, offer.brandId)).limit(1);
    const brandName = brandRows[0]?.name ?? "Frilpp";
    const payload = {
      brandName,
      offerTitle: offer.title,
      campaignCode: match.campaignCode,
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/r/${encodeURIComponent(match.campaignCode)}`,
    };
    if (creator?.email) await enqueueNotification({ channel: "EMAIL", to: creator.email, type: "creator_approved", payload });
    if (creator?.phone && process.env.TWILIO_FROM_NUMBER) {
      await enqueueNotification({ channel: "SMS", to: creator.phone, type: "creator_approved", payload });
    }
    if (creator?.phone && process.env.TWILIO_WHATSAPP_FROM) {
      await enqueueNotification({ channel: "WHATSAPP", to: creator.phone, type: "creator_approved", payload });
    }
  } catch {
    // ignore notification failures
  }

  return Response.json({
    ok: true,
    match: {
      id: matchId,
      status: "ACCEPTED",
      acceptedAt: acceptedAt.toISOString(),
      campaignCode: match.campaignCode,
      shareUrlPath: `/r/${encodeURIComponent(match.campaignCode)}`,
      discountCreated,
      orderCreated,
    },
    errors,
  });
}
