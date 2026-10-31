-- Preserve the reason and actor separately from the original editorial review.
CREATE TABLE material_takedowns (
  submission_id TEXT PRIMARY KEY NOT NULL REFERENCES material_submissions(id) ON DELETE CASCADE,
  actor_user_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK(length(trim(reason)) BETWEEN 3 AND 2000),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX material_takedown_actor ON material_takedowns(actor_user_id);
