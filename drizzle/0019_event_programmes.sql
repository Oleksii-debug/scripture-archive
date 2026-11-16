-- An event's optional accessible programme is published under the same
-- representative revision, authorization and explicit consent as the event.
-- Existing events keep an empty programme. No fixtures or personal data.
ALTER TABLE church_events ADD COLUMN programme_json TEXT NOT NULL DEFAULT '[]'
  CHECK(length(programme_json)<=24000 AND json_valid(programme_json) AND json_type(programme_json)='array');
--> statement-breakpoint
ALTER TABLE church_events ADD COLUMN programme_timezone TEXT NOT NULL DEFAULT ''
  CHECK(length(programme_timezone)<=80);
