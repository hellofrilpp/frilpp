ALTER TYPE "public"."social_provider" ADD VALUE 'GOOGLE';--> statement-breakpoint
DROP TABLE "match_discounts" CASCADE;--> statement-breakpoint
DROP TABLE "offer_products" CASCADE;--> statement-breakpoint
DROP TABLE "shopify_orders" CASCADE;--> statement-breakpoint
DROP TABLE "shopify_stores" CASCADE;--> statement-breakpoint
DROP TYPE "public"."shopify_order_status";