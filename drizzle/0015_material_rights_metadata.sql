-- Structured publication-rights metadata for the reviewed public catalogue.
-- Existing submissions remain explicitly legacy/unknown rather than receiving
-- an invented rightsholder or licence basis during migration.
ALTER TABLE material_submissions ADD COLUMN rights_holder TEXT
  CHECK(rights_holder IS NULL OR length(trim(rights_holder)) BETWEEN 2 AND 160);
--> statement-breakpoint
ALTER TABLE material_submissions ADD COLUMN rights_basis TEXT
  CHECK(rights_basis IS NULL OR rights_basis IN ('original','permission','open_license','public_domain'));
--> statement-breakpoint
ALTER TABLE material_submissions ADD COLUMN license_url TEXT
  CHECK(license_url IS NULL OR length(license_url) BETWEEN 9 AND 500);
--> statement-breakpoint
CREATE TRIGGER material_rights_metadata_insert
BEFORE INSERT ON material_submissions
WHEN NOT (
  (NEW.rights_holder IS NULL AND NEW.rights_basis IS NULL AND NEW.license_url IS NULL)
  OR
  (NEW.rights_holder IS NOT NULL AND NEW.rights_basis IS NOT NULL
    AND (NEW.rights_basis <> 'open_license' OR NEW.license_url IS NOT NULL))
)
BEGIN
  SELECT RAISE(ABORT, 'material_rights_metadata_incomplete');
END;
--> statement-breakpoint
CREATE TRIGGER material_rights_metadata_update
BEFORE UPDATE OF rights_holder, rights_basis, license_url ON material_submissions
WHEN NOT (
  (NEW.rights_holder IS NULL AND NEW.rights_basis IS NULL AND NEW.license_url IS NULL)
  OR
  (NEW.rights_holder IS NOT NULL AND NEW.rights_basis IS NOT NULL
    AND (NEW.rights_basis <> 'open_license' OR NEW.license_url IS NOT NULL))
)
BEGIN
  SELECT RAISE(ABORT, 'material_rights_metadata_incomplete');
END;
