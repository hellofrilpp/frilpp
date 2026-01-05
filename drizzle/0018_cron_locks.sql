-- Prevent concurrent cron runs by coordinating via the DB.
CREATE TABLE IF NOT EXISTS "cron_locks" (
  "job" text PRIMARY KEY,
  "locked_until" timestamp with time zone NOT NULL,
  "locked_by" text,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

