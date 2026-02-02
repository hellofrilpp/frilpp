ALTER TYPE "public"."deliverable_status" ADD VALUE 'REPOST_REQUIRED';--> statement-breakpoint
CREATE TABLE "admin_otps" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_creator_favorites" (
	"id" text PRIMARY KEY NOT NULL,
	"brand_id" text NOT NULL,
	"creator_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_brand_favorites" (
	"id" text PRIMARY KEY NOT NULL,
	"creator_id" text NOT NULL,
	"brand_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "rejected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "brand_creator_favorites" ADD CONSTRAINT "brand_creator_favorites_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_creator_favorites" ADD CONSTRAINT "brand_creator_favorites_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_brand_favorites" ADD CONSTRAINT "creator_brand_favorites_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_brand_favorites" ADD CONSTRAINT "creator_brand_favorites_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "brand_creator_favorites_brand_creator_unique" ON "brand_creator_favorites" USING btree ("brand_id","creator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "creator_brand_favorites_creator_brand_unique" ON "creator_brand_favorites" USING btree ("creator_id","brand_id");