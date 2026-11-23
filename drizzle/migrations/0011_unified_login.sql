ALTER TABLE "instagram_accounts" ADD COLUMN "token_type" text DEFAULT 'legacy_instagram_user' NOT NULL;--> statement-breakpoint
ALTER TABLE "instagram_accounts" ADD COLUMN "client_business_id" text;--> statement-breakpoint
ALTER TABLE "instagram_accounts" ADD COLUMN "config_id" text;