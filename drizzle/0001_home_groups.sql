CREATE TABLE `home_groups` (
  `id` text PRIMARY KEY NOT NULL,
  `owner_user_id` text NOT NULL,
  `name` text NOT NULL,
  `church` text,
  `country` text,
  `city` text,
  `description` text,
  `visibility` text NOT NULL DEFAULT 'public',
  `roster_visibility` text NOT NULL DEFAULT 'count',
  `member_activity_visibility` integer NOT NULL DEFAULT 0,
  `invite_code` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `home_groups_invite_code_unique` ON `home_groups` (`invite_code`);
--> statement-breakpoint
CREATE INDEX `home_groups_owner_idx` ON `home_groups` (`owner_user_id`);
--> statement-breakpoint
CREATE TABLE `home_group_members` (
  `group_id` text NOT NULL,
  `user_id` text NOT NULL,
  `display_name` text NOT NULL,
  `role` text NOT NULL DEFAULT 'member',
  `public_name` integer NOT NULL DEFAULT 0,
  `public_activity` integer NOT NULL DEFAULT 0,
  `joined_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`group_id`, `user_id`),
  FOREIGN KEY (`group_id`) REFERENCES `home_groups` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `home_group_members_user_idx` ON `home_group_members` (`user_id`);
--> statement-breakpoint
CREATE TABLE `group_marathon_registrations` (
  `id` text PRIMARY KEY NOT NULL,
  `group_id` text NOT NULL,
  `weekly_goal` integer NOT NULL,
  `catchup_mode` text NOT NULL,
  `cohort_key` text NOT NULL,
  `status` text NOT NULL DEFAULT 'forming',
  `start_date` text,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`group_id`) REFERENCES `home_groups` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `group_marathon_group_unique` ON `group_marathon_registrations` (`group_id`);
--> statement-breakpoint
CREATE INDEX `group_marathon_cohort_idx` ON `group_marathon_registrations` (`cohort_key`, `status`);
--> statement-breakpoint
CREATE TABLE `group_sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `group_id` text NOT NULL,
  `created_by` text NOT NULL,
  `book_id` text NOT NULL,
  `chapter` integer NOT NULL,
  `chapters_completed` integer NOT NULL DEFAULT 1,
  `answers_correct` integer NOT NULL DEFAULT 0,
  `answers_total` integer NOT NULL DEFAULT 0,
  `reflection` text,
  `participant_count` integer,
  `meeting_date` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`group_id`) REFERENCES `home_groups` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `group_sessions_group_date_idx` ON `group_sessions` (`group_id`, `meeting_date`);
