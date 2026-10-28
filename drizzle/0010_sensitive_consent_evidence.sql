-- Existing consent flags may have been set without a separate opt-in.
-- Keep the data but require a new explicit consent before public visibility.
ALTER TABLE profiles ADD COLUMN sensitive_consent_version INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
UPDATE profiles SET public_church=0 WHERE sensitive_consent_version=0;
