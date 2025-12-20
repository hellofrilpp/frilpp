CREATE TABLE "offer_products" (
	"id" text PRIMARY KEY NOT NULL,
	"offer_id" text NOT NULL,
	"shopify_product_id" text NOT NULL,
	"shopify_variant_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopify_stores" (
	"id" text PRIMARY KEY NOT NULL,
	"brand_id" text NOT NULL,
	"shop_domain" text NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"scopes" text NOT NULL,
	"installed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"uninstalled_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "offer_products" ADD CONSTRAINT "offer_products_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_stores" ADD CONSTRAINT "shopify_stores_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;