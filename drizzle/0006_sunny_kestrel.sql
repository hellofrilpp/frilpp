ALTER TABLE "creator_meta" ADD COLUMN "account_type" text;--> statement-breakpoint
ALTER TABLE "creator_meta" ADD COLUMN "profile_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "creator_meta" ADD COLUMN "profile_error" text;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "usage_rights_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "usage_rights_scope" text;--> statement-breakpoint
ALTER TABLE "deliverables" ADD COLUMN "submitted_notes" text;--> statement-breakpoint
ALTER TABLE "deliverables" ADD COLUMN "usage_rights_granted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "deliverables" ADD COLUMN "usage_rights_scope" text;
