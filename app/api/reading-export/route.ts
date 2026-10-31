import { env } from "cloudflare:workers";
import { authenticateRequest } from "../../../lib/auth";
import catalog from "../../../public/data/catalog.json";
import { EDITIONS } from "../../../public/editions.js";
import { validBookmarkTimestamp } from "../../../lib/bookmark-timestamp.js";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" };
const error = (message: string, status: number) => Response.json({ error: message }, { status, headers });

// Reuse the actual 66-book Bible catalogue already used by /api/account.
// Local editions can have different legitimate chapter divisions (e.g. JOL 4).
// A structurally well-formed, invented book or impossible chapter must never
// be advertised in a supposedly recoverable private READING export.
const READING_CHAPTERS = new Map<string, number>(
  catalog.books.en.map(book => [book.code, book.chapters]),
);
for (const books of Object.values(catalog.editionBooks)) {
  for (const book of books) {
    READING_CHAPTERS.set(book.code, Math.max(READING_CHAPTERS.get(book.code) ?? 0, book.chapters));
  }
}

// The canonical bookmark writer only permits local editions and validates
// passage numbering per edition, not against the max across all translations.
const PRIMARY_BOOK_CHAPTERS = new Map<string, number>(catalog.books.en.map(book => [book.code, book.chapters]));
const BOOKMARK_EDITION_CHAPTERS = new Map(Object.entries(catalog.editionBooks)
  .map(([edition, books]) => [edition, new Map(books.map(book => [book.code, book.chapters]))] as const));
const LOCAL_EDITION_IDS = new Set(Object.values(EDITIONS).flat()
  .filter(edition => "local" in edition && edition.local === true)
  .map(edition => edition.id));
function bookmarkChapterLimit(edition: string, book: string): number {
  return (BOOKMARK_EDITION_CHAPTERS.get(edition) ?? PRIMARY_BOOK_CHAPTERS).get(book) ?? 0;
}

export async function GET(request: Request) {
  if (!env.DB) return error("database_unavailable", 503);
  let identity: Awaited<ReturnType<typeof authenticateRequest>>;
  try { identity = await authenticateRequest(request); }
  catch { return error("export_unavailable", 503); }
  if (!identity || identity.provider === "agent") return error("authentication_required", 401);
  try {
    const [profile, progress, bookmarks, attempts] = await env.DB.batch([
      env.DB.prepare(`SELECT first_name,last_name,age_range,age,tradition,denomination,church,marital_status,gender,has_children,locale,sensitive_consent,sensitive_consent_version,privacy_accepted_at,public_first_name,public_last_name,public_church,public_progress,public_community,created_at,updated_at FROM profiles WHERE user_id=?`).bind(identity.userId),
      env.DB.prepare("SELECT mission_id,data,updated_at FROM progress WHERE user_id=? ORDER BY mission_id").bind(identity.userId),
      env.DB.prepare("SELECT edition,book,chapter,created_at FROM reader_bookmarks WHERE user_id=? ORDER BY created_at,book,chapter").bind(identity.userId),
      env.DB.prepare("SELECT id,mission_id,book_id,chapter,group_id,locale,started_at,completed_at,result_json FROM mission_attempts WHERE actor_id=? AND status='completed' ORDER BY completed_at,id").bind(identity.userId),
    ]);
    // Every D1 batch result must have an acknowledged success and a real row array.
    // A malformed bookmarks response formerly produced a successful export with
    // null/missing bookmarks, incorrectly presenting lost data as a complete backup.
    if ([profile, progress, bookmarks, attempts].some(result => result?.success !== true || !Array.isArray(result.results)))
      return error("export_unavailable", 503);
    const records = (progress.results as Array<{ mission_id: string; data: string; updated_at: string }>).map(row => {
      // A successful D1 batch does not validate individual progress metadata.
      // Missing/blank mission keys or update times would be exported as a
      // supposedly recoverable backup even though the canonical progress
      // table requires these fields to identify the saved record.
      if (!row || typeof row.mission_id !== "string" || !row.mission_id.trim() ||
          !validBookmarkTimestamp(row.updated_at))
        throw Error("invalid_progress_metadata");
      // Valid JSON alone does not establish valid saved progress. A legacy D1
      // row containing "null", a scalar or a missing body must not produce a
      // seemingly complete and restorable owner data-export archive.
      if (typeof row.data !== "string") throw Error("invalid_progress_data");
      const data: unknown = JSON.parse(row.data);
      if (data === null || typeof data !== "object") throw Error("invalid_progress_data");
      // The canonical account reader requires an ARRAY of book/chapter/title
      // receipts. A JSON object or malformed array is not a restorable reading
      // history, even if JSON.parse succeeded. Preserve other legacy mission
      // snapshot shapes (objects or arrays) without reinterpreting them.
      // Match the reader's actual canonical book/chapter bounds (including
      // edition-specific chapter numbering), not just a plausible code shape.
      // Read from the same source catalogue; do not invent a second registry.
      // Account GET and PUT both cap reading titles at 100 characters. A
      // 101..200-character legacy title is not a restorable reader receipt,
      // even though the old export accepted it as a successful backup.
      if (row.mission_id === "READING" &&
          (!Array.isArray(data) || data.length > 2000 || data.some(entry => !entry || typeof entry !== "object" ||
            Array.isArray(entry) || typeof entry.book !== "string" ||
            !/^[1-3]?[A-Z]{2,3}$/.test(entry.book) ||
            !Number.isSafeInteger(entry.chapter) || entry.chapter < 1 ||
            entry.chapter > (READING_CHAPTERS.get(entry.book) ?? 0) ||
            typeof entry.title !== "string" || entry.title.trim().length === 0 ||
            entry.title.length > 100) ||
            // A restorable READING export must preserve exactly the canonical
            // unique book/chapter receipts. Legacy duplicate rows would be
            // silently collapsed when written back through /api/account.
            new Set(data.map(entry => entry.book + ":" + entry.chapter)).size !== data.length))
        throw Error("invalid_reading_receipt");
      return { mission: row.mission_id, data, updatedAt: row.updated_at };
    });
    const verifiedBookmarks = (bookmarks.results as Array<{edition:string;book:string;chapter:number;created_at:string}>).map(row => {
      if (!row || typeof row.edition !== "string" || !LOCAL_EDITION_IDS.has(row.edition) ||
          typeof row.book !== "string" || !/^[1-3]?[A-Z]{2,3}$/.test(row.book) ||
          !Number.isSafeInteger(row.chapter) || row.chapter < 1 ||
          row.chapter > bookmarkChapterLimit(row.edition, row.book) ||
          !validBookmarkTimestamp(row.created_at))
        throw Error("invalid_bookmark_record");
      return row;
    });
    const attemptHistory = (attempts.results as Array<{id:string;mission_id:string;book_id:string;chapter:number;group_id:string|null;locale:string;started_at:string;completed_at:string;result_json:string}>).map(row => {
      // A saved export is not restorable when D1 returns a malformed completed
      // attempt identity/passage. Reuse the same authoritative chapter catalogue
      // as private READING receipts, including local edition chapter variants.
      if (!row || typeof row.id !== "string" || !row.id.trim() ||
          typeof row.mission_id !== "string" || !row.mission_id.trim() ||
          typeof row.book_id !== "string" || !READING_CHAPTERS.has(row.book_id) ||
          !Number.isSafeInteger(row.chapter) || row.chapter < 1 ||
          row.chapter > (READING_CHAPTERS.get(row.book_id) ?? 0) ||
          !["uk", "ru", "en"].includes(row.locale) ||
          (row.group_id !== null && (typeof row.group_id !== "string" || !row.group_id.trim())) ||
          !validBookmarkTimestamp(row.started_at) ||
          !validBookmarkTimestamp(row.completed_at))
        throw Error("invalid_attempt_metadata");
      if (typeof row.result_json !== "string") throw Error("invalid_attempt_result");
      const result = JSON.parse(row.result_json);
      if (!result || typeof result !== "object" || Array.isArray(result)) throw Error("invalid_attempt_result");
      return {id:row.id, mission:row.mission_id, book:row.book_id, chapter:row.chapter, groupId:row.group_id, locale:row.locale,
        startedAt:row.started_at, completedAt:row.completed_at, result};
    });
    const payload = { format: "scripture-archive-reading-export", version: 1, exportedAt: new Date().toISOString(),
      account: { email: identity.email }, profile: profile.results[0] ?? null, progress: records, bookmarks: verifiedBookmarks,
      attemptHistory, scope: "Profile, saved reading, completed learning progress and attempts, and bookmarks. Unfinished attempts and other account data are not included." };
    return new Response(JSON.stringify(payload, null, 2), { status: 200, headers: {
      ...headers, "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="scripture-archive-reading-data.json"',
    } });
  } catch { return error("export_unavailable", 503); }
}
