-- Catch-up migration for production DBs that missed earlier Drizzle journal entries.
-- This migration is intentionally idempotent (IF NOT EXISTS / DO blocks) so it can be
-- applied safely even if some objects were created by runtime schema guards.

ALTER TABLE "offers"
  ADD COLUMN IF NOT EXISTS "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb;
--> statement-breakpoint

ALTER TABLE "creators"
  ADD COLUMN IF NOT EXISTS "categories" text[];
--> statement-breakpoint

ALTER TABLE "creators"
  ADD COLUMN IF NOT EXISTS "categories_other" text;
--> statement-breakpoint

ALTER TABLE "brands"
  ADD COLUMN IF NOT EXISTS "website" text;
--> statement-breakpoint
ALTER TABLE "brands"
  ADD COLUMN IF NOT EXISTS "description" text;
--> statement-breakpoint
ALTER TABLE "brands"
  ADD COLUMN IF NOT EXISTS "industry" text;
--> statement-breakpoint
ALTER TABLE "brands"
  ADD COLUMN IF NOT EXISTS "location" text;
--> statement-breakpoint
ALTER TABLE "brands"
  ADD COLUMN IF NOT EXISTS "logo_url" text;
--> statement-breakpoint
ALTER TABLE "brands"
  ADD COLUMN IF NOT EXISTS "notification_new_match" boolean NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE "brands"
  ADD COLUMN IF NOT EXISTS "notification_content_received" boolean NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE "brands"
  ADD COLUMN IF NOT EXISTS "notification_weekly_digest" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "brands"
  ADD COLUMN IF NOT EXISTS "notification_marketing" boolean NOT NULL DEFAULT false;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "social_provider" AS ENUM ('INSTAGRAM', 'TIKTOK', 'YOUTUBE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TYPE "social_provider" ADD VALUE IF NOT EXISTS 'YOUTUBE';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "user_social_accounts" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "provider" "social_provider" NOT NULL,
  "provider_user_id" text NOT NULL,
  "username" text,
  "access_token_encrypted" text,
  "refresh_token_encrypted" text,
  "expires_at" timestamp with time zone,
  "scopes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "user_social_accounts_provider_user_unique"
  ON "user_social_accounts" ("provider", "provider_user_id");
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "user_social_accounts_user_provider_unique"
  ON "user_social_accounts" ("user_id", "provider");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "pending_social_accounts" (
  "id" text PRIMARY KEY,
  "provider" "social_provider" NOT NULL,
  "provider_user_id" text NOT NULL,
  "username" text,
  "access_token_encrypted" text,
  "refresh_token_encrypted" text,
  "expires_at" timestamp with time zone,
  "scopes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "pending_social_accounts_provider_user_unique"
  ON "pending_social_accounts" ("provider", "provider_user_id");
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "redemption_channel" AS ENUM ('IN_STORE', 'ONLINE', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "redemptions" (
  "id" text PRIMARY KEY,
  "match_id" text NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
  "channel" "redemption_channel" NOT NULL DEFAULT 'IN_STORE',
  "amount_cents" integer NOT NULL,
  "currency" text NOT NULL DEFAULT 'USD',
  "note" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "redemptions_match_id_created_at_idx"
  ON "redemptions" ("match_id", "created_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "cron_locks" (
  "job" text PRIMARY KEY,
  "locked_until" timestamp with time zone NOT NULL,
  "locked_by" text,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
