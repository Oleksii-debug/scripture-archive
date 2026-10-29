import { env } from "cloudflare:workers";
import { authenticateRequest, sameOrigin } from "../../../lib/auth";
export const dynamic = "force-dynamic";
const clean = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";

export async function GET(request: Request) {
  if (!env.DB) return Response.json({ error: "database_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  const identity = await authenticateRequest(request), userId = identity?.userId;
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
      const items = (drafts.results as Record<string, unknown>[]).map(row => ({ ...row, data: JSON.parse(String(row.data)) }));
      const history = (versions.results as Record<string, unknown>[]).map(row => ({ ...row, snapshot: JSON.parse(String(row.snapshot)) }));
      return new Response(JSON.stringify({ format: "scripture-archive-materials-export", version: 1, exportedAt: new Date().toISOString(), materials: items, submissions: history }, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="scripture-archive-materials.json"', "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" } });
    } catch { return Response.json({ error: "export_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store, private" } }); }
  }
  const query = mine
    ? env.DB!.prepare("SELECT id,title,locale,data,visibility,updated_at FROM study_materials WHERE owner_user_id=? ORDER BY updated_at DESC LIMIT 100").bind(userId)
    : env.DB!.prepare("SELECT id,title,locale,data,visibility,updated_at FROM study_materials WHERE visibility='public' ORDER BY updated_at DESC LIMIT 100");
  const result = await query.all<{ id: string; data: string }>();
  if (!result.success || !Array.isArray(result.results)) return Response.json({ error: "materials_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store, private" } });
  const rows = result.results;
  return Response.json({ materials: rows.map(row => {
    const data = JSON.parse(row.data);
    if (mine) return { ...row, data };
    // Older owner-published rows remain visible, but cannot reveal answers.
    const { answer: _answer, explanation: _explanation, ...publicData } = data;
    void _answer; void _explanation;
    return { ...row, data: publicData };
  }) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!env.DB) return Response.json({ error: "database_unavailable" }, { status: 503 });
  if (!sameOrigin(request)) return Response.json({ error: "cross_origin_request" }, { status: 403 });
  const identity = await authenticateRequest(request), userId = identity?.userId;
  if (!userId) return Response.json({ error: "authentication_required" }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "invalid_json" }, { status: 400 });
  const title = clean(body.title, 160), prompt = clean(body.prompt, 3000), reference = clean(body.reference, 200),
    explanation = clean(body.explanation, 2000), answer = clean(body.answer, 500),
    options = Array.isArray(body.options) ? body.options.slice(0, 8).map(v => clean(v, 500)).filter(Boolean) : [];
  if (title.length < 3 || prompt.length < 8 || reference.length < 3 || !answer || explanation.length < 8 || options.length < 2 || new Set(options).size !== options.length || !options.includes(answer))
    return Response.json({ error: "invalid_material" }, { status: 400 });
  const locale = ["uk", "ru", "en"].includes(String(body.locale)) ? String(body.locale) : "uk";
  // Public versions are immutable reviewed snapshots, not directly editable drafts.
  const visibility = "private";
  const id = clean(body.id, 80) || crypto.randomUUID();
  const existing = await env.DB!.prepare("SELECT owner_user_id FROM study_materials WHERE id=?").bind(id).first<{ owner_user_id: string }>();
  if (existing && existing.owner_user_id !== userId) return Response.json({ error: "forbidden" }, { status: 403 });
  const data = JSON.stringify({ prompt, reference, explanation, answer, options });
  // The owner constraint must be enforced by the write itself: another user can
  // create this ID after the preflight read but before the UPSERT executes.
  // Keep the guarded UPSERT atomic, but read the D1 mutation ACK via run().
  // A SELECT-style .first() on a write with RETURNING is not a durable ACK.
  try {
    const saved = await env.DB!.prepare("INSERT INTO study_materials (id,owner_user_id,title,locale,data,visibility) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,locale=excluded.locale,data=excluded.data,visibility=excluded.visibility,updated_at=CURRENT_TIMESTAMP WHERE study_materials.owner_user_id=excluded.owner_user_id")
      .bind(id, userId, title, locale, data, visibility).run();
    const changes = Number(saved.meta?.changes);
    if (!saved.success || !Number.isSafeInteger(changes) || changes < 0)
      return Response.json({ error: "material_save_failed" }, { status: 503 });
    if (changes === 0) return Response.json({ error: "forbidden" }, { status: 403 });
    return Response.json({ ok: true, id }, { status: existing ? 200 : 201 });
  } catch {
    return Response.json({ error: "material_save_failed" }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!env.DB) return Response.json({ error: "database_unavailable" }, { status: 503 });
  if (!sameOrigin(request)) return Response.json({ error: "cross_origin_request" }, { status: 403 });
  const identity = await authenticateRequest(request), userId = identity?.userId;
  if (!userId) return Response.json({ error: "authentication_required" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id || id.length > 80) return Response.json({ error: "invalid_material" }, { status: 400 });
  const result = await env.DB.prepare("DELETE FROM study_materials WHERE id=? AND owner_user_id=?").bind(id, userId).run();
  if (!result.success) return Response.json({ error: "delete_failed" }, { status: 503 });
  return Response.json({ ok: true });
}
