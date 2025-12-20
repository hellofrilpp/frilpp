ALTER TABLE "matches" ADD CONSTRAINT "matches_campaign_code_unique" UNIQUE("campaign_code");
--> statement-breakpoint
ALTER TABLE "match_discounts" ADD CONSTRAINT "match_discounts_match_id_unique" UNIQUE("match_id");
--> statement-breakpoint
ALTER TABLE "shopify_orders" ADD CONSTRAINT "shopify_orders_match_id_unique" UNIQUE("match_id");
