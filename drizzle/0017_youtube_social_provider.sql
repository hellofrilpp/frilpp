-- Add YouTube as a supported social provider for user_social_accounts / pending_social_accounts.
DO $$ BEGIN
  ALTER TYPE "social_provider" ADD VALUE IF NOT EXISTS 'YOUTUBE';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

