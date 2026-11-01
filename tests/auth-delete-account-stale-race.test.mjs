import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

// These are the actual SQL statements in the canonical route, not a second
// reimplementation of its deletion predicate. SQLite is disposable; no D1.
const source = readFileSync(new URL('../app/api/auth/route.ts', import.meta.url), 'utf8');
const section = source.split('if (action === "delete-account") {')[1]?.split('return json({ error: "unknown_action" }')[0];
assert.ok(section, 'canonical delete-account action exists');
const cas = section.match(/env\.DB\.prepare\("(UPDATE accounts SET email=\?[^"\n]+)"\)/)?.[1];
const guard = section.match(/const deletionGuard = ("[^"\n]+");/)?.[1];
assert.ok(cas && guard, 'extract credential CAS and account tombstone guard from production source');
const gate = JSON.parse(guard);
assert.match(cas, /session_version=\? AND password_hash=\? AND password_salt=\? AND password_iterations=\?/);
assert.equal((section.match(/env\.DB\.prepare\(`[^`]*\$\{deletionGuard\}[^`]*`\)/g) || []).length, 20,
  'all twenty follow-up mutations must be guarded');
assert.match(section, /receipts\[0\]\.meta\.changes !== 1/);
const progress = 'DELETE FROM progress WHERE user_id=? AND ' + gate;
const sessions = 'DELETE FROM auth_sessions WHERE user_id=? AND ' + gate;
const group = "UPDATE group_sessions SET created_by='deleted-account',reflection=NULL WHERE created_by=? AND " + gate;

function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE accounts(id TEXT PRIMARY KEY,email TEXT,first_name TEXT,last_name TEXT,
    deleted_at TEXT,session_version INTEGER,password_hash TEXT,password_salt TEXT,password_iterations INTEGER);
    CREATE TABLE progress(user_id TEXT);
    CREATE TABLE auth_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT);
    CREATE TABLE group_sessions(created_by TEXT,reflection TEXT);
    INSERT INTO accounts VALUES ('alice','alice@example.invalid','Alice','A',NULL,2,'oldhash','oldsalt',310000);
    INSERT INTO accounts VALUES ('bob','bob@example.invalid','Bob','B',NULL,2,'bobhash','bobsalt',310000);
    INSERT INTO progress VALUES ('alice'),('bob');
    INSERT INTO auth_sessions VALUES ('alice-session','alice'),('bob-session','bob');
    INSERT INTO group_sessions VALUES ('alice','private text'),('bob','bob text');`);
  return db;
}
function snapshot(db) {
  return db.prepare("SELECT session_version,password_hash,password_salt,password_iterations FROM accounts WHERE id='alice'").get();
}
function deletion(db, verified, fail = false) {
  db.exec('BEGIN');
  try {
    const account = db.prepare(cas).run('deleted-alice@invalid.local','alice',
      verified.session_version,verified.password_hash,verified.password_salt,verified.password_iterations);
    const p = db.prepare(progress).run('alice');
    if (fail) throw Error('simulated D1 batch failure');
    const g = db.prepare(group).run('alice');
    const s = db.prepare(sessions).run('alice');
    db.exec('COMMIT');
    return [account.changes,p.changes,g.changes,s.changes].map(Number);
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
test('stale password verification cannot erase account data after reset', () => {
  const db = fixture();
  try {
    const old = snapshot(db);
    db.exec("UPDATE accounts SET password_hash='reset',password_salt='newsalt',session_version=3 WHERE id='alice'");
    assert.deepEqual(deletion(db,old),[0,0,0,0]);
    assert.equal(db.prepare("SELECT password_hash FROM accounts WHERE id='alice'").get().password_hash,'reset');
    assert.equal(db.prepare("SELECT deleted_at FROM accounts WHERE id='alice'").get().deleted_at,null);
    assert.equal(db.prepare("SELECT count(*) n FROM progress WHERE user_id='alice'").get().n,1);
    assert.equal(db.prepare("SELECT count(*) n FROM auth_sessions WHERE user_id='alice'").get().n,1);
    assert.equal(db.prepare("SELECT reflection FROM group_sessions WHERE created_by='alice'").get().reflection,'private text');
    assert.deepEqual(deletion(db,snapshot(db)),[1,1,1,1], 'newly verified credentials can recover');
    assert.equal(db.prepare("SELECT count(*) n FROM progress WHERE user_id='alice'").get().n,0);
    assert.equal(db.prepare("SELECT count(*) n FROM progress WHERE user_id='bob'").get().n,1);
  } finally { db.close(); }
});
test('valid deletion is atomic; failure rolls back tombstone and privacy mutations', () => {
  const db = fixture();
  try {
    assert.throws(()=>deletion(db,snapshot(db),true),/simulated D1 batch failure/);
    assert.equal(db.prepare("SELECT deleted_at FROM accounts WHERE id='alice'").get().deleted_at,null);
    assert.equal(db.prepare("SELECT count(*) n FROM progress WHERE user_id='alice'").get().n,1);
    assert.deepEqual(deletion(db,snapshot(db)),[1,1,1,1]);
    assert.deepEqual(deletion(db,{session_version:2,password_hash:'oldhash',password_salt:'oldsalt',password_iterations:310000}),[0,0,0,0]);
    assert.equal(db.prepare("SELECT email FROM accounts WHERE id='alice'").get().email,'deleted-alice@invalid.local');
    assert.equal(db.prepare("SELECT count(*) n FROM auth_sessions WHERE user_id='bob'").get().n,1);
  } finally { db.close(); }
});
test('malformed or stale credential snapshot never triggers a partial deletion', () => {
  const db=fixture();
  try {
    for(const stale of [
      {...snapshot(db),password_hash:'wrong'},
      {...snapshot(db),password_salt:'wrong'},
      {...snapshot(db),password_iterations:1},
      {...snapshot(db),session_version:1},
    ]) assert.deepEqual(deletion(db,stale),[0,0,0,0]);
    assert.equal(db.prepare("SELECT count(*) n FROM progress WHERE user_id='alice'").get().n,1);
  } finally { db.close(); }
});
