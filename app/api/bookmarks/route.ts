import { env } from "cloudflare:workers";
import { authenticateRequest, sameOrigin } from "../../../lib/auth";
import catalog from "../../../public/data/catalog.json";
import { EDITIONS } from "../../../public/editions.js";

export const dynamic = "force-dynamic";
// Reuse canonical Bible chapter limits; avoid maintaining another book list.
const BOOK_CHAPTERS = new Map(catalog.books.en.map(book => [book.code, book.chapters]));
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

function valid(body: unknown): body is { edition: string; book: string; chapter: number } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const value = body as Record<string, unknown>;
  return typeof value.edition === "string" && /^[a-z0-9-]{1,40}$/.test(value.edition)
    && typeof value.book === "string" && /^[1-3]?[A-Z]{2,3}$/.test(value.book)
    && typeof value.chapter === "number" && Number.isInteger(value.chapter) && value.chapter >= 1 && value.chapter <= 151;
}

export async function GET(request: Request) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  // An identity-store outage is not the same as a signed-out reader.
  let id: string | null;
  try { id = await user(request); }
  catch { return json({ error: "bookmarks_unavailable" }, 503); }
  if (!id) return json({ error: "authentication_required" }, 401);
  try {
    const rows = await env.DB.prepare("SELECT edition,book,chapter,created_at FROM reader_bookmarks WHERE user_id=? ORDER BY created_at DESC,book,chapter LIMIT 500").bind(id).all();
    if (!rows.success || !Array.isArray(rows.results)) return json({ error: "bookmarks_unavailable" }, 503);
    return json({ bookmarks: rows.results });
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
  // Reject nonexistent chapters on PUT. Keep DELETE able to clean up old invalid entries.
  if (!valid(body) || (!remove && (!LOCAL_EDITION_IDS.has(body.edition) || body.chapter > (BOOK_CHAPTERS.get(body.book) ?? 0))))
    return json({ error: "invalid_bookmark" }, 400);
  // D1 may return a failure receipt or throw after the caller is authenticated.
  // Never claim that a bookmark was saved or deleted unless the write ACK is
  // well formed; a failed duplicate/limit probe is equally unavailable.
  try {
    if (remove) {
      const result = await env.DB.prepare("DELETE FROM reader_bookmarks WHERE user_id=? AND edition=? AND book=? AND chapter=?").bind(id, body.edition, body.book, body.chapter).run();
      if (result?.success !== true || !Number.isInteger(result.meta?.changes) || result.meta.changes < 0)
        return json({ error: "bookmark_save_failed" }, 503);
      return json({ ok: true });
    }
    const result = await env.DB.prepare("INSERT INTO reader_bookmarks(user_id,edition,book,chapter) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM reader_bookmarks WHERE user_id=?)<500 ON CONFLICT(user_id,edition,book,chapter) DO NOTHING").bind(id, body.edition, body.book, body.chapter, id).run();
    if (result?.success !== true || !Number.isInteger(result.meta?.changes) || result.meta.changes < 0)
      return json({ error: "bookmark_save_failed" }, 503);
    if (result.meta.changes === 0) {
      const existing = await env.DB.prepare("SELECT 1 FROM reader_bookmarks WHERE user_id=? AND edition=? AND book=? AND chapter=?").bind(id, body.edition, body.book, body.chapter).first();
      if (!existing) return json({ error: "bookmark_limit" }, 409);
    }
    return json({ ok: true });
  } catch {
    return json({ error: "bookmark_save_failed" }, 503);
  }
}

export async function PUT(request: Request) { return write(request, false); }
export async function DELETE(request: Request) { return write(request, true); }
