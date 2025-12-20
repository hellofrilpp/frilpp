CREATE TABLE "match_discounts" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"shop_domain" text NOT NULL,
	"shopify_price_rule_id" text NOT NULL,
	"shopify_discount_code_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "match_discounts" ADD CONSTRAINT "match_discounts_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;