import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { offerProducts, offers, brands } from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";
import { templateToDeliverableType, type OfferTemplateId } from "@/lib/offer-template";
import { USAGE_RIGHTS_SCOPES } from "@/lib/usage-rights";
import {
  CAMPAIGN_CATEGORIES,
  CONTENT_TYPES,
  CREATOR_CATEGORIES,
  PLATFORMS_BY_COUNTRY,
  REGION_OPTIONS,
  platformsForCountries,
} from "@/lib/picklists";

export const runtime = "nodejs";

const metadataSchema = z
  .object({
    productValue: z.number().min(0).max(1_000_000).nullable().optional(),
    category: z.enum(CAMPAIGN_CATEGORIES).nullable().optional(),
    categoryOther: z.string().trim().min(2).max(64).nullable().optional(),
    description: z.string().trim().max(800).nullable().optional(),
    platforms: z.array(z.enum(PLATFORMS_BY_COUNTRY.US)).max(6).optional().default([]),
    platformOther: z.string().trim().min(2).max(64).nullable().optional(),
    contentTypes: z.array(z.enum(CONTENT_TYPES)).max(6).optional().default([]),
    contentTypeOther: z.string().trim().min(2).max(64).nullable().optional(),
    hashtags: z.string().trim().max(200).nullable().optional(),
    guidelines: z.string().trim().max(800).nullable().optional(),
    niches: z.array(z.enum(CREATOR_CATEGORIES)).max(8).optional().default([]),
    nicheOther: z.string().trim().min(2).max(64).nullable().optional(),
    region: z.enum(REGION_OPTIONS).nullable().optional(),
    campaignName: z.string().trim().max(160).nullable().optional(),
    fulfillmentType: z.enum(["SHOPIFY", "MANUAL"]).nullable().optional(),
    locationRadiusMiles: z.number().min(1).max(5000).nullable().optional(),
    presetId: z.string().trim().max(40).nullable().optional(),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    if (data.category === "OTHER" && !data.categoryOther) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["categoryOther"],
        message: "categoryOther is required when category is OTHER",
      });
    }
    if (data.category !== "OTHER" && data.categoryOther) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["categoryOther"],
        message: "categoryOther is only allowed when category is OTHER",
      });
    }
    const platforms = data.platforms ?? [];
    if (platforms.includes("OTHER") && !data.platformOther) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["platformOther"],
        message: "platformOther is required when platforms include OTHER",
      });
    }
    if (!platforms.includes("OTHER") && data.platformOther) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["platformOther"],
        message: "platformOther is only allowed when platforms include OTHER",
      });
    }
    const contentTypes = data.contentTypes ?? [];
    if (contentTypes.includes("OTHER") && !data.contentTypeOther) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contentTypeOther"],
        message: "contentTypeOther is required when contentTypes include OTHER",
      });
    }
    if (!contentTypes.includes("OTHER") && data.contentTypeOther) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contentTypeOther"],
        message: "contentTypeOther is only allowed when contentTypes include OTHER",
      });
    }
    const niches = data.niches ?? [];
    if (niches.includes("OTHER") && !data.nicheOther) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nicheOther"],
        message: "nicheOther is required when niches include OTHER",
      });
    }
    if (!niches.includes("OTHER") && data.nicheOther) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nicheOther"],
        message: "nicheOther is only allowed when niches include OTHER",
      });
    }
  });

const createOfferSchema = z.object({
  title: z.string().min(3).max(160),
  template: z.enum(["REEL", "FEED", "REEL_PLUS_STORY", "UGC_ONLY"]),
  countriesAllowed: z.array(z.enum(["US", "IN"])).min(1),
  maxClaims: z.number().int().min(1).max(10000),
  deadlineDaysAfterDelivery: z.number().int().min(1).max(365),
  followersThreshold: z.number().int().min(0).max(100_000_000),
  aboveThresholdAutoAccept: z.boolean(),
  usageRightsRequired: z.boolean().optional().default(false),
  usageRightsScope: z.enum(USAGE_RIGHTS_SCOPES).optional(),
  products: z
    .array(
      z.object({
        shopifyProductId: z.string().min(1),
        shopifyVariantId: z.string().min(1),
        quantity: z.number().int().min(1).max(100).default(1),
      }),
    )
    .optional()
    .default([]),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  try {
    const ctx = await requireBrandContext(request);
    if (ctx instanceof Response) return ctx;

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
        acceptanceFollowersThreshold: offers.acceptanceFollowersThreshold,
        acceptanceAboveThresholdAutoAccept: offers.acceptanceAboveThresholdAutoAccept,
        metadata: offers.metadata,
        publishedAt: offers.publishedAt,
        createdAt: offers.createdAt,
        updatedAt: offers.updatedAt,
        brandName: brands.name,
      })
      .from(offers)
      .innerJoin(brands, eq(brands.id, offers.brandId))
      .where(eq(offers.brandId, ctx.brandId))
      .orderBy(desc(offers.createdAt))
      .limit(100);

    return Response.json({
      ok: true,
      offers: rows.map((r) => ({
        ...r,
        publishedAt: r.publishedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "DB error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = createOfferSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const metadataParsed = metadataSchema.safeParse(parsed.data.metadata ?? {});
  if (!metadataParsed.success) {
    return Response.json(
      { ok: false, error: "Invalid metadata", issues: metadataParsed.error.issues },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const metadata = metadataParsed.data;

  const allowedPlatforms = platformsForCountries(input.countriesAllowed);
  const invalidPlatforms = (metadata.platforms ?? []).filter(
    (platform) => !allowedPlatforms.includes(platform),
  );
  if (invalidPlatforms.length) {
    return Response.json(
      {
        ok: false,
        error: "Platforms not allowed for selected countries",
        issues: invalidPlatforms.map((platform) => ({ platform })),
      },
      { status: 400 },
    );
  }

  if (metadata.region) {
    const expectedRegion =
      input.countriesAllowed.length === 2
        ? "US_IN"
        : input.countriesAllowed[0] === "IN"
          ? "IN"
          : "US";
    if (metadata.region !== expectedRegion) {
      return Response.json(
        {
          ok: false,
          error: "Region does not match countriesAllowed",
          issues: [{ region: metadata.region, expected: expectedRegion }],
        },
        { status: 400 },
      );
    }
  }

  try {
    const ctx = await requireBrandContext(request);
    if (ctx instanceof Response) return ctx;

    const id = crypto.randomUUID();
    const template = input.template as OfferTemplateId;
    const deliverableType = templateToDeliverableType(template);
    const usageRightsScope =
      input.usageRightsScope ??
      (input.usageRightsRequired ? "PAID_ADS_12MO" : undefined);

    await db.insert(offers).values({
      id,
      brandId: ctx.brandId,
      title: input.title,
      template,
      status: "PUBLISHED",
      countriesAllowed: input.countriesAllowed,
      maxClaims: input.maxClaims,
      deadlineDaysAfterDelivery: input.deadlineDaysAfterDelivery,
      deliverableType,
      requiresCaptionCode: deliverableType !== "UGC_ONLY",
      usageRightsRequired: Boolean(input.usageRightsRequired),
      usageRightsScope: usageRightsScope ?? null,
      acceptanceFollowersThreshold: input.followersThreshold,
      acceptanceAboveThresholdAutoAccept: input.aboveThresholdAutoAccept,
      metadata,
      publishedAt: new Date(),
    });

    if (input.products.length) {
      await db.insert(offerProducts).values(
        input.products.map((p) => ({
          id: crypto.randomUUID(),
          offerId: id,
          shopifyProductId: p.shopifyProductId,
          shopifyVariantId: p.shopifyVariantId,
          quantity: p.quantity,
        })),
      );
    }

    return Response.json({ ok: true, offerId: id });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "DB error" },
      { status: 500 },
    );
  }
}
