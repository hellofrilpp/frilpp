import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { offerProducts, offers, brands } from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";
import { templateToDeliverableType, type OfferTemplateId } from "@/lib/offer-template";
import { USAGE_RIGHTS_SCOPES } from "@/lib/usage-rights";
import { hasActiveSubscription } from "@/lib/billing";
import { log } from "@/lib/logger";
import {
  ensureRuntimeMigrations,
  getDbErrorText,
  isMigrationSchemaError,
} from "@/lib/runtime-migrations";
import {
  CAMPAIGN_CATEGORIES,
  CONTENT_TYPES,
  CREATOR_CATEGORIES,
  PLATFORMS_BY_COUNTRY,
  REGION_OPTIONS,
  platformsForCountries,
} from "@/lib/picklists";

export const runtime = "nodejs";
export const maxDuration = 60;

const milesToKm = (miles: number) => miles * 1.609344;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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
    manualFulfillmentMethod: z.enum(["PICKUP", "LOCAL_DELIVERY"]).nullable().optional(),
    manualFulfillmentNotes: z.string().trim().max(300).nullable().optional(),
    // Local radius is stored in kilometers (preferred). `locationRadiusMiles` is accepted for backward compatibility.
    locationRadiusKm: z.number().min(1).max(8000).nullable().optional(),
    locationRadiusMiles: z.number().min(1).max(5000).nullable().optional(),
    ctaUrl: z.string().trim().max(800).url().nullable().optional(),
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

    const run = async () =>
      db
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

    let rows;
    try {
      rows = await run();
    } catch (err) {
      if (!isMigrationSchemaError(err)) throw err;
      await ensureRuntimeMigrations();
      rows = await run();
    }

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
    const errorId = crypto.randomUUID();
    log("error", "brand offers GET failed", { errorId, error: getDbErrorText(err) });
    return Response.json(
      { ok: false, error: "Failed to load offers", errorId },
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

  const errorId = crypto.randomUUID();
  const timeoutMs = 55_000;
  const startedAt = Date.now();
  let phase:
    | "parse"
    | "auth"
    | "billing"
    | "insert:start"
    | "insert:done"
    | "migrate"
    | "insert:retry"
    | "done" = "parse";

  const main = async () => {
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
    const radiusKm = (() => {
      const km = metadata.locationRadiusKm;
      if (typeof km === "number" && Number.isFinite(km) && km > 0) return km;
      const miles = metadata.locationRadiusMiles;
      if (typeof miles === "number" && Number.isFinite(miles) && miles > 0) return milesToKm(miles);
      return null;
    })();

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

    const t0 = Date.now();
    log("debug", "brand offer create start", { errorId });

    phase = "auth";
    const ctx = await requireBrandContext(request);
    if (ctx instanceof Response) return ctx;

    log("debug", "brand offer create authed", { errorId, ms: Date.now() - t0 });

    phase = "billing";
    const subscribed = await hasActiveSubscription({
      subjectType: "BRAND",
      subjectId: ctx.brandId,
    });
    log("debug", "brand offer create subscription checked", { errorId, ms: Date.now() - t0 });

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

    const id = crypto.randomUUID();
    const template = input.template as OfferTemplateId;
    const deliverableType = templateToDeliverableType(template);
    const usageRightsScope =
      input.usageRightsScope ??
      (input.usageRightsRequired ? "PAID_ADS_12MO" : undefined);

    const storedMetadata: Record<string, unknown> = {
      ...metadata,
      locationRadiusKm: radiusKm,
    };
    delete storedMetadata.locationRadiusMiles;

    const runInsert = async () => {
      phase = "insert:start";
      await db.transaction(async (tx) => {
        // Production safety: if migrations/another writer holds a lock, fail fast instead of hanging
        // until the platform times out.
        await tx.execute(sql`set local lock_timeout = '3s'`);
        await tx.execute(sql`set local statement_timeout = '10s'`);

        await tx.insert(offers).values({
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
          metadata: storedMetadata,
          publishedAt: new Date(),
        });

        if (input.products.length) {
          await tx.insert(offerProducts).values(
            input.products.map((p) => ({
              id: crypto.randomUUID(),
              offerId: id,
              shopifyProductId: p.shopifyProductId,
              shopifyVariantId: p.shopifyVariantId,
              quantity: p.quantity,
            })),
          );
        }
      });
      phase = "insert:done";
    };

    try {
      await runInsert();
    } catch (err) {
      if (!isMigrationSchemaError(err)) throw err;

      phase = "migrate";
      const mig = await ensureRuntimeMigrations({ maxWaitMs: 5_000 });
      if (!mig.ok && mig.code === "NO_DIRECT_CONNECTION") {
        return Response.json(
          {
            ok: false,
            error:
              "Database migrations need a direct Postgres connection. Set POSTGRES_URL_NON_POOLING on Vercel and run pnpm db:migrate.",
            code: "DB_MIGRATION_NO_DIRECT",
            errorId,
          },
          { status: 500 },
        );
      }
      if (!mig.ok && mig.code === "LOCK_UNAVAILABLE") {
        return Response.json(
          {
            ok: false,
            error: "Deploy migrations are still running; retry in a moment.",
            code: "DB_MIGRATION_BUSY",
            errorId,
          },
          { status: 503 },
        );
      }
      if (!mig.ok && mig.code === "MIGRATE_FAILED") {
        return Response.json(
          {
            ok: false,
            error: "Database migration failed; run pnpm db:migrate and retry.",
            code: "DB_MIGRATION_FAILED",
            errorId,
          },
          { status: 500 },
        );
      }

      phase = "insert:retry";
      await runInsert();
    }

    log("debug", "brand offer create inserted", { errorId, ms: Date.now() - t0 });
    phase = "done";
    return Response.json({ ok: true, offerId: id });
  };

  try {
    return await Promise.race([
      main(),
      sleep(timeoutMs).then(() =>
        (() => {
          const elapsedMs = Date.now() - startedAt;
          log("error", "brand offer create timed out", { errorId, phase, elapsedMs });
          return Response.json(
            { ok: false, error: "Request timed out", code: "REQUEST_TIMEOUT", errorId, phase, elapsedMs },
            { status: 504 },
          );
        })(),
      ),
    ]);
  } catch (err) {
    log("error", "brand offer create failed", { errorId, phase, error: getDbErrorText(err) });
    const causeMessage =
      err && typeof err === "object" && "cause" in err && err.cause instanceof Error
        ? err.cause.message
        : null;
    const message = isMigrationSchemaError(err)
      ? "Database schema is out of date; run pnpm db:migrate and retry."
      : causeMessage ?? "Failed to launch campaign";
    return Response.json({ ok: false, error: message, errorId }, { status: 500 });
  }
}
