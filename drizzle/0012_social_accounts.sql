CREATE TYPE "social_provider" AS ENUM ('INSTAGRAM', 'TIKTOK');

CREATE TABLE "user_social_accounts" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "provider" "social_provider" NOT NULL,
  "provider_user_id" text NOT NULL,
  "username" text,
  "access_token_encrypted" text,
  "refresh_token_encrypted" text,
  "expires_at" timestamp with time zone,
  "scopes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "user_social_accounts_provider_user_unique" ON "user_social_accounts" ("provider", "provider_user_id");
CREATE UNIQUE INDEX "user_social_accounts_user_provider_unique" ON "user_social_accounts" ("user_id", "provider");

CREATE TABLE "pending_social_accounts" (
  "id" text PRIMARY KEY,
  "provider" "social_provider" NOT NULL,
  "provider_user_id" text NOT NULL,
  "username" text,
  "access_token_encrypted" text,
  "refresh_token_encrypted" text,
  "expires_at" timestamp with time zone,
  "scopes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "pending_social_accounts_provider_user_unique" ON "pending_social_accounts" ("provider", "provider_user_id");
