import { env } from "cloudflare:workers";
import { authenticateRequest, isVerifiedOwner, sameOrigin } from "../../../lib/auth";

export const dynamic = "force-dynamic";
const EMPTY = { updates: [], text: {}, liveNote: { uk: "", ru: "", en: "" } };

const KINDS = new Set(["book", "chapter", "translation", "mission", "question", "route", "marathon", "ui_text"]);
const LOCALES = new Set(["uk", "ru", "en", "all"]);
const STATUSES = new Set(["draft", "published", "hidden"]);
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const unavailable = () => Response.json({ error: "content_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store, private" } });

// A resolved D1 promise alone is not proof that both content changes committed.
async function contentBatchAcknowledged(write: () => Promise<unknown>): Promise<boolean> {
  try {
    const receipts = await write();
    return Array.isArray(receipts) && receipts.length === 2 &&
      receipts.every(receipt => receipt?.success === true &&
        Number.isSafeInteger(receipt?.meta?.changes) && receipt.meta.changes === 1);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  if (!env.DB) return unavailable();
  try {
  const url = new URL(request.url);
  if (url.searchParams.get("admin") === "1") {
    const identity = await authenticateRequest(request);
    if (!isVerifiedOwner(identity)) return Response.json({ error: "forbidden" }, { status: 403 });
    // A D1 response with success:false and results:[] is a read outage, not
    // an empty editorial catalog. Refuse the owner snapshot before any
    // partial data or false "no revisions" readback can reach the UI.
    const itemsRead = await env.DB!.prepare("SELECT id,kind,locale,title,status,data,created_at,updated_at FROM managed_content ORDER BY updated_at DESC LIMIT 500").all();
    if (itemsRead?.success !== true || !Array.isArray(itemsRead.results)) return unavailable();
    const revisionsRead = await env.DB!.prepare("SELECT id,content_key,created_at,created_by FROM content_revisions ORDER BY created_at DESC LIMIT 200").all();
    if (revisionsRead?.success !== true || !Array.isArray(revisionsRead.results)) return unavailable();
    // The canonical CMS writer stores only JSON objects. A persisted scalar,
    // array or coerced nonstring D1 data value is a damaged editorial item,
    // not a valid owner catalogue snapshot. Reject the complete read rather
    // than reporting a fabricated partially restorable 200 response.
    const items = itemsRead.results.map(item => {
      if (!item || typeof item !== "object" || Array.isArray(item) ||
          typeof item.data !== "string") throw Error("invalid_editorial_item_data");
      const parsed: unknown = JSON.parse(item.data);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw Error("invalid_editorial_item_data");
      return { ...item, data: parsed };
    });
    return Response.json({ items, revisions: revisionsRead.results }, { headers: { "Cache-Control": "no-store" } });
  }
  const row = await env.DB!.prepare("SELECT data,updated_at FROM site_content WHERE key='public'").first<{ data: string; updated_at: string }>();
  if (!row) return Response.json(EMPTY, { headers: { "Cache-Control": "no-store" } });
  // A successful D1 read is not proof that its persisted public JSON is an
  // object. Spreading a JSON string/array/scalar produced a misleading 200
  // with invented keys or an empty apparent publication. Never publish it.
  if (typeof row.data !== "string" || typeof row.updated_at !== "string" ||
      !row.updated_at.trim()) return unavailable();
  const published: unknown = JSON.parse(row.data);
  if (!published || typeof published !== "object" || Array.isArray(published))
    return unavailable();
  return Response.json({ ...published, updatedAt: row.updated_at }, { headers: { "Cache-Control": "no-store" } });
  } catch { return unavailable(); }
}

export async function PUT(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "cross_origin_request" }, { status: 403 });
  if (!env.DB) return unavailable();
  let identity: Awaited<ReturnType<typeof authenticateRequest>>;
  try { identity = await authenticateRequest(request); }
  catch { return unavailable(); }
  const userId = identity?.userId;
  if (!userId || !isVerifiedOwner(identity)) return Response.json({ error: "forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body !== "object" || Array.isArray(body))
    return Response.json({ error: "invalid_json" }, { status: 400 });
  if (body.action === "upsert-item") {
    // Never shorten an explicit identity into a different existing CMS key.
    // Only a genuinely absent/blank ID may request a new generated key.
    if (body.id !== undefined && body.id !== null &&
        (typeof body.id !== "string" || body.id.trim().length > 100 ||
         // An explicit nonblank ID is an exact key, not a trim-to-other-record alias.
         (body.id.trim().length > 0 && body.id !== body.id.trim())))
      return Response.json({ error: "invalid_content_item" }, { status: 400 });
    // Keep authored CMS item titles lossless. The previous clean(title,200)
    // silently shortened an overlong owner title while acknowledging success
    // and recording the altered text in the immutable revision history.
    if (typeof body.title !== "string" || body.title.trim().length > 200)
      return Response.json({ error: "invalid_content_item" }, { status: 400 });
    const id = clean(body.id, 100) || crypto.randomUUID(), kind = clean(body.kind, 30), locale = clean(body.locale, 3);
    // Author-supplied publication titles must never be silently truncated.
    // An overlong edit is invalid rather than a different saved title.
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const status = clean(body.status, 20);
    const itemData = body.data && typeof body.data === "object" && !Array.isArray(body.data) ? body.data : null;
    const encoded = JSON.stringify(itemData);
    if (!KINDS.has(kind) || !LOCALES.has(locale) || !STATUSES.has(status) || !title || title.length > 200 || !itemData || encoded.length > 100_000)
      return Response.json({ error: "invalid_content_item" }, { status: 400 });
    const snapshot = JSON.stringify({ id, kind, locale, title, status, data: itemData });
    const acknowledged = await contentBatchAcknowledged(() => env.DB!.batch([
      env.DB!.prepare("INSERT INTO managed_content (id,kind,locale,title,status,data,updated_by) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,locale=excluded.locale,title=excluded.title,status=excluded.status,data=excluded.data,updated_at=CURRENT_TIMESTAMP,updated_by=excluded.updated_by").bind(id, kind, locale, title, status, encoded, userId),
      env.DB!.prepare("INSERT INTO content_revisions (id,content_key,data,created_by) VALUES (?,?,?,?)").bind(crypto.randomUUID(), `${kind}:${id}`, snapshot, userId),
    ]));
    if (!acknowledged) return Response.json({ error: "content_save_unconfirmed" }, { status: 503 });
    return Response.json({ ok: true, id });
  }
  // The editor has two explicit commands: a reviewed item upsert above, or
  // a complete three-language note here. A typo/empty payload must never
  // silently clear already-published notes and still return HTTP 200.
  if (body.action !== undefined || !Object.prototype.hasOwnProperty.call(body, "liveNote") ||
      !body.liveNote || typeof body.liveNote !== "object" || Array.isArray(body.liveNote))
    return Response.json({ error: "invalid_content_command" }, { status: 400 });
  const note = body.liveNote as Record<string, unknown>;
  // Preserve the owner's entire authored notice or refuse the edit before
  // any D1 write. Truncating 601+ characters silently published a different
  // statement while still returning ok:true to the editor.
  if (!["uk", "ru", "en"].every(locale => {
    const value = note[locale];
    return typeof value === "string" && value.trim().length <= 600;
  }))
    return Response.json({ error: "invalid_content_note" }, { status: 400 });
  const liveNote = {
    uk: (note.uk as string).trim(),
    ru: (note.ru as string).trim(),
    en: (note.en as string).trim(),
  };
  const safe = { updates: [], text: {}, liveNote }, data = JSON.stringify(safe);
  const acknowledged = await contentBatchAcknowledged(() => env.DB!.batch([
    env.DB!.prepare("INSERT INTO content_revisions (id,content_key,data,created_by) VALUES (?,?,?,?)").bind(crypto.randomUUID(), "public", data, userId),
    env.DB!.prepare("INSERT INTO site_content (key,data,updated_at,updated_by) VALUES ('public',?,CURRENT_TIMESTAMP,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data,updated_at=CURRENT_TIMESTAMP,updated_by=excluded.updated_by").bind(data, userId),
  ]));
  if (!acknowledged) return Response.json({ error: "content_save_unconfirmed" }, { status: 503 });
  return Response.json({ ok: true, ...safe });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "cross_origin_request" }, { status: 403 });
  if (!env.DB) return unavailable();
  try {
  const identity = await authenticateRequest(request);
  if (!isVerifiedOwner(identity)) return Response.json({ error: "forbidden" }, { status: 403 });
  const requestedId = new URL(request.url).searchParams.get("id");
  // Truncation here could hide a DIFFERENT record whose key is a prefix.
  // Never silently target another record by trimming the requested key.
  if (!requestedId || !requestedId.trim() || requestedId.trim().length > 100 ||
      requestedId !== requestedId.trim())
    return Response.json({ error: "invalid_content_id" }, { status: 400 });
  const id = requestedId;
  const existing = await env.DB!.prepare("SELECT kind,title,locale,data FROM managed_content WHERE id=?").bind(id).first<Record<string, unknown>>();
  if (!existing) return Response.json({ error: "not_found" }, { status: 404 });
  const acknowledged = await contentBatchAcknowledged(() => env.DB!.batch([
    env.DB!.prepare("UPDATE managed_content SET status='hidden',updated_at=CURRENT_TIMESTAMP,updated_by=? WHERE id=?").bind(identity.userId, id),
    env.DB!.prepare("INSERT INTO content_revisions (id,content_key,data,created_by) VALUES (?,?,?,?)").bind(crypto.randomUUID(), `${existing.kind}:${id}`, JSON.stringify({ ...existing, id, status: "hidden" }), identity.userId),
  ]));
  if (!acknowledged) return Response.json({ error: "content_hide_unconfirmed" }, { status: 503 });
  return Response.json({ ok: true });
  } catch { return unavailable(); }
}
