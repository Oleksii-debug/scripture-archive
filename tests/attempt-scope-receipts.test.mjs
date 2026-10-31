import assert from "node:assert/strict";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

// This contract executes the SQL from the *current canonical POST* endpoint.
// A historic GET chapter-lookup draft is obsolete: it was replaced by an
// invalidating POST so that opening a chapter cannot leak assessment text.
const source = await readFile(new URL("../app/api/attempts/route.ts", import.meta.url), "utf8");
const postAt = source.indexOf("export async function POST(request: Request)");
const chapterAt = source.indexOf('if (action === "chapter") {', postAt);
const readAt = source.indexOf('if (action === "read") {', chapterAt);
const startAt = source.indexOf('const receipt = await env.DB.prepare(', readAt);
const startEnd = source.indexOf("if (!receipt)", startAt);
assert.ok(postAt >= 0 && chapterAt > postAt && readAt > chapterAt && startAt > readAt && startEnd > startAt);
const guard = source.slice(chapterAt, readAt);
const receiptLookup = source.slice(startAt, startEnd);
const chapterUpdates = [...guard.matchAll(/env\.DB\.prepare\("([^"]+)"\)/g)].map(value => value[1]);
const receiptQuery = receiptLookup.match(/env\.DB\.prepare\("([^"]+)"\)/)?.[1];
assert.equal(chapterUpdates.length, 2);
assert.match(chapterUpdates[0], /mission_id=\?/);
assert.equal((chapterUpdates[0].match(/\?/g) || []).length, 4);
assert.ok(receiptQuery);
assert.match(receiptLookup, /\.bind\(currentActor\.id, book, chapter, groupId\)\.first/);
assert.equal((receiptQuery.match(/\?/g) || []).length, 4);
assert.match(receiptQuery, /COALESCE\(group_id,''\)=\?/);
assert.match(guard, /confirmedBatch\(result, 2\)/);
assert.match(source.slice(0, postAt), /if \(action === "chapter"\) \{\s*return json\(\{ error: "method_not_allowed" \}, 405/);

function openDatabase(filename = ":memory:") {
  const db = new DatabaseSync(filename);
  db.exec(`CREATE TABLE IF NOT EXISTS chapter_read_receipts (
    id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, book_id TEXT NOT NULL,
    chapter INTEGER NOT NULL, group_id TEXT, completed_at TEXT NOT NULL,
    consumed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS mission_attempts (
    id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, mission_id TEXT NOT NULL, book_id TEXT NOT NULL,
    chapter INTEGER NOT NULL, group_id TEXT, status TEXT NOT NULL,
    expires_at TEXT NOT NULL, invalidated_at TEXT, invalidation_reason TEXT
  );`);
  const addReceipt = (id, actor, book, chapter, group, when = "2026-10-30 00:00:00", consumed = null) =>
    db.prepare("INSERT INTO chapter_read_receipts VALUES (?,?,?,?,?,?,?)")
      .run(id, actor, book, chapter, group, when, consumed);
  const findReceipt = (actor, book, chapter, group = "") =>
    db.prepare(receiptQuery).get(actor, book, chapter, group);
  const addAttempt = (id, actor, book, chapter, group, status = "active", expiry = "2999-01-01", mission = "OT-AB-01") =>
    db.prepare("INSERT INTO mission_attempts VALUES (?,?,?,?,?,?,?,?,NULL,NULL)")
      .run(id, actor, mission, book, chapter, group, status, expiry);
  return { db, addReceipt, findReceipt, addAttempt };
}

function samples(f) {
  f.addReceipt("a-personal", "alice", "GEN", 12, null, "2026-10-30 00:01:00");
  f.addReceipt("a-group-1", "alice", "GEN", 12, "group-one", "2026-10-30 00:02:00");
  f.addReceipt("a-group-2", "alice", "GEN", 12, "group-two", "2026-10-30 00:03:00");
  f.addReceipt("other-actor", "bob", "GEN", 12, "group-one");
  f.addReceipt("other-chapter", "alice", "GEN", 13, "group-one");
  f.addReceipt("other-book", "alice", "EXO", 12, "group-one");
}

test("current production start SQL isolates personal and two group receipts", () => {
  const f = openDatabase();
  try {
    samples(f);
    assert.equal(f.findReceipt("alice", "GEN", 12, "")?.id, "a-personal");
    assert.equal(f.findReceipt("alice", "GEN", 12, "group-one")?.id, "a-group-1");
    assert.equal(f.findReceipt("alice", "GEN", 12, "group-two")?.id, "a-group-2");
    for (const group of ["group-three", "GROUP-ONE", "group-one?"]) assert.equal(f.findReceipt("alice", "GEN", 12, group), undefined);
  } finally { f.db.close(); }
});

test("production SQL does not cross actor, book, or chapter boundaries", () => {
  const f = openDatabase();
  try {
    samples(f);
    assert.equal(f.findReceipt("bob", "GEN", 12, "group-one")?.id, "other-actor");
    assert.equal(f.findReceipt("bob", "GEN", 12, ""), undefined);
    assert.equal(f.findReceipt("charlie", "GEN", 12, "group-one"), undefined);
    assert.equal(f.findReceipt("alice", "GEN", 13, "group-one")?.id, "other-chapter");
    assert.equal(f.findReceipt("alice", "EXO", 12, "group-one")?.id, "other-book");
  } finally { f.db.close(); }
});

test("consumed receipts cannot authorize another attempt; newest valid receipt wins", () => {
  const f = openDatabase();
  try {
    f.addReceipt("first", "alice", "GEN", 12, "group-one", "2026-10-30 00:01:00");
    f.addReceipt("newer", "alice", "GEN", 12, "group-one", "2026-10-30 00:02:00");
    f.addReceipt("latest-consumed", "alice", "GEN", 12, "group-one", "2026-10-30 00:03:00", "2026-10-30 00:04:00");
    assert.equal(f.findReceipt("alice", "GEN", 12, "group-one")?.id, "newer");
    f.db.prepare("UPDATE chapter_read_receipts SET consumed_at=CURRENT_TIMESTAMP WHERE id='newer'").run();
    assert.equal(f.findReceipt("alice", "GEN", 12, "group-one")?.id, "first");
    f.db.prepare("UPDATE chapter_read_receipts SET consumed_at=CURRENT_TIMESTAMP WHERE id='first'").run();
    assert.equal(f.findReceipt("alice", "GEN", 12, "group-one"), undefined);
  } finally { f.db.close(); }
});

test("production chapter-open SQL invalidates only this mission across contexts, never a foreign mission", () => {
  const f = openDatabase();
  try {
    samples(f);
    for (const [id, actor, book, chapter, group, status, expiry, mission] of [
      ["personal", "alice", "GEN", 12, null],
      ["group-one", "alice", "GEN", 12, "group-one"],
      ["group-two", "alice", "GEN", 12, "group-two"],
      ["foreign-mission", "alice", "GEN", 12, "group-one", "active", "2999-01-01", "OTHER-MISSION"],
      ["foreign-personal", "alice", "GEN", 12, null, "active", "2999-01-01", "OTHER-MISSION"],
      ["other-actor", "bob", "GEN", 12, "group-one"],
      ["other-book", "alice", "EXO", 12, "group-one"],
      ["other-chapter", "alice", "GEN", 13, "group-one"],
      ["completed", "alice", "GEN", 12, "group-one", "completed"],
      ["expired", "alice", "GEN", 12, "group-one", "active", "2000-01-01"],
    ]) f.addAttempt(id, actor, book, chapter, group, status, expiry, mission);
    f.db.exec("BEGIN");
    try {
      const first = f.db.prepare(chapterUpdates[0]).run("alice", "GEN", 12, "OT-AB-01");
      const second = f.db.prepare(chapterUpdates[1]).run("alice", "GEN", 12);
      assert.equal(Number(first.changes), 3);
      assert.equal(Number(second.changes), 3);
      f.db.exec("COMMIT");
    } catch (error) { f.db.exec("ROLLBACK"); throw error; }
    for (const id of ["personal", "group-one", "group-two"]) {
      assert.equal(f.db.prepare("SELECT status FROM mission_attempts WHERE id=?").get(id).status, "invalidated");
      assert.ok(f.db.prepare("SELECT invalidated_at FROM mission_attempts WHERE id=?").get(id).invalidated_at);
    }
    for (const id of ["foreign-mission", "foreign-personal", "other-actor", "other-book", "other-chapter", "expired"]) {
      assert.equal(f.db.prepare("SELECT status FROM mission_attempts WHERE id=?").get(id).status, "active");
    }
    assert.equal(f.db.prepare("SELECT status FROM mission_attempts WHERE id='completed'").get().status, "completed");
    for (const id of ["a-personal", "a-group-1", "a-group-2"]) {
      assert.ok(f.db.prepare("SELECT consumed_at FROM chapter_read_receipts WHERE id=?").get(id).consumed_at);
    }
    for (const id of ["other-actor", "other-chapter", "other-book"]) {
      assert.equal(f.db.prepare("SELECT consumed_at FROM chapter_read_receipts WHERE id=?").get(id).consumed_at, null);
    }
  } finally { f.db.close(); }
});

for (const journal of ["DELETE", "WAL"]) {
  test(`scope and consumption survive a real SQLite close/reopen (${journal})`, async () => {
    const directory = await mkdtemp(join(tmpdir(), "scripture-scope-"));
    try {
      const filename = join(directory, "receipts.sqlite");
      const first = openDatabase(filename);
      try {
        first.db.exec(`PRAGMA journal_mode=${journal}`);
        samples(first);
        first.db.prepare("UPDATE chapter_read_receipts SET consumed_at=CURRENT_TIMESTAMP WHERE id='a-personal'").run();
      } finally { first.db.close(); }
      const second = openDatabase(filename);
      try {
        assert.equal(second.findReceipt("alice", "GEN", 12, ""), undefined);
        assert.equal(second.findReceipt("alice", "GEN", 12, "group-one")?.id, "a-group-1");
        assert.equal(second.findReceipt("alice", "GEN", 12, "group-two")?.id, "a-group-2");
        assert.equal(second.findReceipt("bob", "GEN", 12, "group-one")?.id, "other-actor");
        second.db.prepare("UPDATE chapter_read_receipts SET consumed_at=CURRENT_TIMESTAMP WHERE id='a-group-1'").run();
      } finally { second.db.close(); }
      const third = openDatabase(filename);
      try {
        assert.equal(third.findReceipt("alice", "GEN", 12, "group-one"), undefined);
        assert.equal(third.findReceipt("alice", "GEN", 12, "group-two")?.id, "a-group-2");
      } finally { third.db.close(); }
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
}
