CREATE TABLE `usage_sessions` (
  `session_id` text PRIMARY KEY NOT NULL,
  `user_id` text,
  `started_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_seen_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `active_seconds` integer NOT NULL DEFAULT 0,
  `page_views` integer NOT NULL DEFAULT 0,
  `country` text,
  `city` text,
  `device` text NOT NULL DEFAULT 'unknown',
  `operating_system` text NOT NULL DEFAULT 'unknown',
  `browser` text NOT NULL DEFAULT 'unknown',
  `source` text NOT NULL DEFAULT 'direct'
);
--> statement-breakpoint
CREATE INDEX `usage_sessions_user_idx` ON `usage_sessions` (`user_id`,`last_seen_at`);
--> statement-breakpoint
CREATE INDEX `usage_sessions_started_idx` ON `usage_sessions` (`started_at`);
--> statement-breakpoint
CREATE TABLE `usage_events` (
  `id` text PRIMARY KEY NOT NULL,
  `session_id` text NOT NULL,
  `user_id` text,
  `event_type` text NOT NULL,
  `page_name` text NOT NULL,
  `value_json` text NOT NULL DEFAULT '{}',
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`session_id`) REFERENCES `usage_sessions` (`session_id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `usage_events_type_date_idx` ON `usage_events` (`event_type`,`created_at`);
--> statement-breakpoint
CREATE INDEX `usage_events_session_idx` ON `usage_events` (`session_id`,`created_at`);
