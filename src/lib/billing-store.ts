import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { billingSubscriptions } from "@/db/schema";
import { ensureBillingSchema } from "@/lib/billing-schema";

export type BillingSubscriptionUpsert = {
  subjectType: "BRAND" | "CREATOR";
  subjectId: string;
  provider: "STRIPE" | "RAZORPAY";
  providerCustomerId: string | null;
  providerSubscriptionId: string;
  status: "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "INACTIVE";
  market: "US" | "IN";
  planKey: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
};

export async function upsertBillingSubscriptionBySubject(input: BillingSubscriptionUpsert) {
  const now = new Date();
  let existing: Array<{ id: string }> = [];
  try {
    existing = await db
      .select({ id: billingSubscriptions.id })
      .from(billingSubscriptions)
      .where(
        and(
          eq(billingSubscriptions.subjectType, input.subjectType),
          eq(billingSubscriptions.subjectId, input.subjectId),
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
      existing = await db
        .select({ id: billingSubscriptions.id })
        .from(billingSubscriptions)
        .where(
          and(
            eq(billingSubscriptions.subjectType, input.subjectType),
            eq(billingSubscriptions.subjectId, input.subjectId),
          ),
        )
        .limit(1);
    } else {
      throw err;
    }
  }
  const row = existing[0] ?? null;
  const values = {
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    provider: input.provider,
    providerCustomerId: input.providerCustomerId,
    providerSubscriptionId: input.providerSubscriptionId,
    status: input.status,
    market: input.market,
    planKey: input.planKey,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    currentPeriodEnd: input.currentPeriodEnd,
    updatedAt: now,
  } as const;

  if (!row) {
    await db.insert(billingSubscriptions).values({
      id: crypto.randomUUID(),
      ...values,
      createdAt: now,
    });
    return;
  }

  await db.update(billingSubscriptions).set(values).where(eq(billingSubscriptions.id, row.id));
}
