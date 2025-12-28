import crypto from "node:crypto";
import { upsertBillingSubscriptionBySubject } from "@/lib/billing-store";

export const runtime = "nodejs";

function timingSafeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function mapRazorpayStatus(status: string) {
  const s = status.toLowerCase();
  if (s === "active") return "ACTIVE";
  if (s === "authenticated" || s === "created" || s === "pending") return "INACTIVE";
  if (s === "paused" || s === "halted") return "PAST_DUE";
  if (s === "cancelled" || s === "completed" || s === "expired") return "CANCELED";
  return "INACTIVE";
}

export async function POST(request: Request) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return Response.json({ ok: false, error: "Razorpay webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    return Response.json({ ok: false, error: "Missing Razorpay signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  if (!timingSafeEqual(signature, expected)) {
    return Response.json({ ok: false, error: "Invalid signature" }, { status: 400 });
  }

  const json = JSON.parse(rawBody) as unknown;
  const subscription = (() => {
    if (!json || typeof json !== "object") return null;
    const payload = (json as { payload?: unknown }).payload;
    if (payload && typeof payload === "object") {
      const sub = (payload as { subscription?: unknown }).subscription;
      if (sub && typeof sub === "object") {
        const entity = (sub as { entity?: unknown }).entity;
        if (entity && typeof entity === "object") return entity;
        return sub;
      }
    }
    const topSub = (json as { subscription?: unknown }).subscription;
    return topSub && typeof topSub === "object" ? topSub : null;
  })();
  if (!subscription || typeof subscription !== "object") {
    return Response.json({ ok: true, ignored: true });
  }

  const sub = subscription as Record<string, unknown>;
  const subscriptionId = typeof sub.id === "string" ? sub.id : null;
  if (!subscriptionId) {
    return Response.json({ ok: true, ignored: true });
  }

  const notes =
    sub.notes && typeof sub.notes === "object" ? (sub.notes as Record<string, unknown>) : {};
  const subjectType = notes.subjectType;
  const subjectId = notes.subjectId;
  const market = notes.market === "IN" ? "IN" : "US";
  const planKey = typeof notes.planKey === "string" ? notes.planKey : `UNKNOWN_${market}`;

  if (subjectType !== "BRAND" && subjectType !== "CREATOR") {
    return Response.json({ ok: true, ignored: true });
  }
  if (!subjectId || typeof subjectId !== "string") {
    return Response.json({ ok: true, ignored: true });
  }

  const currentEnd = typeof sub.current_end === "number" ? sub.current_end : null;
  const status = typeof sub.status === "string" ? sub.status : "inactive";

  await upsertBillingSubscriptionBySubject({
    subjectType,
    subjectId,
    provider: "RAZORPAY",
    providerCustomerId: null,
    providerSubscriptionId: subscriptionId,
    status: mapRazorpayStatus(status),
    market,
    planKey,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_cycle_end),
    currentPeriodEnd: currentEnd ? new Date(currentEnd * 1000) : null,
  });

  return Response.json({ ok: true });
}
