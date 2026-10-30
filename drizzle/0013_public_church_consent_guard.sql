-- SA-EXT-16 / issue #689: protect the 0010 privacy reset from a still-running
-- historical Sites writer that can set public_church=1 without checking the
-- independently confirmed consent version.
--
-- Source-only migration. A production release still needs the real D1 ledger,
-- recoverable backup and old-worker write freeze/compatible cutover. Applying
-- this migration after an unsafe coexistence interval does not prove that
-- sensitive information was never exposed during that interval.
--
-- Keep legitimate confirmed v1 consent. Clear any stale/reintroduced or
-- nonboolean visibility state at the moment the database guard is installed.
UPDATE profiles SET public_church=0 WHERE public_church IS NOT 0 AND (public_church IS NOT 1 OR sensitive_consent IS NOT 1 OR sensitive_consent_version IS NOT 1);
--> statement-breakpoint
-- Single-line trigger body is compatible with SQLite/D1 migration splitting.
CREATE TRIGGER profiles_public_church_consent_insert_v1 BEFORE INSERT ON profiles WHEN NEW.public_church IS NOT 0 AND (NEW.public_church IS NOT 1 OR NEW.sensitive_consent IS NOT 1 OR NEW.sensitive_consent_version IS NOT 1) BEGIN SELECT RAISE(ABORT, 'public_church_requires_current_explicit_consent'); END;
--> statement-breakpoint
-- Do not restrict only UPDATE OF public_church: a later consent withdrawal
-- without clearing public visibility is also an unsafe final row state.
CREATE TRIGGER profiles_public_church_consent_update_v1 BEFORE UPDATE ON profiles WHEN NEW.public_church IS NOT 0 AND (NEW.public_church IS NOT 1 OR NEW.sensitive_consent IS NOT 1 OR NEW.sensitive_consent_version IS NOT 1) BEGIN SELECT RAISE(ABORT, 'public_church_requires_current_explicit_consent'); END;
