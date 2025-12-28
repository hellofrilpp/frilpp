CREATE TYPE "billing_provider" AS ENUM ('STRIPE', 'RAZORPAY');
--> statement-breakpoint

CREATE TYPE "billing_subject_type" AS ENUM ('BRAND', 'CREATOR');
--> statement-breakpoint

CREATE TYPE "billing_subscription_status" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'INACTIVE');
--> statement-breakpoint

CREATE TABLE "billing_subscriptions" (
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
--> statement-breakpoint

CREATE UNIQUE INDEX "billing_subscriptions_provider_sub_id_unique" ON "billing_subscriptions" ("provider", "provider_subscription_id");
--> statement-breakpoint

CREATE UNIQUE INDEX "billing_subscriptions_subject_unique" ON "billing_subscriptions" ("subject_type", "subject_id");
--> statement-breakpoint

CREATE INDEX "billing_subscriptions_status_idx" ON "billing_subscriptions" ("status");

