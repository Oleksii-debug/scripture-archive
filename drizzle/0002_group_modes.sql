ALTER TABLE `home_groups` ADD `weekly_goal` integer NOT NULL DEFAULT 3;
--> statement-breakpoint
ALTER TABLE `home_groups` ADD `catchup_mode` text NOT NULL DEFAULT 'flexible';
--> statement-breakpoint
ALTER TABLE `home_groups` ADD `marathon_enabled` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `home_groups` ADD `study_route` text NOT NULL DEFAULT 'abraham';
--> statement-breakpoint
ALTER TABLE `home_groups` ADD `bible_edition` text NOT NULL DEFAULT 'uk-kulish';
--> statement-breakpoint
CREATE TABLE `study_materials` (
  `id` text PRIMARY KEY NOT NULL,
  `owner_user_id` text NOT NULL,
  `title` text NOT NULL,
  `locale` text NOT NULL,
  `data` text NOT NULL,
  `visibility` text NOT NULL DEFAULT 'private',
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `study_materials_owner_idx` ON `study_materials` (`owner_user_id`);
