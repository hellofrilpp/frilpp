ALTER TABLE "brands" ADD COLUMN "address1" text;
ALTER TABLE "brands" ADD COLUMN "address2" text;
ALTER TABLE "brands" ADD COLUMN "city" text;
ALTER TABLE "brands" ADD COLUMN "province" text;
ALTER TABLE "brands" ADD COLUMN "zip" text;
ALTER TABLE "brands" ADD COLUMN "country" text;
ALTER TABLE "brands" ADD COLUMN "lat" double precision;
ALTER TABLE "brands" ADD COLUMN "lng" double precision;

ALTER TABLE "creators" ADD COLUMN "lat" double precision;
ALTER TABLE "creators" ADD COLUMN "lng" double precision;

CREATE TYPE "manual_shipment_status" AS ENUM ('PENDING', 'SHIPPED');

CREATE TABLE "manual_shipments" (
  "id" text PRIMARY KEY,
  "match_id" text NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
  "status" "manual_shipment_status" NOT NULL DEFAULT 'PENDING',
  "carrier" text,
  "tracking_number" text,
  "tracking_url" text,
  "shipped_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "manual_shipments_match_id_unique" ON "manual_shipments" ("match_id");

CREATE TABLE "attributed_refunds" (
  "id" text PRIMARY KEY,
  "match_id" text NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
  "shop_domain" text NOT NULL,
  "shopify_order_id" text NOT NULL,
  "shopify_refund_id" text NOT NULL,
  "currency" text NOT NULL,
  "total_refund_cents" integer NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "attributed_refunds_shopify_refund_unique" ON "attributed_refunds" ("shop_domain", "shopify_refund_id");
