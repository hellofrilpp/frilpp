import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { billingSubscriptions, brands, creators } from "@/db/schema";
import { ensureBillingSchema } from "@/lib/billing-schema";
import { planKeyFor } from "@/lib/billing";
import { upsertBillingSubscriptionBySubject } from "@/lib/billing-store";

export const runtime = "nodejs";

const querySchema = z.object({
  secret: z.string().min(1),
  force: z
    .enum(["1", "true"])
    .optional()
    .transform((v) => v === "1" || v === "true"),
});

function inferMarketFromBrandCountries(countriesDefault: string[] | null | undefined) {
  const list = (countriesDefault ?? []).map((c) => c.toUpperCase());
  if (list.length === 1 && list[0] === "IN") return "IN" as const;
  return "US" as const;
}

function inferMarketFromCreatorCountry(country: string | null | undefined) {
  return country?.toUpperCase() === "IN" ? ("IN" as const) : ("US" as const);
}

function isSeedSubscription(providerSubscriptionId: string | null | undefined) {
  if (!providerSubscriptionId) return false;
  return providerSubscriptionId.startsWith("dev_") || providerSubscriptionId.startsWith("seed_");
}

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json({ ok: false, error: "DATABASE_URL is not configured" }, { status: 500 });
  }

  const secret = process.env.DEV_IMPERSONATE_SECRET;
  if (!secret) {
    return Response.json(
      { ok: false, error: "DEV_IMPERSONATE_SECRET is not configured" },
      { status: 404 },
    );
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    secret: url.searchParams.get("secret"),
    force: url.searchParams.get("force") ?? undefined,
  });
  if (!parsed.success || parsed.data.secret !== secret) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  await ensureBillingSchema();

  const now = new Date();
  const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  const result = {
    ok: true as const,
    brand: { updated: 0, skipped: 0 },
    creator: { updated: 0, skipped: 0 },
    forced: parsed.data.force,
  };

  const brandRows = await db
    .select({ id: brands.id, countriesDefault: brands.countriesDefault })
    .from(brands)
    .limit(10_000);

  for (const brand of brandRows) {
    const existing = await db
      .select({
        status: billingSubscriptions.status,
        currentPeriodEnd: billingSubscriptions.currentPeriodEnd,
        providerSubscriptionId: billingSubscriptions.providerSubscriptionId,
      })
      .from(billingSubscriptions)
      .where(and(eq(billingSubscriptions.subjectType, "BRAND"), eq(billingSubscriptions.subjectId, brand.id)))
      .limit(1);

    const row = existing[0] ?? null;
    const active =
      row?.status &&
      (row.status === "ACTIVE" || row.status === "TRIALING") &&
      (row.currentPeriodEnd ? row.currentPeriodEnd > now : false);

    if (active) {
      result.brand.skipped += 1;
      continue;
    }

    if (row && !parsed.data.force && !isSeedSubscription(row.providerSubscriptionId)) {
      result.brand.skipped += 1;
      continue;
    }

    const market = inferMarketFromBrandCountries(brand.countriesDefault);
    const provider = market === "IN" ? "RAZORPAY" : "STRIPE";

    await upsertBillingSubscriptionBySubject({
      subjectType: "BRAND",
      subjectId: brand.id,
      provider,
      providerCustomerId: `seed_${brand.id}`,
      providerSubscriptionId: `seed_${provider}_BRAND_${brand.id}`,
      status: "ACTIVE",
      market,
      planKey: planKeyFor("brand", market),
      cancelAtPeriodEnd: false,
      currentPeriodEnd: farFuture,
    });

    result.brand.updated += 1;
  }

  const creatorRows = await db
    .select({ id: creators.id, country: creators.country })
    .from(creators)
    .limit(10_000);

  for (const creator of creatorRows) {
    const existing = await db
      .select({
        status: billingSubscriptions.status,
        currentPeriodEnd: billingSubscriptions.currentPeriodEnd,
        providerSubscriptionId: billingSubscriptions.providerSubscriptionId,
      })
      .from(billingSubscriptions)
      .where(
        and(
          eq(billingSubscriptions.subjectType, "CREATOR"),
          eq(billingSubscriptions.subjectId, creator.id),
        ),
      )
      .limit(1);

    const row = existing[0] ?? null;
    const active =
      row?.status &&
      (row.status === "ACTIVE" || row.status === "TRIALING") &&
      (row.currentPeriodEnd ? row.currentPeriodEnd > now : false);

    if (active) {
      result.creator.skipped += 1;
      continue;
    }

    if (row && !parsed.data.force && !isSeedSubscription(row.providerSubscriptionId)) {
      result.creator.skipped += 1;
      continue;
    }

    const market = inferMarketFromCreatorCountry(creator.country);
    const provider = market === "IN" ? "RAZORPAY" : "STRIPE";

    await upsertBillingSubscriptionBySubject({
      subjectType: "CREATOR",
      subjectId: creator.id,
      provider,
      providerCustomerId: `seed_${creator.id}`,
      providerSubscriptionId: `seed_${provider}_CREATOR_${creator.id}`,
      status: "ACTIVE",
      market,
      planKey: planKeyFor("creator", market),
      cancelAtPeriodEnd: false,
      currentPeriodEnd: farFuture,
    });

    result.creator.updated += 1;
  }

  return Response.json(result);
}
