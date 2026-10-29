import { env } from "cloudflare:workers";
import { authenticateRequest, isVerifiedOwner, sameOrigin } from "../../../lib/auth";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
const validId = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 100;
type Snapshot = { title: string; locale: string; data: { prompt: string; reference: string; options: string[]; answer: string; explanation: string } };
function readSnapshot(raw: string): Snapshot | null {
  try {
    const v = JSON.parse(raw), d = v?.data;
    if (typeof v?.title !== "string" || v.title.trim().length < 3 || typeof v?.locale !== "string" || !d ||
      typeof d.prompt !== "string" || d.prompt.trim().length < 8 || typeof d.reference !== "string" || d.reference.trim().length < 3 ||
      typeof d.answer !== "string" || !d.answer || typeof d.explanation !== "string" || d.explanation.trim().length < 8 ||
      !Array.isArray(d.options) || d.options.length < 2 || d.options.length > 8 ||
      !d.options.every((x: unknown) => typeof x === "string") || new Set(d.options).size !== d.options.length || !d.options.includes(d.answer)) return null;
    return v as Snapshot;
  } catch { return null; }
}
function owner(identity: Awaited<ReturnType<typeof authenticateRequest>>) {
  return isVerifiedOwner(identity);
}
async function editor(identity: Awaited<ReturnType<typeof authenticateRequest>>) {
  if (!identity || identity.provider === "agent" || !identity.emailVerified) return false;
  if (owner(identity)) return true;
  if (identity.provider !== "password") return false;
  return Boolean(await env.DB!.prepare("SELECT r.user_id FROM editorial_roles r JOIN accounts a ON a.id=r.user_id WHERE r.user_id=? AND a.deleted_at IS NULL AND a.email_verified_at IS NOT NULL").bind(identity.userId).first());
}

export async function GET(request: Request) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  try {
  const view = new URL(request.url).searchParams.get("view") || "public";
  if (view === "public") {
    const rows = await env.DB.prepare("SELECT id,snapshot,provenance,submitted_at,reviewed_at FROM material_submissions WHERE status='approved' ORDER BY reviewed_at DESC,id LIMIT 200").all<{id:string;snapshot:string;provenance:string;submitted_at:string;reviewed_at:string}>();
    if (!rows.success || !Array.isArray(rows.results)) return json({ error: "materials_unavailable" }, 503);
    const items = [];
    for (const row of rows.results) {
      const item = readSnapshot(row.snapshot);
      if (!item) return json({ error: "materials_unavailable" }, 503);
      items.push({ id: row.id, title: item.title, locale: item.locale, reference: item.data.reference, prompt: item.data.prompt, options: item.data.options, provenance: row.provenance, reviewedAt: row.reviewed_at });
    }
    return json({ items });
  }
  const identity = await authenticateRequest(request);
  if (!identity || identity.provider === "agent") return json({ error: "authentication_required" }, 401);
  if (view !== "mine" && view !== "queue" && view !== "history") return json({ error: "unknown_view" }, 400);
  if ((view === "queue" || view === "history") && !await editor(identity)) return json({ error: "forbidden" }, 403);
  const query = view === "mine"
    ? env.DB.prepare("SELECT id,material_id,snapshot,provenance,status,submitted_at,reviewed_at,review_note,closed_at FROM material_submissions WHERE author_id=? ORDER BY submitted_at DESC,id DESC LIMIT 200").bind(identity.userId)
    : view === "queue"
      ? env.DB.prepare("SELECT id,material_id,snapshot,provenance,status,submitted_at,reviewed_at,review_note,closed_at,author_id,reviewed_by,source_checked,rights_checked FROM material_submissions WHERE status='pending' AND (?=1 OR EXISTS (SELECT 1 FROM editorial_roles r JOIN accounts a ON a.id=r.user_id WHERE r.user_id=? AND a.deleted_at IS NULL AND a.email_verified_at IS NOT NULL)) ORDER BY submitted_at,id LIMIT 200").bind(owner(identity) ? 1 : 0,identity.userId)
      : env.DB.prepare("SELECT id,material_id,snapshot,provenance,status,submitted_at,reviewed_at,review_note,closed_at,author_id,reviewed_by,source_checked,rights_checked FROM material_submissions WHERE (?=1 OR EXISTS (SELECT 1 FROM editorial_roles r JOIN accounts a ON a.id=r.user_id WHERE r.user_id=? AND a.deleted_at IS NULL AND a.email_verified_at IS NOT NULL)) ORDER BY submitted_at DESC,id DESC LIMIT 200").bind(owner(identity) ? 1 : 0,identity.userId);
  const rows = await query.all<{id:string;material_id:string;snapshot:string;provenance:string;status:string;submitted_at:string;reviewed_at:string|null;review_note:string;closed_at:string|null;author_id?:string;reviewed_by?:string|null;source_checked?:number;rights_checked?:number}>();
  if (!rows.success || !Array.isArray(rows.results)) return json({ error: "materials_unavailable" }, 503);
  const items = [];
  for (const row of rows.results) {
    const snapshot = readSnapshot(row.snapshot);
    if (!snapshot) return json({ error: "materials_unavailable" }, 503);
    items.push({ id: row.id, materialId: row.material_id, snapshot, provenance: row.provenance, status: row.status, submittedAt: row.submitted_at, reviewedAt: row.reviewed_at, reviewNote: row.review_note, closedAt: row.closed_at,
      ...(view === "mine" ? {} : { authorId: row.author_id, reviewerId: row.reviewed_by, sourceChecked: Boolean(row.source_checked), rightsChecked: Boolean(row.rights_checked) }) });
  }
  return json({ items });
  } catch { return json({ error: "materials_unavailable" }, 503); }
}

export async function POST(request: Request) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  if (!sameOrigin(request)) return json({ error: "cross_origin_request" }, 403);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return json({ error: "invalid_json" }, 400);
  if (body.action === "answer") {
    if (!validId(body.id) || !Number.isInteger(body.choice) || Number(body.choice) < 0) return json({ error: "invalid_answer" }, 400);
    try {
    const row = await env.DB.prepare("SELECT snapshot FROM material_submissions WHERE id=? AND status='approved'").bind(body.id).first<{snapshot:string}>();
    if (!row) return json({ error: "not_found" }, 404);
    const snapshot = readSnapshot(row.snapshot);
    if (!snapshot) return json({ error: "materials_unavailable" }, 503);
    const index = Number(body.choice);
    if (index >= snapshot.data.options.length) return json({ error: "invalid_answer" }, 400);
    const correct = snapshot.data.options[index] === snapshot.data.answer;
    return json(correct ? { correct, explanation: snapshot.data.explanation } : { correct });
    } catch { return json({ error: "materials_unavailable" }, 503); }
  }
  const identity = await authenticateRequest(request);
  if (!identity || identity.provider === "agent") return json({ error: "authentication_required" }, 401);
  if (body.action === "submit") {
    const provenance = typeof body.provenance === "string" ? body.provenance.trim() : "";
    if (!validId(body.materialId) || provenance.length < 3 || provenance.length > 1000 || body.rightsConfirmed !== true) return json({ error: "invalid_material" }, 400);
    const id = crypto.randomUUID();
    try {
      const draft = await env.DB.prepare("SELECT title,locale,data FROM study_materials WHERE id=? AND owner_user_id=?").bind(body.materialId, identity.userId).first<{title:string;locale:string;data:string}>();
      if (!draft) return json({ error: "not_found_or_pending" }, 409);
      let snapshot: string;
      try { snapshot = JSON.stringify({ title: draft.title, locale: draft.locale, data: JSON.parse(draft.data) }); }
      catch { return json({ error: "invalid_material" }, 400); }
      if (!readSnapshot(snapshot)) return json({ error: "invalid_material" }, 400);
      const result = await env.DB.prepare(`INSERT INTO material_submissions(id,material_id,author_id,snapshot,provenance,rights_attested,status)
        SELECT ?,id,owner_user_id,json_object('title',title,'locale',locale,'data',json(data)),?,1,'pending'
        FROM study_materials WHERE id=? AND owner_user_id=? AND title=? AND locale=? AND data=?
        ON CONFLICT DO NOTHING RETURNING id`).bind(id, provenance, body.materialId, identity.userId, draft.title, draft.locale, draft.data).first<{id:string}>();
      if (!result) return json({ error: "not_found_or_pending" }, 409);
      return json({ ok: true, id }, 201);
    } catch { return json({ error: "submission_failed" }, 503); }
  }
  if (body.action === "withdraw") {
    if (!validId(body.id)) return json({ error: "invalid_submission" }, 400);
    try {
    const result = await env.DB.prepare("UPDATE material_submissions SET status='withdrawn',closed_at=CURRENT_TIMESTAMP WHERE id=? AND author_id=? AND status IN ('pending','approved')").bind(body.id, identity.userId).run();
    if (!result.success) return json({ error: "withdraw_failed" }, 503);
    return result.meta.changes ? json({ ok: true }) : json({ error: "not_found_or_closed" }, 409);
    } catch { return json({ error: "withdraw_failed" }, 503); }
  }
  if (body.action === "review") {
    try { if (!await editor(identity)) return json({ error: "forbidden" }, 403); }
    catch { return json({ error: "review_failed" }, 503); }
    if (!validId(body.id) || (body.decision !== "approve" && body.decision !== "reject") || (body.note !== undefined && typeof body.note !== "string")) return json({ error: "invalid_review" }, 400);
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";
    if (body.decision === "reject" && !note) return json({ error: "review_note_required" }, 400);
    if (body.decision === "approve" && (body.sourceChecked !== true || body.rightsChecked !== true)) return json({ error: "review_checks_required" }, 400);
    try {
      const results = await env.DB.batch([
        env.DB.prepare(`UPDATE material_submissions SET status='superseded',closed_at=CURRENT_TIMESTAMP
          WHERE material_id=(SELECT material_id FROM material_submissions WHERE id=? AND status='pending' AND author_id<>?)
          AND status='approved' AND ?='approve' AND (?=1 OR EXISTS (SELECT 1 FROM editorial_roles r JOIN accounts a ON a.id=r.user_id WHERE r.user_id=? AND a.deleted_at IS NULL AND a.email_verified_at IS NOT NULL))`).bind(body.id, identity.userId, body.decision, owner(identity) ? 1 : 0, identity.userId),
        env.DB.prepare("UPDATE material_submissions SET status=?,reviewed_at=CURRENT_TIMESTAMP,reviewed_by=?,review_note=?,source_checked=?,rights_checked=? WHERE id=? AND status='pending' AND author_id<>? AND (?=1 OR EXISTS (SELECT 1 FROM editorial_roles r JOIN accounts a ON a.id=r.user_id WHERE r.user_id=? AND a.deleted_at IS NULL AND a.email_verified_at IS NOT NULL))")
          .bind(body.decision === "approve" ? "approved" : "rejected", identity.userId, note, body.sourceChecked === true ? 1 : 0, body.rightsChecked === true ? 1 : 0, body.id, identity.userId, owner(identity) ? 1 : 0, identity.userId),
      ]);
      if (results.some(result => !result.success)) return json({ error: "review_failed" }, 503);
      if (results[1].meta.changes) return json({ ok: true });
      // The write predicates remain authoritative even if this explanatory read races.
      const own = await env.DB.prepare("SELECT id FROM material_submissions WHERE id=? AND status='pending' AND author_id=?")
        .bind(body.id, identity.userId).first<{id:string}>();
      return own ? json({ error: "self_review_forbidden" }, 403) : json({ error: "not_found_or_closed" }, 409);
    } catch { return json({ error: "review_failed" }, 503); }
  }
  return json({ error: "unknown_action" }, 400);
}
