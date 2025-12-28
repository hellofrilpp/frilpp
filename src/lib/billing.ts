import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { billingSubscriptions } from "@/db/schema";

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
  const rows = await db
    .select()
    .from(billingSubscriptions)
    .where(
      and(
        eq(billingSubscriptions.subjectType, params.subjectType),
        eq(billingSubscriptions.subjectId, params.subjectId),
        gt(billingSubscriptions.currentPeriodEnd, now),
      ),
    )
    .limit(1);
  const sub = rows[0] ?? null;
  if (!sub) return null;
  if (sub.status !== "ACTIVE" && sub.status !== "TRIALING") return null;
  return sub;
}

export async function hasActiveSubscription(params: {
  subjectType: "BRAND" | "CREATOR";
  subjectId: string;
}) {
  return Boolean(await getActiveSubscription(params));
}

