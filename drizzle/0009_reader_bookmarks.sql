CREATE TABLE IF NOT EXISTS reader_bookmarks (
  user_id TEXT NOT NULL,
  edition TEXT NOT NULL,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, edition, book, chapter)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS reader_bookmarks_user_created ON reader_bookmarks(user_id, created_at DESC);
