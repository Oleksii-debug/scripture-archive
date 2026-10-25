CREATE TABLE `support_requests` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text,
  `email` text NOT NULL,
  `subject` text NOT NULL,
  `message` text NOT NULL,
  `locale` text NOT NULL DEFAULT 'uk',
  `status` text NOT NULL DEFAULT 'new',
  `email_delivered` integer NOT NULL DEFAULT 0,
  `attachment_count` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `support_requests_created_idx` ON `support_requests` (`created_at`);
--> statement-breakpoint
CREATE INDEX `support_requests_user_idx` ON `support_requests` (`user_id`,`created_at`);
--> statement-breakpoint
CREATE TABLE `support_attachments` (
  `id` text PRIMARY KEY NOT NULL,
  `request_id` text NOT NULL,
  `filename` text NOT NULL,
  `content_type` text NOT NULL,
  `size_bytes` integer NOT NULL,
  `content_base64` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`request_id`) REFERENCES `support_requests` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `support_attachments_request_idx` ON `support_attachments` (`request_id`);

