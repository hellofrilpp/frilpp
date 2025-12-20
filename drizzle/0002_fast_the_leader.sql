CREATE TABLE "attributed_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"shop_domain" text NOT NULL,
	"shopify_order_id" text NOT NULL,
	"currency" text NOT NULL,
	"total_price_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "link_clicks" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_hash" text,
	"user_agent" text,
	"referer" text
);
--> statement-breakpoint
ALTER TABLE "attributed_orders" ADD CONSTRAINT "attributed_orders_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_clicks" ADD CONSTRAINT "link_clicks_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;