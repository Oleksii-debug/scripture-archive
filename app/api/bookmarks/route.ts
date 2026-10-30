import { env } from "cloudflare:workers";
import { authenticateRequest, sameOrigin } from "../../../lib/auth";
import catalog from "../../../public/data/catalog.json";
import { EDITIONS } from "../../../public/editions.js";

export const dynamic = "force-dynamic";
// Reuse canonical Bible chapter limits; avoid maintaining another book list.
const BOOK_CHAPTERS = new Map(catalog.books.en.map(book => [book.code, book.chapters]));
// Editions may retain their own canonical chapter numbering. E.g. the local
// Ohiienko edition has JOL chapter 4, while the WEB reader has only three.
const EDITION_BOOK_CHAPTERS = new Map(Object.entries(catalog.editionBooks)
  .map(([edition, books]) => [edition, new Map(books.map(book => [book.code, book.chapters]))] as const));
function bookChapterLimit(edition: string, book: string) {
  return (EDITION_BOOK_CHAPTERS.get(edition) ?? BOOK_CHAPTERS).get(book) ?? 0;
}
// Only editions with an actual local reader can have a chapter bookmark.
// Reuse the edition registry shown by the canonical UI, including Ohiienko.
const LOCAL_EDITION_IDS = new Set(Object.values(EDITIONS).flat()
  .filter(edition => "local" in edition && edition.local === true)
  .map(edition => edition.id));
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

async function user(request: Request) {
  const identity = await authenticateRequest(request);
  return identity && identity.provider !== "agent" ? identity.userId : null;
}

function valid(body: unknown, remove = false): body is { edition: string; book: string; chapter: number } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const value = body as Record<string, unknown>;
  return typeof value.edition === "string" && /^[a-z0-9-]{1,40}$/.test(value.edition)
    && typeof value.book === "string" && /^[1-3]?[A-Z]{2,3}$/.test(value.book)
    && typeof value.chapter === "number" && Number.isSafeInteger(value.chapter) && value.chapter >= 1 && (remove || value.chapter <= 151);
}

// Recover malformed legacy rows without ever treating them as reader links.
// The reference binds a SQLite rowid to its complete observed row and owner;
// the DELETE compares each original column again to reject concurrent edits.
type RecoveryRow = { recovery_rowid?: unknown; edition?: unknown; book?: unknown; chapter?: unknown; created_at?: unknown };
function usableBookmark(row: unknown): row is { edition: string; book: string; chapter: number; created_at: string } {
  if (!valid(row)) return false;
  const createdAt = (row as RecoveryRow).created_at;
  return LOCAL_EDITION_IDS.has(row.edition) && row.chapter <= bookChapterLimit(row.edition, row.book)
    && typeof createdAt === "string" && Boolean(createdAt.trim());
}
function primitiveField(value: unknown): value is string | number | null {
  return value === null || typeof value === "string"
    || (typeof value === "number" && Number.isFinite(value));
}
async function recoveryReference(owner: string, row: RecoveryRow): Promise<string | null> {
  const rowid = row.recovery_rowid;
  if (typeof rowid !== "number" || !Number.isSafeInteger(rowid) || rowid < 1) return null;
  const parts = [owner, rowid, row.edition, row.book, row.chapter, row.created_at];
  if (!parts.every(primitiveField)) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(parts)));
  return String(rowid) + "." + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
function recoveryDescription(row: RecoveryRow): string {
  const text = (value: unknown) => value == null ? "(missing)"
    : typeof value === "string" ? value.slice(0, 72)
    : typeof value === "number" && Number.isFinite(value) ? String(value).slice(0, 72) : "(invalid type)";
  return [row.edition, row.book, row.chapter].map(text).join(" / ");
}
async function removeDamagedBookmark(owner: string, body: unknown) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  const reference = (body as { recovery_ref?: unknown }).recovery_ref;
  if (typeof reference !== "string" || !/^[1-9][0-9]{0,15}\.[0-9a-f]{64}$/.test(reference))
    return json({ error: "invalid_recovery_reference" }, 400);
  const rowid = Number(reference.slice(0, reference.indexOf(".")));
  if (!Number.isSafeInteger(rowid)) return json({ error: "invalid_recovery_reference" }, 400);
  try {
    const row: RecoveryRow | null = await env.DB.prepare(
      "SELECT rowid AS recovery_rowid,edition,book,chapter,created_at FROM reader_bookmarks WHERE user_id=? AND rowid=?"
    ).bind(owner, rowid).first();
    if (!row || typeof row !== "object" || Array.isArray(row)
        || usableBookmark(row) || await recoveryReference(owner, row) !== reference)
      return json({ error: "recovery_stale" }, 409);
    const result = await env.DB.prepare(
      "DELETE FROM reader_bookmarks WHERE user_id=? AND rowid=? AND edition IS ? AND book IS ? AND chapter IS ? AND created_at IS ?"
    ).bind(owner, rowid, row.edition, row.book, row.chapter, row.created_at).run();
    if (result?.success !== true || !Number.isSafeInteger(result.meta?.changes)
        || result.meta.changes < 0 || result.meta.changes > 1)
      return json({ error: "bookmarks_unavailable" }, 503);
    if (result.meta.changes !== 1) return json({ error: "recovery_stale" }, 409);
    return json({ ok: true });
  } catch {
    return json({ error: "bookmarks_unavailable" }, 503);
  }
}

export async function GET(request: Request) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  // An identity-store outage is not the same as a signed-out reader.
  let id: string | null;
  try { id = await user(request); }
  catch { return json({ error: "bookmarks_unavailable" }, 503); }
  if (!id) return json({ error: "authentication_required" }, 401);
  try {
    const rows = await env.DB.prepare("SELECT rowid AS recovery_rowid,edition,book,chapter,created_at FROM reader_bookmarks WHERE user_id=? ORDER BY created_at DESC,book,chapter LIMIT 500").bind(id).all();
    if (!rows.success || !Array.isArray(rows.results)) return json({ error: "bookmarks_unavailable" }, 503);
    // A successful SELECT is not evidence that every legacy row is a usable
    // local bookmark. The PUT path already has the canonical edition, book and
    // chapter contract; apply it before advertising saved navigation state.
    const validRows = rows.results.filter(usableBookmark).map((row: unknown) => {
      const value = row as { edition: string; book: string; chapter: number; created_at: string };
      return { edition: value.edition, book: value.book, chapter: value.chapter, created_at: value.created_at };
    });
    const damaged = rows.results.filter((row: unknown) => !usableBookmark(row));
    const recoverable = await Promise.all(damaged.map(async (row: unknown) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return null;
      const reference = await recoveryReference(id, row as RecoveryRow);
      return reference ? { reference, description: recoveryDescription(row as RecoveryRow) } : null;
    }));
    // Never advertise damaged rows as valid links, and never delete on GET.
    const recoveryEntries = recoverable.filter((row): row is { reference: string; description: string } => row !== null);
    return json({ bookmarks: validRows,
      ...(damaged.length ? { warning: "partial_bookmarks" } : {}),
      ...(recoveryEntries.length ? { invalid_bookmarks: recoveryEntries } : {}) });
  } catch { return json({ error: "bookmarks_unavailable" }, 503); }
}

async function write(request: Request, remove: boolean) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  if (!sameOrigin(request)) return json({ error: "cross_origin_request" }, 403);
  // An identity-store outage is not the same as a signed-out reader.
  let id: string | null;
  try { id = await user(request); }
  catch { return json({ error: "bookmarks_unavailable" }, 503); }
  if (!id) return json({ error: "authentication_required" }, 401);
  const body: unknown = await request.json().catch(() => null);
  if (remove && body && typeof body === "object" && !Array.isArray(body)
      && Object.prototype.hasOwnProperty.call(body, "recovery_ref"))
    return removeDamagedBookmark(id, body);
  // Reject nonexistent chapters on PUT. Keep DELETE able to clean up old invalid entries.
  if (!valid(body, remove) || (!remove && (!LOCAL_EDITION_IDS.has(body.edition) || body.chapter > bookChapterLimit(body.edition, body.book))))
    return json({ error: "invalid_bookmark" }, 400);
  // D1 may return a failure receipt or throw after the caller is authenticated.
  // Never claim that a bookmark was saved or deleted unless the write ACK is
  // well formed. Each keyed INSERT/DELETE can change at most one row; a multi-row
  // or unsafe D1 change count is not authoritative. A failed duplicate/limit
  // probe is equally unavailable.
  try {
    if (remove) {
      const result = await env.DB.prepare("DELETE FROM reader_bookmarks WHERE user_id=? AND edition=? AND book=? AND chapter=?").bind(id, body.edition, body.book, body.chapter).run();
      if (result?.success !== true || !Number.isSafeInteger(result.meta?.changes) || result.meta.changes < 0 || result.meta.changes > 1)
        return json({ error: "bookmark_save_failed" }, 503);
      return json({ ok: true });
    }
    const result = await env.DB.prepare("INSERT INTO reader_bookmarks(user_id,edition,book,chapter) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM reader_bookmarks WHERE user_id=?)<500 ON CONFLICT(user_id,edition,book,chapter) DO NOTHING").bind(id, body.edition, body.book, body.chapter, id).run();
    if (result?.success !== true || !Number.isSafeInteger(result.meta?.changes) || result.meta.changes < 0 || result.meta.changes > 1)
      return json({ error: "bookmark_save_failed" }, 503);
    if (result.meta.changes === 0) {
      // A zero-change INSERT is ambiguous: a genuine duplicate or the 500-bookmark cap.
      // A truthy, malformed D1 probe is not evidence that this user's bookmark exists.
      const existing = await env.DB.prepare("SELECT 1 AS present FROM reader_bookmarks WHERE user_id=? AND edition=? AND book=? AND chapter=?").bind(id, body.edition, body.book, body.chapter).first();
      if (existing == null) return json({ error: "bookmark_limit" }, 409);
      if (typeof existing !== "object" || Array.isArray(existing) || (existing as Record<string, unknown>).present !== 1)
        return json({ error: "bookmark_save_failed" }, 503);
    }
    return json({ ok: true });
  } catch {
    return json({ error: "bookmark_save_failed" }, 503);
  }
}

export async function PUT(request: Request) { return write(request, false); }
export async function DELETE(request: Request) { return write(request, true); }
