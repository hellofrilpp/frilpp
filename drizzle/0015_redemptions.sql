CREATE TYPE "redemption_channel" AS ENUM ('IN_STORE', 'ONLINE', 'OTHER');
--> statement-breakpoint

CREATE TABLE "redemptions" (
  "id" text PRIMARY KEY,
  "match_id" text NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
  "channel" "redemption_channel" NOT NULL DEFAULT 'IN_STORE',
  "amount_cents" integer NOT NULL,
  "currency" text NOT NULL DEFAULT 'USD',
  "note" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX "redemptions_match_id_created_at_idx" ON "redemptions" ("match_id", "created_at");
