import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { billingSubscriptions } from "@/db/schema";
import { ensureBillingSchema } from "@/lib/billing-schema";

export type BillingMarket = "US" | "IN";
export type BillingLane = "brand" | "creator";

export function marketFromRequest(request: Request): BillingMarket {
  const raw =
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("x-country-code") ||
    request.headers.get("cf-ipcountry") ||
    request.headers.get("x-geo-country") ||
    "";
  return raw.trim().toUpperCase() === "IN" ? "IN" : "US";
}

export function planKeyFor(lane: BillingLane, market: BillingMarket) {
  return `${lane.toUpperCase()}_${market}` as const;
}

export async function getActiveSubscription(params: {
  subjectType: "BRAND" | "CREATOR";
  subjectId: string;
}) {
  const now = new Date();
  let rows: Array<typeof billingSubscriptions.$inferSelect> = [];
  try {
    rows = await db
      .select()
      .from(billingSubscriptions)
      .where(
        and(
          eq(billingSubscriptions.subjectType, params.subjectType),
          eq(billingSubscriptions.subjectId, params.subjectId),
        ),
      )
      .limit(1);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const causeMessage =
      err && typeof err === "object" && "cause" in err && err.cause instanceof Error
        ? err.cause.message
        : "";
    const combined = `${message} ${causeMessage}`.toLowerCase();
    if (combined.includes("billing_subscriptions") && combined.includes("does not exist")) {
      await ensureBillingSchema();
      rows = await db
        .select()
        .from(billingSubscriptions)
        .where(
          and(
            eq(billingSubscriptions.subjectType, params.subjectType),
            eq(billingSubscriptions.subjectId, params.subjectId),
          ),
        )
        .limit(1);
    } else {
      throw err;
    }
  }
  const sub = rows[0] ?? null;
  if (!sub) return null;
  if (sub.status !== "ACTIVE" && sub.status !== "TRIALING") return null;
  if (sub.currentPeriodEnd && sub.currentPeriodEnd <= now) return null;
  return sub;
}

export async function hasActiveSubscription(params: {
  subjectType: "BRAND" | "CREATOR";
  subjectId: string;
}) {
  return Boolean(await getActiveSubscription(params));
}
