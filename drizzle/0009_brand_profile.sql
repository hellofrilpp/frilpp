ALTER TABLE "brands" ADD COLUMN "website" text;
--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "description" text;
--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "industry" text;
--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "location" text;
--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "logo_url" text;
--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "notification_new_match" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "notification_content_received" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "notification_weekly_digest" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "notification_marketing" boolean DEFAULT false NOT NULL;
