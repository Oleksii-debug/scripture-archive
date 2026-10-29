import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const route = readFileSync(new URL("../app/api/editor-roles/route.ts", import.meta.url), "utf8");
// Execute the actual production grant predicate, not a duplicated test query.
const grantSQL = route.match(/`(INSERT OR IGNORE INTO editorial_roles\(user_id,granted_by\)[\s\S]*?)`/)?.[1];
assert.ok(grantSQL, "The production atomic role-grant SQL must be discoverable.");

function dbFixture() {
  const db=new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  db.exec("CREATE TABLE accounts(id TEXT PRIMARY KEY,email TEXT NOT NULL,email_verified_at TEXT,deleted_at TEXT)");
  db.exec(readFileSync(new URL("../drizzle/0012_editor_roles.sql",import.meta.url),"utf8"));
  const add=db.prepare("INSERT INTO accounts(id,email,email_verified_at,deleted_at) VALUES (?,?,?,?)");
  add.run("owner","owner@example.invalid","2026-10-29",null);
  add.run("alice","alice@example.invalid","2026-10-29",null);
  add.run("bob","bob@example.invalid",null,null);
  add.run("carol","carol@example.invalid","2026-10-29","2026-10-29");
  const grant=(id="",email="")=>db.prepare(grantSQL).run("owner",id,email,email,"owner@example.invalid");
  return {db,grant};
}

test("grant atomically writes one role and exactly one audit event despite duplicate and stale retries",()=>{
  const {db,grant}=dbFixture();
  try {
    assert.equal(grant("alice").changes,1);
    assert.equal(grant("alice").changes,0);
    assert.equal(grant("","alice@example.invalid").changes,0);
    assert.equal(db.prepare("SELECT count(*) n FROM editorial_roles").get().n,1);
    assert.deepEqual({...db.prepare("SELECT subject_user_id,actor_user_id,action FROM editorial_role_events").get()},
      {subject_user_id:"alice",actor_user_id:"owner",action:"grant"});
  } finally {db.close();}
});

test("grant is case-insensitive by email and refuses unverified, deleted and owner accounts",()=>{
  const {db,grant}=dbFixture();
  try {
    assert.equal(grant("","ALICE@EXAMPLE.INVALID".toLowerCase()).changes,1);
    assert.equal(grant("bob").changes,0);
    assert.equal(grant("carol").changes,0);
    assert.equal(grant("owner").changes,0);
    assert.equal(grant("missing").changes,0);
    assert.equal(grant("","unknown@example.invalid").changes,0);
    assert.equal(db.prepare("SELECT count(*) n FROM editorial_roles").get().n,1);
  } finally {db.close();}
});

test("grant and triggered audit roll back together if a transaction aborts",()=>{
  const {db,grant}=dbFixture();
  try {
    db.exec("BEGIN");
    assert.equal(grant("alice").changes,1);
    assert.equal(db.prepare("SELECT count(*) n FROM editorial_role_events").get().n,1);
    db.exec("ROLLBACK");
    assert.equal(db.prepare("SELECT count(*) n FROM editorial_role_events").get().n,0);
    assert.equal(grant("alice").changes,1);
    assert.equal(db.prepare("SELECT count(*) n FROM editorial_role_events").get().n,1);
  } finally {db.close();}
});
