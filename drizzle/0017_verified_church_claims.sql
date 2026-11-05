-- SA-EXT-09: no church is public merely because an account names it.
-- A representative must attest authority and website-publication consent, and
-- the verified owner must record private verification evidence before approval.
CREATE TABLE church_directory_claims (
  id TEXT PRIMARY KEY NOT NULL,
  claimant_user_id TEXT NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 3 AND 160),
  city TEXT NOT NULL CHECK(length(trim(city)) BETWEEN 2 AND 120),
  country_code TEXT NOT NULL CHECK(length(country_code)=2 AND country_code=upper(country_code)),
  locale TEXT NOT NULL CHECK(locale IN ('uk','ru','en')),
  tradition TEXT NOT NULL CHECK(tradition IN ('orthodox','catholic','protestant','adventist','other')),
  website_url TEXT,
  representation_attested INTEGER NOT NULL CHECK(representation_attested=1),
  website_consent INTEGER NOT NULL CHECK(website_consent=1),
  status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected','withdrawn')),
  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT,
  reviewed_by TEXT,
  review_note TEXT NOT NULL DEFAULT '',
  verification_evidence TEXT NOT NULL DEFAULT '',
  CHECK(status<>'approved' OR
    (reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL AND length(trim(verification_evidence)) BETWEEN 3 AND 1000))
);
--> statement-breakpoint
CREATE INDEX church_directory_public ON church_directory_claims(status,name,city);
--> statement-breakpoint
CREATE INDEX church_directory_review_queue ON church_directory_claims(status,submitted_at);
