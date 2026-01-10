import { sql } from "drizzle-orm";
import { db } from "@/db";

let ensured = false;

export async function ensureBillingSchema() {
  if (ensured) return;

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "billing_provider" AS ENUM ('STRIPE', 'RAZORPAY');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "billing_subject_type" AS ENUM ('BRAND', 'CREATOR');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "billing_subscription_status" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'INACTIVE');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "billing_subscriptions" (
      "id" text PRIMARY KEY,
      "subject_type" "billing_subject_type" NOT NULL,
      "subject_id" text NOT NULL,
      "provider" "billing_provider" NOT NULL,
      "provider_customer_id" text,
      "provider_subscription_id" text NOT NULL,
      "status" "billing_subscription_status" NOT NULL DEFAULT 'INACTIVE',
      "market" text NOT NULL DEFAULT 'US',
      "plan_key" text NOT NULL,
      "cancel_at_period_end" boolean NOT NULL DEFAULT false,
      "current_period_end" timestamp with time zone,
      "created_at" timestamp with time zone NOT NULL DEFAULT now(),
      "updated_at" timestamp with time zone NOT NULL DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "billing_subscriptions_provider_sub_id_unique"
    ON "billing_subscriptions" ("provider", "provider_subscription_id");
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "billing_subscriptions_subject_unique"
    ON "billing_subscriptions" ("subject_type", "subject_id");
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "billing_subscriptions_status_idx"
    ON "billing_subscriptions" ("status");
  `);

  ensured = true;
}

