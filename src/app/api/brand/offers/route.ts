import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { offerProducts, offers, brands } from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";
import { templateToDeliverableType, type OfferTemplateId } from "@/lib/offer-template";
import { USAGE_RIGHTS_SCOPES } from "@/lib/usage-rights";

export const runtime = "nodejs";

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

  try {
    const ctx = await requireBrandContext(request);
    if (ctx instanceof Response) return ctx;

    const input = parsed.data;

    const id = crypto.randomUUID();
    const template = input.template as OfferTemplateId;
    const deliverableType = templateToDeliverableType(template);
    const usageRightsScope =
      input.usageRightsScope ?? (input.usageRightsRequired ? "PAID_ADS_12MO" : undefined);

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
