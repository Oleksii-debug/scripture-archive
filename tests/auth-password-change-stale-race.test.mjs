import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

// Execute the two SQL statements extracted from the canonical auth route.
// This is an isolated native SQLite concurrency regression, not a Worker/D1 E2E.
const route = readFileSync(new URL('../app/api/auth/route.ts', import.meta.url), 'utf8');
const section = route.split('if (action === "change-password") {')[1]?.split('if (action === "delete-account") {')[0];
assert.ok(section, 'canonical change-password route must exist');
const accountSql = section.match(/env\.DB\.prepare\("(UPDATE accounts SET password_hash=\?[^"\n]+)"\)/)?.[1];
const sessionsSql = section.match(/env\.DB\.prepare\("(UPDATE auth_sessions SET revoked_at=CURRENT_TIMESTAMP[^"\n]+)"\)/)?.[1];
assert.ok(accountSql && sessionsSql, 'extract exact canonical D1 update statements');
assert.equal((accountSql.match(/\?/g) || []).length, 8, 'credential CAS must compare verified snapshot');
assert.match(sessionsSql, /changes\(\)=1/, 'session revocation must depend on preceding CAS');

function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE accounts (
    id TEXT PRIMARY KEY, password_hash TEXT NOT NULL, password_salt TEXT NOT NULL,
    password_iterations INTEGER NOT NULL, session_version INTEGER NOT NULL,
    deleted_at TEXT, updated_at TEXT);
    CREATE TABLE auth_sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, revoked_at TEXT);`);
  db.prepare("INSERT INTO accounts(id,password_hash,password_salt,password_iterations,session_version) VALUES ('alice','oldhash','oldsalt',310000,2)").run();
  db.prepare("INSERT INTO auth_sessions VALUES ('original','alice',NULL)").run();
  return db;
}
function snapshot(db) {
  return db.prepare("SELECT password_hash,password_salt,password_iterations,session_version FROM accounts WHERE id='alice'").get();
}
function attempt(db, verified, { hash='changedhash', salt='changedsalt' } = {}) {
  db.exec('BEGIN');
  try {
    const account = db.prepare(accountSql).run(
      hash, salt, 310000, 'alice', verified.session_version,
      verified.password_hash, verified.password_salt, verified.password_iterations);
    const sessions = db.prepare(sessionsSql).run('alice');
    db.exec('COMMIT');
    return { account: Number(account.changes), sessions: Number(sessions.changes) };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

test('R0.2: stale verified password cannot overwrite completed reset or revoke its fresh session', () => {
  const db = fixture();
  try {
    const verified = snapshot(db);
    db.prepare("UPDATE accounts SET password_hash='reset-hash',password_salt='reset-salt',session_version=session_version+1 WHERE id='alice'").run();
    db.prepare("UPDATE auth_sessions SET revoked_at='reset' WHERE user_id='alice'").run();
    db.prepare("INSERT INTO auth_sessions VALUES ('fresh-after-reset','alice',NULL)").run();
    assert.deepEqual(attempt(db, verified), { account: 0, sessions: 0 });
    assert.deepEqual({ ...snapshot(db) }, {
      password_hash: 'reset-hash', password_salt: 'reset-salt',
      password_iterations: 310000, session_version: 3 });
    assert.equal(db.prepare("SELECT revoked_at FROM auth_sessions WHERE token_hash='fresh-after-reset'").get().revoked_at, null);
  } finally { db.close(); }
});

test('R0.2: legitimate change revokes old sessions; replay cannot revoke new login', () => {
  const db = fixture();
  try {
    const verified = snapshot(db);
    assert.deepEqual(attempt(db, verified), { account: 1, sessions: 1 });
    assert.equal(snapshot(db).password_hash, 'changedhash');
    assert.equal(snapshot(db).session_version, 3);
    db.prepare("INSERT INTO auth_sessions VALUES ('new-login','alice',NULL)").run();
    assert.deepEqual(attempt(db, verified, { hash: 'stale-hash' }), { account: 0, sessions: 0 });
    assert.equal(snapshot(db).password_hash, 'changedhash');
    assert.equal(db.prepare("SELECT revoked_at FROM auth_sessions WHERE token_hash='new-login'").get().revoked_at, null);
  } finally { db.close(); }
});

test('R0.2: account deleted during password hashing cannot be modified', () => {
  const db = fixture();
  try {
    const verified = snapshot(db);
    db.prepare("UPDATE accounts SET deleted_at='2026-10-31' WHERE id='alice'").run();
    assert.deepEqual(attempt(db, verified), { account: 0, sessions: 0 });
    assert.equal(snapshot(db).password_hash, 'oldhash');
  } finally { db.close(); }
});

test('R0.2: session revocation failure rolls back credential mutation', () => {
  const db = fixture();
  try {
    const verified = snapshot(db);
    db.exec("CREATE TRIGGER refuse_revocation BEFORE UPDATE OF revoked_at ON auth_sessions BEGIN SELECT RAISE(ABORT,'test-revocation-failure'); END;");
    assert.throws(() => attempt(db, verified), /test-revocation-failure/);
    assert.deepEqual(snapshot(db), verified);
  } finally { db.close(); }
});
