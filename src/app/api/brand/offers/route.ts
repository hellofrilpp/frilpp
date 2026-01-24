import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { offerProducts, offers, brands } from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";
import { templateToDeliverableType, type OfferTemplateId } from "@/lib/offer-template";
import { USAGE_RIGHTS_SCOPES } from "@/lib/usage-rights";
import { hasActiveSubscription } from "@/lib/billing";
import { log } from "@/lib/logger";
import { getDbErrorText, isMigrationSchemaError } from "@/lib/runtime-migrations";
import { coerceDraftMetadata, validatePublishMetadata } from "@/lib/offer-metadata";

export const runtime = "nodejs";
export const maxDuration = 30;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const createOfferSchema = z.object({
  title: z.string().min(3).max(160),
  template: z.enum(["REEL", "FEED", "REEL_PLUS_STORY", "UGC_ONLY"]),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  countriesAllowed: z.array(z.enum(["US", "IN"])).default([]),
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
          usageRightsRequired: offers.usageRightsRequired,
          usageRightsScope: offers.usageRightsScope,
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
      throw new Error("Database schema is out of date");
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
  const timeoutMs = 25_000;
  const startedAt = Date.now();
  let phase:
    | "parse"
    | "auth"
    | "billing"
    | "insert:start"
    | "insert:done"
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

    const input = parsed.data;
    const desiredStatus = input.status ?? "PUBLISHED";

    const t0 = Date.now();
    log("debug", "brand offer create start", { errorId });

    phase = "auth";
    const ctx = await requireBrandContext(request);
    if (ctx instanceof Response) return ctx;

    log("debug", "brand offer create authed", { errorId, ms: Date.now() - t0 });

    const storedMetadata =
      desiredStatus === "PUBLISHED"
        ? (() => {
            const validated = validatePublishMetadata({ raw: input.metadata ?? {} });
            if (!validated.ok) return validated.response;
            return validated.metadata;
          })()
        : coerceDraftMetadata(input.metadata ?? {});
    if (storedMetadata instanceof Response) return storedMetadata;

    const radiusKm = (() => {
      if (!storedMetadata || typeof storedMetadata !== "object") return null;
      const raw = (storedMetadata as Record<string, unknown>).locationRadiusKm;
      return typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : null;
    })();
    if (radiusKm) {
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
            error: "Please add your brand location in Settings before creating campaigns.",
            code: "NEEDS_LOCATION",
          },
          { status: 409 },
        );
      }
    }

    if (desiredStatus === "PUBLISHED") {
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
    }

    const id = crypto.randomUUID();
    const template = input.template as OfferTemplateId;
    const deliverableType = templateToDeliverableType(template);
    const usageRightsScope =
      input.usageRightsScope ??
      (input.usageRightsRequired ? "PAID_ADS_12MO" : undefined);

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
          status: desiredStatus,
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
          publishedAt: desiredStatus === "PUBLISHED" ? new Date() : null,
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
      return Response.json(
        {
          ok: false,
          error: "Database schema is out of date; migrations must be applied out-of-band.",
          code: "DB_SCHEMA_OUT_OF_DATE",
          errorId,
        },
        { status: 500 },
      );
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
