CREATE TABLE IF NOT EXISTS "creator_offer_rejections" (
  "id" text PRIMARY KEY,
  "creator_id" text NOT NULL REFERENCES "creators"("id") ON DELETE CASCADE,
  "offer_id" text NOT NULL REFERENCES "offers"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "creator_offer_rejections_creator_offer_unique"
  ON "creator_offer_rejections" ("creator_id", "offer_id");
