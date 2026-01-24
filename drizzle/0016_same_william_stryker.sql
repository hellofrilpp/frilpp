CREATE TYPE "public"."deliverable_review_action" AS ENUM('REQUEST_CHANGES', 'FAILED', 'VERIFIED');--> statement-breakpoint
CREATE TABLE "deliverable_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"deliverable_id" text NOT NULL,
	"action" "deliverable_review_action" NOT NULL,
	"reason" text,
	"submitted_permalink" text,
	"submitted_notes" text,
	"reviewed_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deliverable_reviews" ADD CONSTRAINT "deliverable_reviews_deliverable_id_deliverables_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."deliverables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_reviews" ADD CONSTRAINT "deliverable_reviews_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
