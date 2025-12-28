import Stripe from "stripe";
import { upsertBillingSubscriptionBySubject } from "@/lib/billing-store";

export const runtime = "nodejs";

function stripeClient() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return null;
  return new Stripe(secret, { apiVersion: "2025-02-24.acacia" });
}

function mapStripeStatus(status: Stripe.Subscription.Status) {
  if (status === "active") return "ACTIVE";
  if (status === "trialing") return "TRIALING";
  if (status === "past_due" || status === "unpaid") return "PAST_DUE";
  if (status === "canceled") return "CANCELED";
  return "INACTIVE";
}

export async function POST(request: Request) {
  const stripe = stripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return Response.json({ ok: false, error: "Stripe webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ ok: false, error: "Missing Stripe signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Invalid signature" },
      { status: 400 },
    );
  }

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const subjectType = sub.metadata?.subjectType;
    const subjectId = sub.metadata?.subjectId;
    const market = sub.metadata?.market === "IN" ? "IN" : "US";
    const planKey = sub.metadata?.planKey || `UNKNOWN_${market}`;
    if (subjectType !== "BRAND" && subjectType !== "CREATOR") {
      return Response.json({ ok: true, ignored: true });
    }
    if (!subjectId) {
      return Response.json({ ok: true, ignored: true });
    }

    await upsertBillingSubscriptionBySubject({
      subjectType,
      subjectId,
      provider: "STRIPE",
      providerCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
      providerSubscriptionId: sub.id,
      status: mapStripeStatus(sub.status),
      market,
      planKey,
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
    });
  }

  return Response.json({ ok: true });
}
