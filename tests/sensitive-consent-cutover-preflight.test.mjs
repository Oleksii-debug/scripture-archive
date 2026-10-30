import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { inspectConsentSnapshot, verifyConsentFile } from "../scripts/verify-sensitive-consent-cutover.mjs";

const migration = readFileSync(new URL("../drizzle/0010_sensitive_consent_evidence.sql", import.meta.url), "utf8");
const account = readFileSync(new URL("../app/api/account/route.ts", import.meta.url), "utf8");
// Use the EXACT shipped guarded visibility SQL rather than a newly invented policy.
const actualWriter = account.match(/UPDATE profiles SET public_first_name=\?,public_last_name=\?,public_church=CASE WHEN sensitive_consent=1 AND sensitive_consent_version=1 THEN \? ELSE 0 END,public_progress=\?,updated_at=CURRENT_TIMESTAMP WHERE user_id=\?/);
assert.ok(actualWriter, "canonical visibility writer must retain its consent gate");

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "sa-consent-cutover-"));
  const path = join(dir, "snapshot.sqlite");
  const db = new DatabaseSync(path);
  db.exec(`CREATE TABLE profiles(
    user_id TEXT PRIMARY KEY,
    sensitive_consent INTEGER NOT NULL DEFAULT 0,
    public_church INTEGER NOT NULL DEFAULT 0,
    church TEXT,
    public_first_name INTEGER NOT NULL DEFAULT 0,
    public_last_name INTEGER NOT NULL DEFAULT 0,
    public_progress INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT
  );`);
  db.prepare("INSERT INTO profiles(user_id,sensitive_consent,public_church,church) VALUES (?,?,?,?)")
    .run("legacy", 1, 1, "Confidential text must never appear in the preflight report");
  return { db, path, close: () => { db.close(); rmSync(dir, { recursive: true, force: true }); } };
}

test("actual 0010 migration hides legacy church and preflight reads snapshot safely", () => {
  const f = fixture();
  try {
    f.db.exec(migration);
    assert.deepEqual(inspectConsentSnapshot(f.db), { total: 1, unsafe: 0, safe: true });
    assert.deepEqual(verifyConsentFile(f.path), { total: 1, unsafe: 0, safe: true });
    // The checker is point-in-time; its snapshot-only PASS is not a deployment PASS.
    assert.equal(f.db.prepare("SELECT public_church FROM profiles WHERE user_id='legacy'").get().public_church, 0);
  } finally { f.close(); }
});

test("the real historical direct writer after 0010 is detected, without leaking private fields", () => {
  const f = fixture();
  try {
    f.db.exec(migration);
    f.db.prepare("UPDATE profiles SET public_church=1 WHERE user_id=?").run("legacy");
    assert.deepEqual(verifyConsentFile(f.path), { total: 1, unsafe: 1, safe: false });
    const script = fileURLToPath(new URL("../scripts/verify-sensitive-consent-cutover.mjs", import.meta.url));
    const proc = spawnSync(process.execPath, [script, f.path], { encoding: "utf8" });
    assert.equal(proc.status, 2);
    assert.equal(JSON.parse(proc.stdout).status, "SNAPSHOT_GATE_BLOCKED");
    assert.doesNotMatch(proc.stdout + proc.stderr, /Confidential|legacy|@/);
  } finally { f.close(); }
});

test("the exact canonical visibility writer cannot re-publish without versioned consent", () => {
  const f = fixture();
  try {
    f.db.exec(migration);
    f.db.prepare(actualWriter[0]).run(1, 1, 1, 1, "legacy");
    assert.equal(verifyConsentFile(f.path).unsafe, 0);
    assert.equal(f.db.prepare("SELECT public_church FROM profiles").get().public_church, 0);
    // A NEW explicit versioned consent may allow the user's own chosen visibility.
    f.db.prepare("UPDATE profiles SET sensitive_consent=1,sensitive_consent_version=1 WHERE user_id=?").run("legacy");
    f.db.prepare(actualWriter[0]).run(1, 1, 1, 1, "legacy");
    assert.deepEqual(verifyConsentFile(f.path), { total: 1, unsafe: 0, safe: true });
    assert.equal(f.db.prepare("SELECT public_church FROM profiles").get().public_church, 1);
  } finally { f.close(); }
});

test("the gate rejects inconsistent consent, nonboolean visibility and missing migration", () => {
  const f = fixture();
  try {
    assert.throws(() => inspectConsentSnapshot(f.db), /missing_post_0010_profile_schema/);
    f.db.exec(migration);
    f.db.prepare("UPDATE profiles SET sensitive_consent=0,sensitive_consent_version=1,public_church=1").run();
    assert.equal(inspectConsentSnapshot(f.db).unsafe, 1);
    f.db.prepare("UPDATE profiles SET public_church=3").run();
    assert.equal(inspectConsentSnapshot(f.db).unsafe, 1);
    f.db.prepare("UPDATE profiles SET public_church=0").run();
    assert.equal(inspectConsentSnapshot(f.db).unsafe, 0);
  } finally { f.close(); }
});

test("the snapshot is opened read-only and a missing file fails closed", () => {
  const f = fixture();
  try {
    f.db.exec(migration);
    const db = new DatabaseSync(f.path, { readOnly: true });
    try {
      assert.throws(() => db.prepare("UPDATE profiles SET public_church=1").run());
    } finally { db.close(); }
    assert.throws(() => verifyConsentFile(join(tmpdir(), "nonexistent-sa-consent-audit.sqlite")));
  } finally { f.close(); }
});
