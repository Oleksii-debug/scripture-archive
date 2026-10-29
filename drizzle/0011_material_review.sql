-- Immutable author snapshots; changing a draft does not silently change published content.
CREATE TABLE material_submissions (
  id TEXT PRIMARY KEY NOT NULL,
  material_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  snapshot TEXT NOT NULL,
  provenance TEXT NOT NULL,
  rights_attested INTEGER NOT NULL CHECK(rights_attested=1),
  status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected','withdrawn','superseded')),
  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT,
  reviewed_by TEXT,
  review_note TEXT NOT NULL DEFAULT '',
  source_checked INTEGER NOT NULL DEFAULT 0,
  rights_checked INTEGER NOT NULL DEFAULT 0,
  closed_at TEXT,
  CHECK(status <> 'approved' OR (source_checked=1 AND rights_checked=1 AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)),
  FOREIGN KEY (material_id) REFERENCES study_materials(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX material_submission_pending ON material_submissions(material_id) WHERE status='pending';
--> statement-breakpoint
CREATE UNIQUE INDEX material_submission_approved ON material_submissions(material_id) WHERE status='approved';
--> statement-breakpoint
CREATE INDEX material_submission_author ON material_submissions(author_id,submitted_at DESC);
--> statement-breakpoint
CREATE INDEX material_submission_status ON material_submissions(status,submitted_at DESC);
