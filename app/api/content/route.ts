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
    const items = (await env.DB!.prepare("SELECT id,kind,locale,title,status,data,created_at,updated_at FROM managed_content ORDER BY updated_at DESC LIMIT 500").all()).results;
    const revisions = (await env.DB!.prepare("SELECT id,content_key,created_at,created_by FROM content_revisions ORDER BY created_at DESC LIMIT 200").all()).results;
    return Response.json({ items: items.map(item => ({ ...item, data: JSON.parse(String(item.data)) })), revisions }, { headers: { "Cache-Control": "no-store" } });
  }
  const row = await env.DB!.prepare("SELECT data,updated_at FROM site_content WHERE key='public'").first<{ data: string; updated_at: string }>();
  return Response.json(row ? { ...JSON.parse(row.data), updatedAt: row.updated_at } : EMPTY, { headers: { "Cache-Control": "no-store" } });
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
    const id = clean(body.id, 100) || crypto.randomUUID(), kind = clean(body.kind, 30), locale = clean(body.locale, 3);
    const title = clean(body.title, 200), status = clean(body.status, 20);
    const itemData = body.data && typeof body.data === "object" && !Array.isArray(body.data) ? body.data : null;
    const encoded = JSON.stringify(itemData);
    if (!KINDS.has(kind) || !LOCALES.has(locale) || !STATUSES.has(status) || !title || !itemData || encoded.length > 100_000)
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
  if (!["uk", "ru", "en"].every(locale => typeof note[locale] === "string"))
    return Response.json({ error: "invalid_content_note" }, { status: 400 });
  const liveNote = {
    uk: typeof note.uk === "string" ? note.uk.trim().slice(0, 600) : "",
    ru: typeof note.ru === "string" ? note.ru.trim().slice(0, 600) : "",
    en: typeof note.en === "string" ? note.en.trim().slice(0, 600) : "",
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
  const id = clean(new URL(request.url).searchParams.get("id"), 100);
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
