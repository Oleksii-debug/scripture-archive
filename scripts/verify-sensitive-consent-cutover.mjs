#!/usr/bin/env node
/**
 * Offline release preflight for an authorized COPY of the post-0010 SQLite/D1
 * schema. It never opens a writable connection or reveals individual records.
 *
 * A clean snapshot plus the exact 0013 database triggers are necessary but
 * NOT sufficient for a safe cutover: an old
 * writer can set public_church again after this one-time read. Release operators
 * must separately verify the deployed worker, write freeze, migration ledger,
 * backup/rollback policy, and post-deployment behavior (issue #689).
 */
import { DatabaseSync } from "node:sqlite";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED = ["user_id", "public_church", "sensitive_consent", "sensitive_consent_version"];

// Use the canonical 0013 migration as the ONLY definition of the expected
// database guard. A trigger with the right name but weaker SQL must not pass.
// The source file is public and local; no production D1 query is performed.
const migration13 = readFileSync(new URL("../drizzle/0013_public_church_consent_guard.sql", import.meta.url), "utf8");
const canonicalSql = sql => sql.trim().replace(/;\s*$/u, "").replace(/\s+/gu, " ").toLowerCase();
const expectedGuards = migration13.split("--> statement-breakpoint")
  .map(part => part.replace(/^\s*--.*$/gmu, "").trim())
  .filter(part => /^CREATE TRIGGER\b/iu.test(part))
  .map(canonicalSql);
if (expectedGuards.length !== 2 || new Set(expectedGuards).size !== 2)
  throw new Error("invalid_public_church_guard_source");

/** Check installed schema without mutating a single private profile row. */
export function inspectConsentGuard(db) {
  const installed = db.prepare("SELECT sql FROM sqlite_master WHERE type='trigger' AND tbl_name='profiles'").all();
  const actual = new Set(installed.filter(row => typeof row.sql === "string").map(row => canonicalSql(row.sql)));
  return expectedGuards.every(sql => actual.has(sql));
}

/** Read-only, fail-closed, aggregate-only inspection of the existing schema. */
export function inspectConsentSnapshot(db) {
  const columns = new Set(db.prepare("PRAGMA table_info(profiles)").all().map(row => row.name));
  if (!REQUIRED.every(name => columns.has(name)))
    throw new Error("missing_post_0010_profile_schema");
  const result = db.prepare(`
    SELECT COUNT(*) AS total,
           COALESCE(SUM(CASE
             WHEN typeof(public_church) <> 'integer' OR public_church NOT IN (0,1)
               OR typeof(sensitive_consent) <> 'integer' OR sensitive_consent NOT IN (0,1)
               OR typeof(sensitive_consent_version) <> 'integer' OR sensitive_consent_version NOT IN (0,1)
               OR (public_church = 1 AND
                  (sensitive_consent IS NOT 1 OR sensitive_consent_version IS NOT 1))
             THEN 1 ELSE 0 END),0) AS unsafe
    FROM profiles
  `).get();
  if (!result || !Number.isSafeInteger(result.total) || !Number.isSafeInteger(result.unsafe))
    throw new Error("invalid_snapshot_aggregate");
  return { total: result.total, unsafe: result.unsafe, safe: result.unsafe === 0 };
}

/** A local file COPY only. Never opens the snapshot with write permissions. */
function withSnapshot(path,read) {
  if (!path || !statSync(path).isFile()) throw new Error("snapshot_file_required");
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    db.exec("PRAGMA query_only = ON");
    return read(db);
  } finally {
    db.close();
  }
}

// Preserve the original aggregate-only API for existing private-data audits.
export function verifyConsentFile(path) {
  return withSnapshot(path, inspectConsentSnapshot);
}

// One consistent read-only snapshot for both the data gate and installed D1 guard.
export function verifyGuardedConsentFile(path) {
  return withSnapshot(path, db => ({
    ...inspectConsentSnapshot(db),
    guardInstalled: inspectConsentGuard(db),
  }));
}

const invokedAsMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsMain) {
  try {
    const outcome = verifyGuardedConsentFile(process.argv[2]);
    const status = !outcome.safe ? "SNAPSHOT_GATE_BLOCKED" :
      outcome.guardInstalled ? "SNAPSHOT_GATE_PASS" : "SNAPSHOT_GUARD_MISSING";
    // No emails, church names, IDs or private rows are ever printed.
    console.log(JSON.stringify({
      status,
      total_profiles: outcome.total,
      unsafe_visibility_rows: outcome.unsafe,
      guard_installed: outcome.guardInstalled,
      point_in_time_only: true,
      old_writer_cutover_gate_still_required: true,
    }));
    if (!outcome.safe || !outcome.guardInstalled) process.exitCode = 2;
  } catch {
    console.error("SNAPSHOT_GATE_UNAVAILABLE: readable post-0010 local snapshot required");
    process.exitCode = 2;
  }
}
