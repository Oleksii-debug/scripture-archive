import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

// Execute the production UPSERT SQL against disposable, real SQLite tables.
// A preflight owner check cannot replace this atomic ownership guard.
const source = readFileSync(new URL("../app/api/materials/route.ts", import.meta.url), "utf8");
const upsert = source.match(/\.prepare\("(INSERT INTO study_materials[^\"]+)"\)/)?.[1];
assert.ok(upsert, "the canonical materials UPSERT must be present");

function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE study_materials (id TEXT PRIMARY KEY, owner_user_id TEXT NOT NULL, title TEXT NOT NULL, locale TEXT NOT NULL, data TEXT NOT NULL, visibility TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)");
  return {
    db,
    save(id, owner, title, locale = "uk") {
      return db.prepare(upsert).run(id, owner, title, locale, JSON.stringify({ prompt: "Synthetic only" }), "private");
    },
    read(id) { return db.prepare("SELECT id,owner_user_id,title,locale,data,visibility FROM study_materials WHERE id=?").get(id); },
  };
}

test("an unrelated profile cannot mutate an existing private material", () => {
  const f = fixture();
  try {
    f.save("same-id", "profile-A", "A private lesson");
    const before = f.read("same-id");
    f.save("same-id", "profile-B", "B unwanted rewrite");
    assert.deepEqual({ ...f.read("same-id") }, { ...before });
  } finally { f.db.close(); }
});

test("the original owner can edit the same material without changing ownership", () => {
  const f = fixture();
  try {
    f.save("same-id", "profile-A", "Initial", "uk");
    f.save("same-id", "profile-A", "Updated", "ru");
    assert.equal(f.read("same-id").title, "Updated");
    assert.equal(f.read("same-id").locale, "ru");
    assert.equal(f.read("same-id").owner_user_id, "profile-A");
  } finally { f.db.close(); }
});

test("separate principals can create separate UK/RU/EN private materials", () => {
  const f = fixture();
  try {
    for (const [owner, locale] of [["A", "uk"], ["B", "ru"], ["C", "en"]]) {
      f.save(owner, owner, "Disposable " + locale, locale);
      assert.equal(f.read(owner).locale, locale);
      assert.equal(f.read(owner).owner_user_id, owner);
    }
  } finally { f.db.close(); }
});
