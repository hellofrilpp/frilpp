ALTER TABLE "matches" ADD COLUMN "rejection_reason" text;
ALTER TABLE "matches" ADD COLUMN "rejected_at" timestamptz;

CREATE TABLE "brand_creator_favorites" (
  "id" text PRIMARY KEY NOT NULL,
  "brand_id" text NOT NULL REFERENCES "brands"("id") ON DELETE cascade,
  "creator_id" text NOT NULL REFERENCES "creators"("id") ON DELETE cascade,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "brand_creator_favorites_brand_creator_unique" ON "brand_creator_favorites" ("brand_id", "creator_id");

CREATE TABLE "creator_brand_favorites" (
  "id" text PRIMARY KEY NOT NULL,
  "creator_id" text NOT NULL REFERENCES "creators"("id") ON DELETE cascade,
  "brand_id" text NOT NULL REFERENCES "brands"("id") ON DELETE cascade,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "creator_brand_favorites_creator_brand_unique" ON "creator_brand_favorites" ("creator_id", "brand_id");
