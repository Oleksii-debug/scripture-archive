import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the canonical auth module against a disposable SQLite D1 adapter.
// This models the DB mutation interleaving, not a production Worker/D1 run.
const source = readFileSync(new URL('../lib/auth.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE accounts (
    id TEXT PRIMARY KEY, email_verified_at TEXT, deleted_at TEXT,
    session_version INTEGER NOT NULL);
    CREATE TABLE auth_sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL,
      session_version INTEGER NOT NULL, user_agent_hash TEXT NOT NULL,
      created_at TEXT, expires_at TEXT);
    INSERT INTO accounts VALUES ('alice','2026-10-01',NULL,1);`);
  let denyReceipt = false;
  const adapter = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async run() {
              const changes = Number(db.prepare(sql).run(...args).changes);
              return denyReceipt ? { success: false, meta: { changes } } :
                { success: true, meta: { changes } };
            },
          };
        },
      };
    },
  };
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, Request, URL, TextEncoder, crypto, btoa, atob,
    require(name) {
      if (name === 'cloudflare:workers') return { env: { DB: adapter } };
      throw Error(`unexpected dependency ${name}`);
    },
  });
  const request = () => new Request('https://scripture-archive.com/api/auth?action=login', {
    method: 'POST', headers: { 'user-agent': 'local-test' },
  });
  return { db, request, createSession: exports.createSession,
    denyReceipt() { denyReceipt = true; } };
}

function count(db) {
  return Number(db.prepare('SELECT COUNT(*) AS n FROM auth_sessions').get().n);
}

test('R0.2: a completed reset rejects an old verified login snapshot without issuing a cookie', async () => {
  const f = fixture();
  try {
    // Login verified session_version=1; reset completed during PBKDF2.
    f.db.exec("UPDATE accounts SET session_version=2 WHERE id='alice'");
    await assert.rejects(f.createSession(f.request(), 'alice', 1), /session_create_unavailable/);
    assert.equal(count(f.db), 0, 'stale credentials must not persist a dead session');
  } finally { f.db.close(); }
});

test('R0.2: account deletion and verification revocation cannot produce a login session', async () => {
  for (const update of [
    "UPDATE accounts SET deleted_at='2026-10-31' WHERE id='alice'",
    "UPDATE accounts SET email_verified_at=NULL WHERE id='alice'",
  ]) {
    const f = fixture();
    try {
      f.db.exec(update);
      await assert.rejects(f.createSession(f.request(), 'alice', 1), /session_create_unavailable/);
      assert.equal(count(f.db), 0);
    } finally { f.db.close(); }
  }
});

test('R0.2: valid login persists exactly the verified session version and usable cookie', async () => {
  const f = fixture();
  try {
    const session = await f.createSession(f.request(), 'alice', 1);
    assert.match(session.cookie, /^sa_session=[^;]+; Path=\/; HttpOnly; SameSite=Lax;/);
    assert.match(session.cookie, /; Secure$/);
    assert.equal(count(f.db), 1);
    const row = f.db.prepare('SELECT user_id,session_version FROM auth_sessions').get();
    assert.equal(row.user_id, 'alice');
    assert.equal(row.session_version, 1);
  } finally { f.db.close(); }
});

test('R0.2: a stale rejection does not poison a subsequent verified login after reset', async () => {
  const f = fixture();
  try {
    f.db.exec("UPDATE accounts SET session_version=2 WHERE id='alice'");
    await assert.rejects(f.createSession(f.request(), 'alice', 1), /session_create_unavailable/);
    assert.equal(count(f.db), 0);
    const fresh = await f.createSession(f.request(), 'alice', 2);
    assert.ok(fresh.token);
    assert.equal(count(f.db), 1);
    assert.equal(f.db.prepare('SELECT session_version FROM auth_sessions').get().session_version, 2);
  } finally { f.db.close(); }
});

test('R0.2: an unacknowledged D1 insert never returns an authentication cookie', async () => {
  const f = fixture();
  try {
    f.denyReceipt();
    await assert.rejects(f.createSession(f.request(), 'alice', 1), /session_create_unavailable/);
    assert.equal(count(f.db), 1, 'ambiguous acknowledgement is not a verified login');
  } finally { f.db.close(); }
});
