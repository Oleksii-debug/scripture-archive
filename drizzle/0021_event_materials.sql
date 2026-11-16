-- Reuse the editorially approved snapshot authority. No file bytes, copied
-- answers or independent publication state are stored on an event.
CREATE TABLE event_materials (
  event_id TEXT NOT NULL REFERENCES church_events(id) ON DELETE CASCADE,
  submission_id TEXT NOT NULL REFERENCES material_submissions(id) ON DELETE CASCADE,
  attached_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id, submission_id)
);
--> statement-breakpoint
CREATE INDEX event_materials_submission ON event_materials(submission_id);
