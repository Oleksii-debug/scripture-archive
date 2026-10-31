-- A public name is a field-level visibility choice, not consent to appear in
-- the live community directory. Existing profiles remain excluded until the
-- account holder makes this separate, explicit choice.
ALTER TABLE profiles ADD COLUMN public_community INTEGER NOT NULL DEFAULT 0 CHECK (public_community IN (0,1));
--> statement-breakpoint
CREATE TRIGGER profiles_public_community_insert_v1
BEFORE INSERT ON profiles
WHEN NEW.public_community=1 AND NEW.public_first_name IS NOT 1 AND NEW.public_last_name IS NOT 1
BEGIN SELECT RAISE(ABORT, 'public_community_requires_public_name'); END;
--> statement-breakpoint
CREATE TRIGGER profiles_public_community_update_v1
BEFORE UPDATE ON profiles
WHEN NEW.public_community=1 AND NEW.public_first_name IS NOT 1 AND NEW.public_last_name IS NOT 1
BEGIN SELECT RAISE(ABORT, 'public_community_requires_public_name'); END;
