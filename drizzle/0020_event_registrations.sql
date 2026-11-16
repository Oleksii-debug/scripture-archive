ALTER TABLE church_events ADD COLUMN registration_enabled INTEGER NOT NULL DEFAULT 0 CHECK(registration_enabled IN (0,1));
--> statement-breakpoint
CREATE TABLE event_registrations (
  id TEXT PRIMARY KEY NOT NULL,
  event_id TEXT NOT NULL REFERENCES church_events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  attendee_name TEXT NOT NULL CHECK(length(trim(attendee_name)) BETWEEN 2 AND 120),
  consent_version INTEGER NOT NULL CHECK(consent_version=1),
  consent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id,user_id)
);
--> statement-breakpoint
CREATE INDEX event_registrations_roster ON event_registrations(event_id,id);
--> statement-breakpoint
CREATE INDEX event_registrations_user ON event_registrations(user_id);
