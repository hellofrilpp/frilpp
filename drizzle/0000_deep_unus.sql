CREATE TYPE "public"."deliverable_status" AS ENUM('DUE', 'VERIFIED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."deliverable_type" AS ENUM('REELS', 'FEED', 'UGC_ONLY');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('CLAIMED', 'PENDING_APPROVAL', 'ACCEPTED', 'REVOKED', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."offer_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."offer_template" AS ENUM('REEL', 'FEED', 'REEL_PLUS_STORY', 'UGC_ONLY');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"brand_id" text,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"data" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"countries_default" text[] NOT NULL,
	"acceptance_followers_threshold" integer DEFAULT 5000 NOT NULL,
	"acceptance_above_threshold_auto_accept" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creators" (
	"id" text PRIMARY KEY NOT NULL,
	"ig_user_id" text,
	"username" text,
	"followers_count" integer,
	"country" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliverables" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"status" "deliverable_status" NOT NULL,
	"expected_type" "deliverable_type" NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"verified_media_id" text,
	"verified_permalink" text,
	"verified_at" timestamp with time zone,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" text PRIMARY KEY NOT NULL,
	"offer_id" text NOT NULL,
	"creator_id" text NOT NULL,
	"status" "match_status" NOT NULL,
	"campaign_code" text NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" text PRIMARY KEY NOT NULL,
	"brand_id" text NOT NULL,
	"title" text NOT NULL,
	"template" "offer_template" NOT NULL,
	"status" "offer_status" DEFAULT 'DRAFT' NOT NULL,
	"countries_allowed" text[] NOT NULL,
	"max_claims" integer NOT NULL,
	"deadline_days_after_delivery" integer NOT NULL,
	"deliverable_type" "deliverable_type" NOT NULL,
	"requires_caption_code" boolean DEFAULT true NOT NULL,
	"acceptance_followers_threshold" integer NOT NULL,
	"acceptance_above_threshold_auto_accept" boolean NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strikes" (
	"id" text PRIMARY KEY NOT NULL,
	"creator_id" text NOT NULL,
	"match_id" text,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"forgiven_at" timestamp with time zone,
	"forgiven_reason" text
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strikes" ADD CONSTRAINT "strikes_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strikes" ADD CONSTRAINT "strikes_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE set null ON UPDATE no action;