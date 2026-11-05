-- SA-EXT-11: an event may be listed only by the verified account that owns an
-- already owner-approved church representative claim. No attendee or payment
-- data is collected by this catalogue.
CREATE TABLE church_events (
  id TEXT PRIMARY KEY NOT NULL,
  -- Revision identifier that was approved when the event was last saved.
  -- Publication is always joined to the organizer's current approved claim;
  -- this snapshot is intentionally not a foreign key because a correction
  -- rotates the claim revision before its fresh owner review.
  church_claim_id TEXT NOT NULL,
  organizer_user_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 3 AND 160),
  summary TEXT NOT NULL CHECK(length(trim(summary)) BETWEEN 3 AND 500),
  city TEXT NOT NULL CHECK(length(trim(city)) BETWEEN 2 AND 120),
  country_code TEXT NOT NULL CHECK(length(country_code)=2 AND country_code=upper(country_code)),
  locale TEXT NOT NULL CHECK(locale IN ('uk','ru','en')),
  starts_on TEXT NOT NULL CHECK(starts_on GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
  ends_on TEXT NOT NULL CHECK(ends_on GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]' AND ends_on>=starts_on),
  accessibility_details TEXT NOT NULL CHECK(length(trim(accessibility_details)) BETWEEN 3 AND 500),
  programme_url TEXT,
  registration_url TEXT,
  organizer_authority_attested INTEGER NOT NULL CHECK(organizer_authority_attested=1),
  publication_consent INTEGER NOT NULL CHECK(publication_consent=1),
  status TEXT NOT NULL CHECK(status IN ('active','withdrawn')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX church_events_public ON church_events(status,starts_on,id);
--> statement-breakpoint
CREATE INDEX church_events_organizer ON church_events(organizer_user_id,updated_at);
