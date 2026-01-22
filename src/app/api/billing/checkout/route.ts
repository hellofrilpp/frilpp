import Stripe from "stripe";
import { z } from "zod";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { requireBrandContext, requireCreatorContext, getSessionUser } from "@/lib/auth";
import { marketFromRequest, planKeyFor, type BillingLane } from "@/lib/billing";
import { upsertBillingSubscriptionBySubject } from "@/lib/billing-store";
import { fetchWithTimeout } from "@/lib/http";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

const bodySchema = z.object({
  lane: z.enum(["brand", "creator"]),
  provider: z.enum(["STRIPE", "RAZORPAY"]).optional(),
});

function getOrigin(request: Request) {
  const url = new URL(request.url);
  return process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
}

function stripeClient() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return null;
  return new Stripe(secret, { apiVersion: "2025-02-24.acacia" });
}

function stripePriceIdFor(lane: BillingLane) {
  return lane === "brand" ? process.env.STRIPE_PRICE_US_BRAND : process.env.STRIPE_PRICE_US_CREATOR;
}

function razorpayPlanIdFor(lane: BillingLane) {
  return lane === "brand" ? process.env.RAZORPAY_PLAN_IN_BRAND : process.env.RAZORPAY_PLAN_IN_CREATOR;
}

async function createRazorpaySubscription(params: {
  lane: BillingLane;
  subjectType: "BRAND" | "CREATOR";
  subjectId: string;
  market: "US" | "IN";
  planKey: string;
  customerEmail: string;
}) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const planId = razorpayPlanIdFor(params.lane);
  if (!keyId || !keySecret || !planId) {
    return { ok: false as const, error: "Razorpay is not configured" };
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetchWithTimeout("https://api.razorpay.com/v1/subscriptions", {
    method: "POST",
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      plan_id: planId,
      total_count: 120,
      quantity: 1,
      customer_notify: 1,
      notes: {
        subjectType: params.subjectType,
        subjectId: params.subjectId,
        market: params.market,
        planKey: params.planKey,
        customerEmail: params.customerEmail,
      },
    }),
    timeoutMs: 10_000,
  });

  const json = (await res.json().catch(() => null)) as unknown;
  const id =
    json && typeof json === "object" && "id" in json && typeof (json as { id: unknown }).id === "string"
      ? (json as { id: string }).id
      : null;
  const shortUrl =
    json &&
    typeof json === "object" &&
    "short_url" in json &&
    typeof (json as { short_url: unknown }).short_url === "string"
      ? (json as { short_url: string }).short_url
      : null;

  if (!res.ok || !id) {
    return { ok: false as const, error: "Failed to create Razorpay subscription" };
  }

  if (!shortUrl) {
    return { ok: false as const, error: "Razorpay subscription missing short_url" };
  }

  await upsertBillingSubscriptionBySubject({
    subjectType: params.subjectType,
    subjectId: params.subjectId,
    provider: "RAZORPAY",
    providerCustomerId: null,
    providerSubscriptionId: id,
    status: "INACTIVE",
    market: "IN",
    planKey: params.planKey,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
  });

  return { ok: true as const, checkoutUrl: shortUrl };
}

type BillingProvider = "STRIPE" | "RAZORPAY";
type BillingProviderMode = "AUTO" | BillingProvider;

function billingProviderMode(): BillingProviderMode {
  const raw = (process.env.BILLING_PROVIDER_MODE ?? "").trim().toUpperCase();
  if (raw === "STRIPE" || raw === "RAZORPAY") return raw;
  return "AUTO";
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const lane = parsed.data.lane;
  const requestedProvider = parsed.data.provider ?? null;
  const origin = getOrigin(request);

  const session = await getSessionUser(request);
  if (!session) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email;
  if (!email) {
    return Response.json(
      { ok: false, error: "Email required to start billing.", code: "EMAIL_REQUIRED" },
      { status: 409 },
    );
  }

  if (lane === "brand") {
    const ctx = await requireBrandContext(request);
    if (ctx instanceof Response) return ctx;
    const brandId = ctx.brandId;

    const brandRow = await db
      .select({ country: brands.country })
      .from(brands)
      .where(eq(brands.id, brandId))
      .limit(1);
    const brandCountry = (brandRow[0]?.country ?? "").toUpperCase();

    const market = brandCountry === "IN" ? "IN" : marketFromRequest(request);
    const planKey = planKeyFor(lane, market);

    const mode = billingProviderMode();
    const provider: BillingProvider =
      requestedProvider ?? (mode === "AUTO" ? (market === "US" ? "STRIPE" : "RAZORPAY") : mode);

    if (provider === "STRIPE") {
      const stripe = stripeClient();
      const priceId = stripePriceIdFor(lane);
      if (!stripe || !priceId) {
        return Response.json({ ok: false, error: "Stripe is not configured" }, { status: 500 });
      }
      const checkout = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/billing/success?lane=brand`,
        cancel_url: `${origin}/billing/cancel?lane=brand`,
        customer_email: email,
        subscription_data: {
          metadata: { subjectType: "BRAND", subjectId: brandId, market, planKey },
        },
        metadata: { subjectType: "BRAND", subjectId: brandId, market, planKey },
      });
      if (!checkout.url) {
        return Response.json({ ok: false, error: "Stripe checkout unavailable" }, { status: 500 });
      }
      return Response.json({ ok: true, provider: "STRIPE", checkoutUrl: checkout.url });
    }

    const rp = await createRazorpaySubscription({
      lane,
      subjectType: "BRAND",
      subjectId: brandId,
      market,
      planKey,
      customerEmail: email,
    });
    if (!rp.ok) return Response.json({ ok: false, error: rp.error }, { status: 500 });
    return Response.json({ ok: true, provider: "RAZORPAY", checkoutUrl: rp.checkoutUrl });
  }

  const creatorCtx = await requireCreatorContext(request);
  if (creatorCtx instanceof Response) return creatorCtx;
  const creatorId = creatorCtx.creator.id;
  const creatorCountry = (creatorCtx.creator.country ?? "").toUpperCase();
  const market = creatorCountry === "IN" ? "IN" : marketFromRequest(request);
  const planKey = planKeyFor(lane, market);

  const mode = billingProviderMode();
  const provider: BillingProvider =
    requestedProvider ?? (mode === "AUTO" ? (market === "US" ? "STRIPE" : "RAZORPAY") : mode);

  if (provider === "STRIPE") {
    const stripe = stripeClient();
    const priceId = stripePriceIdFor(lane);
    if (!stripe || !priceId) {
      return Response.json({ ok: false, error: "Stripe is not configured" }, { status: 500 });
    }
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/billing/success?lane=creator`,
      cancel_url: `${origin}/billing/cancel?lane=creator`,
      customer_email: email,
      subscription_data: {
        metadata: { subjectType: "CREATOR", subjectId: creatorId, market, planKey },
      },
      metadata: { subjectType: "CREATOR", subjectId: creatorId, market, planKey },
    });
    if (!checkout.url) {
      return Response.json({ ok: false, error: "Stripe checkout unavailable" }, { status: 500 });
    }
    return Response.json({ ok: true, provider: "STRIPE", checkoutUrl: checkout.url });
  }

  const rp = await createRazorpaySubscription({
    lane,
    subjectType: "CREATOR",
    subjectId: creatorId,
    market,
    planKey,
    customerEmail: email,
  });
  if (!rp.ok) return Response.json({ ok: false, error: rp.error }, { status: 500 });
  return Response.json({ ok: true, provider: "RAZORPAY", checkoutUrl: rp.checkoutUrl });
}
