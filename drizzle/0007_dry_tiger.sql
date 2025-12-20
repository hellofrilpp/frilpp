CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	PRIMARY KEY ("key","window_start")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tos_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "privacy_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ig_data_access_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "attributed_orders" ADD CONSTRAINT "attributed_orders_shop_order_unique" UNIQUE("shop_domain","shopify_order_id");
