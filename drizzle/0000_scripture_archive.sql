CREATE TABLE `profiles` (`user_id` text PRIMARY KEY NOT NULL, `email` text NOT NULL, `first_name` text NOT NULL, `last_name` text NOT NULL, `age_range` text NOT NULL, `tradition` text, `church` text, `marital_status` text, `gender` text, `locale` text NOT NULL DEFAULT 'uk', `sensitive_consent` integer NOT NULL DEFAULT 0, `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_email_unique` ON `profiles` (`email`);
--> statement-breakpoint
CREATE TABLE `progress` (`user_id` text NOT NULL, `mission_id` text NOT NULL, `data` text NOT NULL, `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`user_id`, `mission_id`));
--> statement-breakpoint
CREATE TABLE `site_content` (`key` text PRIMARY KEY NOT NULL, `data` text NOT NULL, `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_by` text NOT NULL);
