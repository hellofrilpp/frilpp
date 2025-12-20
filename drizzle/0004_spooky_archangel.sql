CREATE TYPE "public"."shopify_order_status" AS ENUM('PENDING', 'DRAFT_CREATED', 'COMPLETED', 'FULFILLED', 'CANCELED', 'ERROR');--> statement-breakpoint
CREATE TABLE "shopify_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"shop_domain" text NOT NULL,
	"status" "shopify_order_status" DEFAULT 'PENDING' NOT NULL,
	"shopify_draft_order_id" text,
	"shopify_order_id" text,
	"shopify_order_name" text,
	"tracking_number" text,
	"tracking_url" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "full_name" text;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "address1" text;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "address2" text;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "province" text;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "zip" text;--> statement-breakpoint
ALTER TABLE "shopify_orders" ADD CONSTRAINT "shopify_orders_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;