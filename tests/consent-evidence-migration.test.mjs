import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

test("legacy consent migration hides church without deleting profile information", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE profiles(user_id TEXT PRIMARY KEY, sensitive_consent INTEGER NOT NULL, public_church INTEGER NOT NULL, church TEXT, denomination TEXT)");
    db.prepare("INSERT INTO profiles VALUES ('reader',1,1,'Example church','Example denomination')").run();
    db.exec(await readFile(new URL("../drizzle/0010_sensitive_consent_evidence.sql", import.meta.url), "utf8"));
    const row = db.prepare("SELECT sensitive_consent, sensitive_consent_version, public_church, church, denomination FROM profiles WHERE user_id='reader'").get();
    assert.equal(row.sensitive_consent, 1);
    assert.equal(row.sensitive_consent_version, 0);
    assert.equal(row.public_church, 0);
    assert.equal(row.church, "Example church");
    assert.equal(row.denomination, "Example denomination");
  } finally { db.close(); }
});
