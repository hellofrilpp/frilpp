ALTER TABLE "offers" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "categories" text[];
