CREATE TABLE `group_answers` (
  `group_id` text NOT NULL,
  `task_id` text NOT NULL,
  `first_correct` integer NOT NULL,
  `solved` integer NOT NULL,
  `attempts` integer NOT NULL DEFAULT 1,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`group_id`,`task_id`),
  FOREIGN KEY (`group_id`) REFERENCES `home_groups` (`id`) ON DELETE CASCADE
);
