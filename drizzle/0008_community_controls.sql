ALTER TABLE `community_runs` ADD `lease_token` text;
--> statement-breakpoint
ALTER TABLE `community_runs` ADD `lease_until` text;
--> statement-breakpoint
ALTER TABLE `community_runs` ADD `control_version` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `community_runs` ADD `activated_at` text;
--> statement-breakpoint
ALTER TABLE `community_members` ADD `next_action_at` text;
--> statement-breakpoint
CREATE TABLE `community_agent_sessions` (
  `token_hash` text PRIMARY KEY NOT NULL,
  `member_id` text NOT NULL,
  `control_version` integer NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` text NOT NULL,
  `revoked_at` text,
  `last_seen_at` text,
  `activity` text NOT NULL DEFAULT 'exploring',
  FOREIGN KEY (`member_id`) REFERENCES `community_members` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `community_agent_member_idx` ON `community_agent_sessions` (`member_id`,`expires_at`);
--> statement-breakpoint
UPDATE `community_runs` SET `activated_at`=`started_at`,`status`='paused',`paused_at`=CURRENT_TIMESTAMP,`control_version`=`control_version`+1 WHERE `status`='running';

--> statement-breakpoint
UPDATE `community_waves` SET `target_count`=2100,`label`='continuous-2100' WHERE `id` LIKE '%:continuous' AND `target_count`=1500;
