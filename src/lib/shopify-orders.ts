import { eq } from "drizzle-orm";
import { db } from "@/db";
import { getShopifyStoreForBrand } from "@/db/shopify";
import { creators, matches, offerProducts, offers, shopifyOrders } from "@/db/schema";
import { decryptSecret } from "@/lib/crypto";
import { shopifyRest } from "@/lib/shopify";

type DraftOrderCreateResponse = {
  draft_order: {
    id: number;
    invoice_url: string;
  };
};

type DraftOrderCompleteResponse = {
  draft_order: {
    id: number;
    order_id: number;
    name: string;
  };
};

export async function ensureShopifyOrderForMatch(matchId: string) {
  const existing = await db
    .select()
    .from(shopifyOrders)
    .where(eq(shopifyOrders.matchId, matchId))
    .limit(1);
  let existingRow = existing[0];
  if (
    existingRow &&
    (existingRow.status === "COMPLETED" ||
      existingRow.status === "FULFILLED" ||
      existingRow.status === "CANCELED")
  ) {
    return existingRow;
  }

  const matchRows = await db
    .select({ id: matches.id, offerId: matches.offerId, campaignCode: matches.campaignCode, creatorId: matches.creatorId })
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  const match = matchRows[0];
  if (!match) throw new Error("Match not found");

  const offerRows = await db.select().from(offers).where(eq(offers.id, match.offerId)).limit(1);
  const offer = offerRows[0];
  if (!offer) throw new Error("Offer not found");

  const store = await getShopifyStoreForBrand(offer.brandId);
  if (!store) throw new Error("Shopify not connected");
  const token = decryptSecret(store.accessTokenEncrypted);

  const creatorRows = await db.select().from(creators).where(eq(creators.id, match.creatorId)).limit(1);
  const creator = creatorRows[0];
  if (!creator) throw new Error("Creator not found");

  if (!creator.address1 || !creator.city || !creator.zip || !creator.country) {
    throw new Error("Creator shipping address incomplete");
  }

  const lineItems = await db
    .select({ variantId: offerProducts.shopifyVariantId, quantity: offerProducts.quantity })
    .from(offerProducts)
    .where(eq(offerProducts.offerId, offer.id));

  if (!lineItems.length) {
    throw new Error("Offer has no Shopify variants selected");
  }

  if (!existingRow) {
    const recordId = crypto.randomUUID();
    await db
      .insert(shopifyOrders)
      .values({
        id: recordId,
        matchId: match.id,
        shopDomain: store.shopDomain,
        status: "PENDING",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();

    const refreshed = await db
      .select()
      .from(shopifyOrders)
      .where(eq(shopifyOrders.matchId, match.id))
      .limit(1);
    existingRow = refreshed[0];
    if (!existingRow) {
      throw new Error("Failed to initialize Shopify order");
    }
  }
  const recordId = existingRow.id;

  try {
    if (existingRow?.shopifyOrderId) {
      await db
        .update(shopifyOrders)
        .set({ status: "COMPLETED", updatedAt: new Date(), error: null })
        .where(eq(shopifyOrders.id, recordId));
      const finalRow = await db
        .select()
        .from(shopifyOrders)
        .where(eq(shopifyOrders.id, recordId))
        .limit(1);
      if (!finalRow[0]) throw new Error("Failed to persist Shopify order");
      return finalRow[0];
    }

    if (existingRow?.shopifyDraftOrderId && existingRow.status === "DRAFT_CREATED") {
      try {
        const completed = await shopifyRest<DraftOrderCompleteResponse>(
          store.shopDomain,
          token,
          `/draft_orders/${existingRow.shopifyDraftOrderId}/complete.json?payment_pending=true`,
          { method: "PUT", body: JSON.stringify({}) },
        );

        await db
          .update(shopifyOrders)
          .set({
            status: "COMPLETED",
            shopifyOrderId: String(completed.draft_order.order_id),
            shopifyOrderName: completed.draft_order.name,
            error: null,
            updatedAt: new Date(),
          })
          .where(eq(shopifyOrders.id, recordId));

        const finalRow = await db
          .select()
          .from(shopifyOrders)
          .where(eq(shopifyOrders.id, recordId))
          .limit(1);
        if (!finalRow[0]) throw new Error("Failed to persist Shopify order");
        return finalRow[0];
      } catch {
        // Fall through to creating a fresh draft order.
      }
    }

    const draft = await shopifyRest<DraftOrderCreateResponse>(store.shopDomain, token, "/draft_orders.json", {
      method: "POST",
      body: JSON.stringify({
        draft_order: {
          email: creator.email ?? undefined,
          note: `FRILPP match=${match.id} code=${match.campaignCode}`,
          note_attributes: [
            { name: "frilpp_match_id", value: match.id },
            { name: "frilpp_campaign_code", value: match.campaignCode },
            { name: "frilpp_offer_id", value: offer.id },
          ],
          shipping_address: {
            first_name: creator.fullName?.split(" ")[0] ?? "Creator",
            last_name: creator.fullName?.split(" ").slice(1).join(" ") || " ",
            address1: creator.address1,
            address2: creator.address2 ?? undefined,
            city: creator.city,
            province: creator.province ?? undefined,
            zip: creator.zip,
            country_code: creator.country,
            phone: creator.phone ?? undefined,
          },
          line_items: lineItems.map((li) => ({
            variant_id: Number(li.variantId),
            quantity: li.quantity,
            applied_discount: {
              value_type: "percentage",
              value: "100",
              description: "Frilpp product seeding",
            },
          })),
          applied_discount: {
            value_type: "percentage",
            value: "100",
            description: "Frilpp product seeding",
          },
          tags: "FRILPP_SEEDING",
          tax_exempt: true,
        },
      }),
    });

    await db
      .update(shopifyOrders)
      .set({
        status: "DRAFT_CREATED",
        shopifyDraftOrderId: String(draft.draft_order.id),
        error: null,
        updatedAt: new Date(),
      })
      .where(eq(shopifyOrders.id, recordId));

    const completed = await shopifyRest<DraftOrderCompleteResponse>(
      store.shopDomain,
      token,
      `/draft_orders/${draft.draft_order.id}/complete.json?payment_pending=true`,
      { method: "PUT", body: JSON.stringify({}) },
    );

    await db
      .update(shopifyOrders)
      .set({
        status: "COMPLETED",
        shopifyOrderId: String(completed.draft_order.order_id),
        shopifyOrderName: completed.draft_order.name,
        updatedAt: new Date(),
      })
      .where(eq(shopifyOrders.id, recordId));

    const finalRow = await db.select().from(shopifyOrders).where(eq(shopifyOrders.id, recordId)).limit(1);
    if (!finalRow[0]) throw new Error("Failed to persist Shopify order");
    return finalRow[0];
  } catch (err) {
    await db
      .update(shopifyOrders)
      .set({
        status: "ERROR",
        error: err instanceof Error ? err.message : "Shopify order creation failed",
        updatedAt: new Date(),
      })
      .where(eq(shopifyOrders.id, recordId));
    throw err;
  }
}
