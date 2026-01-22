import { and, count, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { getShopifyStoreForBrand } from "@/db/shopify";
import { brands, creatorMeta, creatorOfferRejections, deliverables, matches, offers, offerProducts, matchDiscounts, userSocialAccounts } from "@/db/schema";
import { requireCreatorContext } from "@/lib/auth";
import { generateCampaignCode } from "@/lib/campaign-code";
import { decryptSecret } from "@/lib/crypto";
import { getActiveStrikeCount, getCreatorFollowerRange, getStrikeLimit } from "@/lib/eligibility";
import { log } from "@/lib/logger";
import { enqueueNotification } from "@/lib/notifications";
import { ipKey, rateLimit } from "@/lib/rate-limit";
import { createDiscountForMatch } from "@/lib/shopify-discounts";
import { ensureManualShipmentForMatch } from "@/lib/manual-shipments";
import { ensureShopifyOrderForMatch } from "@/lib/shopify-orders";
import { hasActiveSubscription } from "@/lib/billing";

export const runtime = "nodejs";

const bodySchema = z.object({
  // reserved for future (e.g., shipping address confirmation)
});

const kmToMiles = (km: number) => km / 1.609344;
const milesToKm = (miles: number) => miles * 1.609344;

const toNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return r * c;
};

function parseRadiusKm(metadata: Record<string, unknown>) {
  const km = toNumber(metadata.locationRadiusKm);
  if (km && km > 0) return km;
  const miles = toNumber(metadata.locationRadiusMiles);
  if (miles && miles > 0) return milesToKm(miles);
  return null;
}

function claimError(code: string, message: string, status: number): never {
  const err = new Error(message) as Error & { code: string; status: number };
  err.code = code;
  err.status = status;
  throw err;
}

function getMetaProfileStaleDays() {
  const days = Number(process.env.META_PROFILE_STALE_DAYS ?? "7");
  return Number.isFinite(days) && days > 0 ? Math.floor(days) : 7;
}

function isInstagramEnabled() {
  return process.env.INSTAGRAM_ENABLED === "true";
}

export async function POST(request: Request, context: { params: Promise<{ offerId: string }> }) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const { offerId } = await context.params;
  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  try {
    const creatorCtx = await requireCreatorContext(request);
    if (creatorCtx instanceof Response) return creatorCtx;

    const subscribed = await hasActiveSubscription({
      subjectType: "CREATOR",
      subjectId: creatorCtx.creator.id,
    });
    if (!subscribed) {
      return Response.json(
        {
          ok: false,
          error: "Subscription required to claim offers",
          code: "PAYWALL",
          lane: "creator",
        },
        { status: 402 },
      );
    }

    const offerRows = await db.select().from(offers).where(eq(offers.id, offerId)).limit(1);
    const offer = offerRows[0];
    if (!offer) return Response.json({ ok: false, error: "Offer not found" }, { status: 404 });
    if (offer.status !== "PUBLISHED") {
      return Response.json({ ok: false, error: "Offer not available" }, { status: 400 });
    }

    const creator = creatorCtx.creator;
    if (creator.lat === null || creator.lng === null) {
      return Response.json(
        {
          ok: false,
          error: "Please add your location in Profile before claiming offers.",
          code: "NEEDS_LOCATION",
        },
        { status: 409 },
      );
    }

    const rejectedRows = await db
      .select({ id: creatorOfferRejections.id })
      .from(creatorOfferRejections)
      .where(and(eq(creatorOfferRejections.offerId, offerId), eq(creatorOfferRejections.creatorId, creator.id)))
      .limit(1);
    if (rejectedRows[0]) {
      return Response.json(
        { ok: false, error: "Offer rejected", code: "OFFER_REJECTED" },
        { status: 409 },
      );
    }

    try {
      const creatorPerMinute = Number(process.env.RATE_LIMIT_CLAIMS_PER_CREATOR_PER_MINUTE ?? "12");
      const ipPerMinute = Number(process.env.RATE_LIMIT_CLAIMS_PER_IP_PER_MINUTE ?? "30");
      const creatorRl = await rateLimit({
        key: `claim:creator:${creator.id}`,
        limit: Number.isFinite(creatorPerMinute) && creatorPerMinute > 0 ? Math.floor(creatorPerMinute) : 12,
        windowSeconds: 60,
      });
      if (!creatorRl.allowed) {
        return Response.json(
          { ok: false, error: "Too many requests. Try again shortly.", code: "RATE_LIMITED" },
          { status: 429 },
        );
      }
      const ipRl = await rateLimit({
        key: `claim:${ipKey(request)}`,
        limit: Number.isFinite(ipPerMinute) && ipPerMinute > 0 ? Math.floor(ipPerMinute) : 30,
        windowSeconds: 60,
      });
      if (!ipRl.allowed) {
        return Response.json(
          { ok: false, error: "Too many requests. Try again shortly.", code: "RATE_LIMITED" },
          { status: 429 },
        );
      }
    } catch (err) {
      log("error", "rate limit check failed (claim)", { error: err instanceof Error ? err.message : "unknown" });
    }

    const strikeLimit = getStrikeLimit();
    const strikes = await getActiveStrikeCount(creator.id);
    if (strikes >= strikeLimit) {
      return Response.json(
        {
          ok: false,
          error: "Too many strikes to claim new offers",
          code: "STRIKE_BLOCKED",
          strikes,
          strikeLimit,
        },
        { status: 403 },
      );
    }

    if (creator.country && !offer.countriesAllowed.includes(creator.country)) {
      return Response.json(
        { ok: false, error: "Not eligible for this offer country" },
        { status: 403 },
      );
    }

    const offerMetadata =
      offer.metadata && typeof offer.metadata === "object"
        ? (offer.metadata as Record<string, unknown>)
        : {};
    const fulfillmentType =
      typeof offerMetadata.fulfillmentType === "string"
        ? offerMetadata.fulfillmentType.toUpperCase()
        : "";
    const manualMethod =
      typeof offerMetadata.manualFulfillmentMethod === "string"
        ? offerMetadata.manualFulfillmentMethod.toUpperCase()
        : "";
    const needsDeliveryAddress =
      fulfillmentType === "SHOPIFY" || (fulfillmentType === "MANUAL" && manualMethod === "LOCAL_DELIVERY");
    if (needsDeliveryAddress) {
      if (!creator.address1 || !creator.city || !creator.zip || !creator.country) {
        return Response.json(
          {
            ok: false,
            error: "Add your delivery address in Profile before claiming this offer",
            code: "NEEDS_ADDRESS",
          },
          { status: 409 },
        );
      }
    }

    const locationRadiusKm = (() => {
      if (!offer.metadata || typeof offer.metadata !== "object") return null;
      const v = parseRadiusKm(offer.metadata as Record<string, unknown>);
      return v && v > 0 ? v : null;
    })();
    if (locationRadiusKm) {
      const brandRows = await db
        .select({ lat: brands.lat, lng: brands.lng })
        .from(brands)
        .where(eq(brands.id, offer.brandId))
        .limit(1);
      const brand = brandRows[0] ?? null;
      if (brand?.lat === null || brand?.lng === null || brand?.lat === undefined || brand?.lng === undefined) {
        return Response.json(
          {
            ok: false,
            error: "This offer is missing a brand location. Please try again later.",
            code: "OFFER_LOCATION_MISSING",
          },
          { status: 400 },
        );
      }
      if (creator.lat === null || creator.lng === null) {
        return Response.json(
          { ok: false, error: "Please add your location in Profile before claiming offers.", code: "NEEDS_LOCATION" },
          { status: 409 },
        );
      }
      const distanceKm = haversineKm(creator.lat, creator.lng, brand.lat, brand.lng);
      if (distanceKm > locationRadiusKm) {
        return Response.json(
          {
            ok: false,
            error: "Not eligible for this local offer",
            code: "OUT_OF_RANGE",
            distanceKm: Math.round(distanceKm * 10) / 10,
            radiusKm: Math.round(locationRadiusKm * 10) / 10,
            distanceMiles: Math.round(kmToMiles(distanceKm) * 10) / 10,
            radiusMiles: Math.round(kmToMiles(locationRadiusKm) * 10) / 10,
          },
          { status: 403 },
        );
      }
    }

    const creatorFollowers = creator.followersCount ?? 0;
    const range = getCreatorFollowerRange();
    if (creator.followersCount !== null && creator.followersCount !== undefined && (creatorFollowers < range.min || creatorFollowers > range.max)) {
      return Response.json(
        {
          ok: false,
          error: "Creator follower count is outside the nano range",
          code: "NOT_NANO",
          followersCount: creatorFollowers,
          range,
        },
        { status: 403 },
      );
    }

    const threshold = offer.acceptanceFollowersThreshold;
    const autoAccept = offer.acceptanceAboveThresholdAutoAccept;
    const shouldAutoAccept = autoAccept && creatorFollowers >= threshold;

    if (offer.deliverableType !== "UGC_ONLY") {
      const metadata = offer.metadata as { platforms?: string[] } | null;
      const platforms = Array.isArray(metadata?.platforms)
        ? metadata!.platforms!.map((p) => String(p).toUpperCase())
        : [];
      const instagramEnabled = isInstagramEnabled();
      const allowInstagram = instagramEnabled && (platforms.length === 0 || platforms.includes("INSTAGRAM"));
      const allowTikTok =
        platforms.length === 0 ||
        platforms.includes("TIKTOK") ||
        (!instagramEnabled && platforms.includes("INSTAGRAM"));

      let igReady = false;
      let igError: { code: string; message: string; data?: Record<string, unknown> } | null = null;
      if (allowInstagram) {
        const metaRows = await db
          .select({
            igUserId: creatorMeta.igUserId,
            expiresAt: creatorMeta.expiresAt,
            profileSyncedAt: creatorMeta.profileSyncedAt,
            profileError: creatorMeta.profileError,
          })
          .from(creatorMeta)
          .where(eq(creatorMeta.creatorId, creator.id))
          .limit(1);
        const meta = metaRows[0] ?? null;
        const igConnected = Boolean(meta?.igUserId);
        if (!igConnected) {
          igError = { code: "NEEDS_INSTAGRAM_CONNECT", message: "Instagram connect required" };
        } else if (meta?.expiresAt && meta.expiresAt.getTime() < Date.now()) {
          igError = {
            code: "NEEDS_INSTAGRAM_RECONNECT",
            message: "Instagram token expired. Reconnect required.",
          };
        } else {
          const staleDays = getMetaProfileStaleDays();
          const staleBefore = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);
          if (!meta?.profileSyncedAt || meta.profileSyncedAt.getTime() < staleBefore.getTime() || meta.profileError) {
            igError = {
              code: "NEEDS_INSTAGRAM_SYNC",
              message: "Instagram profile needs sync before claiming posting offers",
              data: {
                profileSyncedAt: meta?.profileSyncedAt?.toISOString() ?? null,
                profileError: meta?.profileError ?? null,
                staleDays,
              },
            };
          } else {
            igReady = true;
          }
        }
      }

      let tiktokReady = false;
      let tiktokError: { code: string; message: string } | null = null;
      if (allowTikTok) {
        const tiktokRows = await db
          .select({
            accessTokenEncrypted: userSocialAccounts.accessTokenEncrypted,
            expiresAt: userSocialAccounts.expiresAt,
          })
          .from(userSocialAccounts)
          .where(
            and(
              eq(userSocialAccounts.userId, creator.id),
              eq(userSocialAccounts.provider, "TIKTOK"),
            ),
          )
          .limit(1);
        const tiktok = tiktokRows[0] ?? null;
        if (!tiktok?.accessTokenEncrypted) {
          tiktokError = { code: "NEEDS_TIKTOK_CONNECT", message: "TikTok connect required" };
        } else if (tiktok.expiresAt && tiktok.expiresAt.getTime() < Date.now()) {
          tiktokError = {
            code: "NEEDS_TIKTOK_RECONNECT",
            message: "TikTok token expired. Reconnect required.",
          };
        } else {
          tiktokReady = true;
        }
      }

      if (!(igReady || tiktokReady)) {
        if (allowInstagram && !allowTikTok && igError) {
          return Response.json(
            { ok: false, error: igError.message, code: igError.code, ...(igError.data ?? {}) },
            { status: 409 },
          );
        }
        if (allowTikTok && !allowInstagram && tiktokError) {
          return Response.json(
            { ok: false, error: tiktokError.message, code: tiktokError.code },
            { status: 409 },
          );
        }
        return Response.json(
          {
            ok: false,
            error: "Social connect required",
            code: "NEEDS_SOCIAL_CONNECT",
          },
          { status: 409 },
        );
      }
    }

    let matchId = "";
    let campaignCode = "";
    const status = shouldAutoAccept ? "ACCEPTED" : "PENDING_APPROVAL";
    const now = new Date();

    let dueAtIso: string | null = null;
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM offers WHERE id = ${offer.id} FOR UPDATE`);

      const existing = await tx
        .select({ id: matches.id })
        .from(matches)
        .where(
          and(
            eq(matches.offerId, offer.id),
            eq(matches.creatorId, creator.id),
            inArray(matches.status, ["PENDING_APPROVAL", "ACCEPTED"]),
          ),
        )
        .limit(1);
      if (existing[0]) {
        claimError("ALREADY_CLAIMED", "Already claimed", 409);
      }

      const claimCountRows = await tx
        .select({ claimCount: count() })
        .from(matches)
        .where(and(eq(matches.offerId, offer.id), inArray(matches.status, ["PENDING_APPROVAL", "ACCEPTED"])));
      const claimCount = Number(claimCountRows[0]?.claimCount ?? 0);
      if (claimCount >= offer.maxClaims) {
        claimError("MAX_CLAIMS", "Offer has reached max claims", 409);
      }

      let inserted = false;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        campaignCode = generateCampaignCode();
        matchId = crypto.randomUUID();
        const insertedRows = await tx
          .insert(matches)
          .values({
            id: matchId,
            offerId: offer.id,
            creatorId: creator.id,
            status,
            campaignCode,
            acceptedAt: shouldAutoAccept ? now : null,
            createdAt: now,
          })
          .onConflictDoNothing()
          .returning({ id: matches.id });
        if (insertedRows[0]) {
          inserted = true;
          break;
        }
      }

      if (!inserted) {
        claimError("CAMPAIGN_CODE_CONFLICT", "Failed to generate campaign code", 500);
      }

      if (shouldAutoAccept) {
        const dueAt = new Date(
          now.getTime() + (offer.deadlineDaysAfterDelivery + 14) * 24 * 60 * 60 * 1000,
        );
        dueAtIso = dueAt.toISOString();
        await tx.insert(deliverables).values({
          id: crypto.randomUUID(),
          matchId,
          status: "DUE",
          expectedType: offer.deliverableType,
          dueAt,
        });
      }
    });

    let discountCreated = false;
    let orderCreated = false;
    if (shouldAutoAccept) {
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

      if (store && offer.deliverableType !== "UGC_ONLY") {
        try {
          const percent = Number(process.env.DEFAULT_CREATOR_DISCOUNT_PERCENT ?? "10");
          const token = decryptSecret(store.accessTokenEncrypted);

          const created = await createDiscountForMatch({
            shopDomain: store.shopDomain,
            accessToken: token,
            code: campaignCode,
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

          discountCreated = true;
        } catch {
          discountCreated = false;
        }
      }

      if (store && offerProductRows.length) {
        try {
          await ensureShopifyOrderForMatch(matchId);
          orderCreated = true;
        } catch {
          orderCreated = false;
        }
      }

      if (needsManualShipment) {
        try {
          await ensureManualShipmentForMatch(matchId);
        } catch {
          // ignore manual shipment failures
        }
      }

      try {
        if (creator.email || creator.phone) {
          const brandRows = await db
            .select({ name: brands.name })
            .from(brands)
            .where(eq(brands.id, offer.brandId))
            .limit(1);
          const brandName = brandRows[0]?.name ?? "Brand";

          const payload = {
            brandName,
            offerTitle: offer.title,
            campaignCode,
            shareUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/r/${encodeURIComponent(campaignCode)}`,
          };

          if (creator.email) {
            await enqueueNotification({
              channel: "EMAIL",
              to: creator.email,
              type: "creator_approved",
              payload,
            });
          }
          if (creator.phone && process.env.TWILIO_FROM_NUMBER) {
            await enqueueNotification({ channel: "SMS", to: creator.phone, type: "creator_approved", payload });
          }
          if (creator.phone && process.env.TWILIO_WHATSAPP_FROM) {
            await enqueueNotification({ channel: "WHATSAPP", to: creator.phone, type: "creator_approved", payload });
          }
        }
      } catch {
        // ignore
      }
    }

    return Response.json({
      ok: true,
      match: {
        id: matchId,
        status,
        campaignCode,
        shareUrlPath: `/r/${encodeURIComponent(campaignCode)}`,
        discountCreated,
        orderCreated,
        dueAt: dueAtIso,
      },
    });
  } catch (err) {
    if (err && typeof err === "object" && "status" in err && "code" in err) {
      const status = typeof err.status === "number" ? err.status : 500;
      const code = typeof err.code === "string" ? err.code : "CLAIM_FAILED";
      const message = err instanceof Error ? err.message : "Claim failed";
      return Response.json({ ok: false, error: message, code }, { status });
    }

    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Claim failed" },
      { status: 500 },
    );
  }
}
