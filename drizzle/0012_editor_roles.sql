CREATE TABLE editorial_roles (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  granted_by TEXT NOT NULL,
  granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_by TEXT
);
--> statement-breakpoint
CREATE TABLE editorial_role_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_user_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('grant','revoke')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TRIGGER editorial_role_granted AFTER INSERT ON editorial_roles
BEGIN
  INSERT INTO editorial_role_events(subject_user_id,actor_user_id,action)
  VALUES (NEW.user_id,NEW.granted_by,'grant');
END;
--> statement-breakpoint
CREATE TRIGGER editorial_role_revoked AFTER DELETE ON editorial_roles
WHEN OLD.revoked_by IS NOT NULL
BEGIN
  INSERT INTO editorial_role_events(subject_user_id,actor_user_id,action)
  VALUES (OLD.user_id,OLD.revoked_by,'revoke');
END;
