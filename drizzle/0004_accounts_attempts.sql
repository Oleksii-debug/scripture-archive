CREATE TABLE `accounts` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL,
  `password_hash` text NOT NULL,
  `password_salt` text NOT NULL,
  `password_iterations` integer NOT NULL,
  `first_name` text NOT NULL,
  `last_name` text NOT NULL,
  `email_verified_at` text,
  `session_version` integer NOT NULL DEFAULT 1,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_email_unique` ON `accounts` (`email`);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
  `token_hash` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `session_version` integer NOT NULL,
  `user_agent_hash` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` text NOT NULL,
  `revoked_at` text,
  FOREIGN KEY (`user_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `auth_sessions_user_idx` ON `auth_sessions` (`user_id`,`expires_at`);
--> statement-breakpoint
CREATE TABLE `auth_tokens` (
  `token_hash` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `purpose` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` text NOT NULL,
  `used_at` text,
  FOREIGN KEY (`user_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `auth_tokens_user_idx` ON `auth_tokens` (`user_id`,`purpose`,`expires_at`);
--> statement-breakpoint
CREATE TABLE `auth_rate_limits` (
  `key` text PRIMARY KEY NOT NULL,
  `window_start` text NOT NULL,
  `count` integer NOT NULL DEFAULT 1
);
--> statement-breakpoint
ALTER TABLE `profiles` ADD `age` integer;
--> statement-breakpoint
ALTER TABLE `profiles` ADD `denomination` text;
--> statement-breakpoint
ALTER TABLE `profiles` ADD `has_children` integer;
--> statement-breakpoint
ALTER TABLE `profiles` ADD `public_first_name` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `profiles` ADD `public_last_name` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `profiles` ADD `public_church` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `profiles` ADD `privacy_accepted_at` text;
--> statement-breakpoint
CREATE TABLE `mission_attempts` (
  `id` text PRIMARY KEY NOT NULL,
  `actor_id` text NOT NULL,
  `mission_id` text NOT NULL,
  `book_id` text NOT NULL,
  `chapter` integer NOT NULL,
  `group_id` text,
  `locale` text NOT NULL,
  `task_limit` integer NOT NULL,
  `current_index` integer NOT NULL DEFAULT 0,
  `status` text NOT NULL DEFAULT 'active',
  `started_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` text NOT NULL,
  `invalidated_at` text,
  `invalidation_reason` text,
  `completed_at` text,
  `score` integer,
  `total` integer,
  `result_json` text
);
--> statement-breakpoint
CREATE INDEX `mission_attempts_actor_active_idx` ON `mission_attempts` (`actor_id`,`status`,`expires_at`);
--> statement-breakpoint
CREATE TABLE `chapter_read_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `actor_id` text NOT NULL,
  `book_id` text NOT NULL,
  `chapter` integer NOT NULL,
  `group_id` text,
  `completed_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `consumed_at` text
);
--> statement-breakpoint
CREATE INDEX `chapter_read_receipts_actor_idx` ON `chapter_read_receipts` (`actor_id`,`book_id`,`chapter`,`completed_at`);
--> statement-breakpoint
CREATE TABLE `mission_attempt_answers` (
  `attempt_id` text NOT NULL,
  `task_id` text NOT NULL,
  `selected_json` text NOT NULL,
  `is_correct` integer NOT NULL,
  `answered_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`attempt_id`,`task_id`),
  FOREIGN KEY (`attempt_id`) REFERENCES `mission_attempts` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `content_revisions` (
  `id` text PRIMARY KEY NOT NULL,
  `content_key` text NOT NULL,
  `data` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `content_revisions_key_idx` ON `content_revisions` (`content_key`,`created_at`);
--> statement-breakpoint
CREATE TABLE `managed_content` (
  `id` text PRIMARY KEY NOT NULL,
  `kind` text NOT NULL,
  `locale` text NOT NULL,
  `title` text NOT NULL,
  `status` text NOT NULL DEFAULT 'draft',
  `data` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `managed_content_kind_status_idx` ON `managed_content` (`kind`,`status`,`updated_at`);
