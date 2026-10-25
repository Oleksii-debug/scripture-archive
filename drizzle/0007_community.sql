ALTER TABLE `profiles` ADD `public_progress` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE TABLE `community_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `status` text NOT NULL DEFAULT 'running',
  `timezone` text NOT NULL DEFAULT 'Europe/Warsaw',
  `started_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `paused_at` text,
  `stopped_at` text,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `community_waves` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL,
  `label` text NOT NULL,
  `starts_at` text NOT NULL,
  `next_at` text NOT NULL,
  `created_count` integer NOT NULL DEFAULT 0,
  `target_count` integer NOT NULL,
  `interval_pattern` text NOT NULL,
  `pattern_index` integer NOT NULL DEFAULT 0,
  `status` text NOT NULL DEFAULT 'running',
  FOREIGN KEY (`run_id`) REFERENCES `community_runs` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `community_waves_due_idx` ON `community_waves` (`status`,`next_at`);
--> statement-breakpoint
CREATE TABLE `community_members` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL,
  `wave_id` text NOT NULL,
  `sequence_number` integer NOT NULL,
  `source_kind` text NOT NULL DEFAULT 'synthetic',
  `first_name` text NOT NULL,
  `last_name` text NOT NULL,
  `locale` text NOT NULL,
  `country_code` text NOT NULL,
  `persona` text NOT NULL,
  `seed` integer NOT NULL,
  `joined_at` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`run_id`) REFERENCES `community_runs` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`wave_id`) REFERENCES `community_waves` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `community_members_sequence_idx` ON `community_members` (`run_id`,`sequence_number`);
--> statement-breakpoint
CREATE INDEX `community_members_joined_idx` ON `community_members` (`joined_at`);
--> statement-breakpoint
CREATE TABLE `community_run_log` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL,
  `event_type` text NOT NULL,
  `details_json` text NOT NULL DEFAULT '{}',
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`run_id`) REFERENCES `community_runs` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `community_run_log_date_idx` ON `community_run_log` (`run_id`,`created_at`);
