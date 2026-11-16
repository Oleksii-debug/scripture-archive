-- Event coordination reuses canonical group membership and invitations.
CREATE TABLE event_teams (
  event_id TEXT PRIMARY KEY NOT NULL REFERENCES church_events(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL REFERENCES home_groups(id) ON DELETE CASCADE,
  revision TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX event_teams_group ON event_teams(group_id);
