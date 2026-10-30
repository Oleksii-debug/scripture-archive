import { env } from "cloudflare:workers";
import { authenticateRequest, isVerifiedOwner, sameOrigin } from "../../../lib/auth";
export const dynamic = "force-dynamic";
const clean = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
// An owner export must contain restorable structured drafts and review snapshots.
// JSON.parse accepts null, scalar values and arrays, none of which the canonical
// study-material/editorial schema can restore as a material or snapshot.
function exportRecord(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "string") throw Error("invalid_export_record");
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("invalid_export_record");
  return value as Record<string, unknown>;
}

export async function GET(request: Request) {
  if (!env.DB) return Response.json({ error: "database_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  let identity: Awaited<ReturnType<typeof authenticateRequest>>;
  try { identity = await authenticateRequest(request); }
  catch {
    return Response.json({ error: "materials_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store, private" } });
  }
  const userId = identity?.userId;
  const url = new URL(request.url), mine = url.searchParams.get("mine") === "1";
  if (mine && !userId) return Response.json({ error: "authentication_required" }, { status: 401 });
  if (url.searchParams.get("export") === "1") {
    if (!mine || !identity || identity.provider === "agent") return Response.json({ error: "authentication_required" }, { status: 401, headers: { "Cache-Control": "no-store, private" } });
    try {
      const [drafts, versions] = await env.DB.batch([
        env.DB.prepare("SELECT id,title,locale,data,visibility,created_at,updated_at FROM study_materials WHERE owner_user_id=? ORDER BY created_at,id").bind(userId),
        env.DB.prepare("SELECT id,material_id,snapshot,provenance,rights_attested,status,submitted_at,reviewed_at,review_note,closed_at FROM material_submissions WHERE author_id=? ORDER BY submitted_at,id").bind(userId),
      ]);
      if (!drafts.success || !versions.success || !Array.isArray(drafts.results) || !Array.isArray(versions.results)) throw Error("export failed");
      const items = (drafts.results as Record<string, unknown>[]).map(row => ({ ...row, data: exportRecord(row.data) }));
      const history = (versions.results as Record<string, unknown>[]).map(row => ({ ...row, snapshot: exportRecord(row.snapshot) }));
      return new Response(JSON.stringify({ format: "scripture-archive-materials-export", version: 1, exportedAt: new Date().toISOString(), materials: items, submissions: history }, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="scripture-archive-materials.json"', "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" } });
    } catch { return Response.json({ error: "export_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store, private" } }); }
  }
  // Corrupt legacy JSON, D1 prepare/bind/read errors and invalid receipts
  // fail closed before any private or public study-material data is returned.
  try {
    const query = mine
      ? env.DB!.prepare("SELECT id,title,locale,data,visibility,updated_at FROM study_materials WHERE owner_user_id=? ORDER BY updated_at DESC LIMIT 100").bind(userId)
      : env.DB!.prepare("SELECT id,title,locale,data,visibility,updated_at FROM study_materials WHERE visibility='public' ORDER BY updated_at DESC LIMIT 100");
    const result = await query.all<{ id: string; data: string }>();
    if (!result.success || !Array.isArray(result.results)) throw Error("materials read failed");
    const materials = result.results.map(row => {
      const data: unknown = JSON.parse(row.data);
      if (!data || typeof data !== "object" || Array.isArray(data))
        throw Error("invalid material payload");
      if (mine) return { ...row, data };
      // Historical approved/public rows can contain arbitrary old JSON keys.
      // A denylist of answer/explanation still leaks renamed answer keys,
      // private notes or nested secrets. Emit only the fields the canonical
      // public exercise UI actually needs and reject malformed old records.
      const candidate = data as Record<string, unknown>;
      const { prompt, reference, options } = candidate;
      if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 3000 ||
          typeof reference !== "string" || !reference.trim() || reference.length > 200 ||
          !Array.isArray(options) || options.length < 2 || options.length > 8 ||
          !options.every(value => typeof value === "string" && value.trim() && value.length <= 500))
        throw Error("invalid public material fields");
      return { ...row, data: { prompt, reference, options } };
    });
    return Response.json({ materials }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "materials_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store, private" } });
  }
}

export async function POST(request: Request) {
  // Reject cross-origin mutations before consulting the session or storage.
  if (!sameOrigin(request)) return Response.json({ error: "cross_origin_request" }, { status: 403 });
  if (!env.DB) return Response.json({ error: "database_unavailable" }, { status: 503 });
  let identity: Awaited<ReturnType<typeof authenticateRequest>>;
  try { identity = await authenticateRequest(request); }
  catch {
    return Response.json({ error: "materials_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store, private" } });
  }
  const userId = identity?.userId;
  if (!userId) return Response.json({ error: "authentication_required" }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "invalid_json" }, { status: 400 });
  // The editor must review exactly what the author submitted. Silent slicing
  // of required text fields previously returned ok:true for a different
  // exercise, including a 501-character answer matching a 500-char option
  // only *after* truncation. Refuse those requests before any D1 interaction.
  if (([
    ["title", 160], ["prompt", 3000], ["reference", 200],
    ["explanation", 2000], ["answer", 500],
  ] as const).some(([key, max]) => {
    const value = body[key];
    return typeof value !== "string" || value.trim().length > max;
  })) return Response.json({ error: "invalid_material" }, { status: 400 });
  const title = clean(body.title, 160), prompt = clean(body.prompt, 3000), reference = clean(body.reference, 200),
    explanation = clean(body.explanation, 2000), answer = clean(body.answer, 500),
    // Do not silently drop malformed choices or truncate excess answers.
    // Doing so changes the authored choice set while still reporting a saved
    // canonical exercise and can misalign the editor's intended answer.
    options = Array.isArray(body.options) && body.options.length >= 2 && body.options.length <= 8 &&
      body.options.every(value => typeof value === "string" && value.trim().length > 0 && value.length <= 500)
      ? body.options.map(value => value.trim()) : [];
  if (title.length < 3 || prompt.length < 8 || reference.length < 3 || !answer || explanation.length < 8 || options.length < 2 || new Set(options).size !== options.length || !options.includes(answer))
    return Response.json({ error: "invalid_material" }, { status: 400 });
  // A supplied locale is an authorship and source-review boundary. Never
  // coerce arrays/objects to a language, or silently relabel an explicitly
  // unsupported translation as Ukrainian. An omitted/blank picker uses uk.
  const locale = body.locale === undefined || body.locale === null || body.locale === ""
    ? "uk"
    : typeof body.locale === "string" && ["uk", "ru", "en"].includes(body.locale)
      ? body.locale : null;
  if (!locale) return Response.json({ error: "invalid_material" }, { status: 400 });
  // Publication requires an immutable independent editorial approval, never a
  // direct owner toggle or an unverified matching email identity.
  if (body.visibility === "public") {
    if (!isVerifiedOwner(identity)) return Response.json({error:"forbidden"}, {status:403});
    return Response.json({error:"editorial_review_required"}, {status:409});
  }
  const visibility = "private";
  // The identifier is an ownership key. Truncating an explicit long ID could
  // silently turn it into another saved draft's existing ID and overwrite it.
  // Empty or omitted IDs remain the existing create-new-draft flow.
  if (body.id != null && (typeof body.id !== "string" || body.id.trim().length > 80))
    return Response.json({ error: "invalid_material" }, { status: 400 });
  const id = clean(body.id, 80) || crypto.randomUUID();
  // The preflight is not authoritative for ownership (the UPSERT still checks
  // it atomically), but a failed D1 read must never escape as an uncaught 500.
  let existing: { owner_user_id: string } | null;
  try {
    existing = await env.DB!.prepare("SELECT owner_user_id FROM study_materials WHERE id=?").bind(id).first<{ owner_user_id: string }>();
  } catch {
    return Response.json({ error: "material_save_failed" }, { status: 503, headers: { "Cache-Control": "no-store, private" } });
  }
  if (existing && existing.owner_user_id !== userId) return Response.json({ error: "forbidden" }, { status: 403 });
  const data = JSON.stringify({ prompt, reference, explanation, answer, options });
  // The owner constraint must be enforced by the write itself: another user can
  // create this ID after the preflight read but before the UPSERT executes.
  // Preserve owner-conditional UPSERT and acknowledge the actual D1 mutation.
  // SELECT-style .first() on a write with RETURNING is not a durable write ACK.
  try {
    const saved = await env.DB!.prepare("INSERT INTO study_materials (id,owner_user_id,title,locale,data,visibility) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,locale=excluded.locale,data=excluded.data,visibility=excluded.visibility,updated_at=CURRENT_TIMESTAMP WHERE study_materials.owner_user_id=excluded.owner_user_id")
      .bind(id, userId, title, locale, data, visibility).run();
    // This primary-key UPSERT can affect at most one row; a multi-row ACK is\n    // corrupted/uncertain evidence, not a saved-draft confirmation.\n    // A D1 mutation receipt must already be a numeric count; never coerce one.
    const changes = saved.meta?.changes;
    if (!saved.success || !Number.isSafeInteger(changes) || changes < 0 || changes > 1)
      return Response.json({ error: "material_save_failed" }, { status: 503 });
    if (changes === 0) return Response.json({ error: "forbidden" }, { status: 403 });
    return Response.json({ ok: true, id }, { status: existing ? 200 : 201 });
  } catch {
    return Response.json({ error: "material_save_failed" }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  // Reject cross-origin mutations before consulting the session or storage.
  if (!sameOrigin(request)) return Response.json({ error: "cross_origin_request" }, { status: 403 });
  if (!env.DB) return Response.json({ error: "database_unavailable" }, { status: 503 });
  let identity: Awaited<ReturnType<typeof authenticateRequest>>;
  try { identity = await authenticateRequest(request); }
  catch {
    return Response.json({ error: "materials_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store, private" } });
  }
  const userId = identity?.userId;
  if (!userId) return Response.json({ error: "authentication_required" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id || id.length > 80) return Response.json({ error: "invalid_material" }, { status: 400 });
  try {
    const result = await env.DB.prepare("DELETE FROM study_materials WHERE id=? AND owner_user_id=?").bind(id, userId).run();
    // The primary-key owner-scoped DELETE can affect zero or one row only;\n    // malformed or multi-row ACK is an unknown outcome, not success.
    const changes = result.meta?.changes;
    // A successful-looking D1 reply without an authoritative write receipt
    // cannot claim deletion, including when the service lost its ACK.
    if (!result.success || !Number.isSafeInteger(changes) || changes < 0 || changes > 1)
      return Response.json({ error: "delete_failed" }, { status: 503, headers: { "Cache-Control": "no-store, private" } });
    // Zero affected rows is an idempotent no-op: do not disclose whether a
    // private draft exists or belongs to another user.
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "delete_failed" }, { status: 503, headers: { "Cache-Control": "no-store, private" } });
  }
}
