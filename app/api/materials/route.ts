import { env } from "cloudflare:workers";
import { authenticateRequest, isVerifiedOwner, sameOrigin } from "../../../lib/auth";
export const dynamic = "force-dynamic";
const clean = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";

export async function GET(request: Request) {
  const identity = await authenticateRequest(request), userId = identity?.userId;
  const mine = new URL(request.url).searchParams.get("mine") === "1";
  if (mine && !userId) return Response.json({ error: "authentication_required" }, { status: 401 });
  const query = mine
    ? env.DB!.prepare("SELECT id,title,locale,data,visibility,updated_at FROM study_materials WHERE owner_user_id=? ORDER BY updated_at DESC LIMIT 100").bind(userId)
    : env.DB!.prepare("SELECT id,title,locale,data,visibility,updated_at FROM study_materials WHERE visibility='public' ORDER BY updated_at DESC LIMIT 100");
  const rows = (await query.all<{ id: string; data: string }>()).results;
  return Response.json({ materials: rows.map(row => ({ ...row, data: JSON.parse(row.data) })) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "cross_origin_request" }, { status: 403 });
  const identity = await authenticateRequest(request), userId = identity?.userId;
  if (!userId) return Response.json({ error: "authentication_required" }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "invalid_json" }, { status: 400 });
  const title = clean(body.title, 160), prompt = clean(body.prompt, 3000), reference = clean(body.reference, 200),
    explanation = clean(body.explanation, 2000), answer = clean(body.answer, 500),
    options = Array.isArray(body.options) ? body.options.slice(0, 8).map(v => clean(v, 500)).filter(Boolean) : [];
  if (title.length < 3 || prompt.length < 8 || reference.length < 3 || !answer || explanation.length < 8 || options.length < 2 || !options.includes(answer))
    return Response.json({ error: "invalid_material" }, { status: 400 });
  const locale = ["uk", "ru", "en"].includes(String(body.locale)) ? String(body.locale) : "uk";
  const visibility = isVerifiedOwner(identity) && body.visibility === "public" ? "public" : "private";
  const id = clean(body.id, 80) || crypto.randomUUID();
  const existing = await env.DB!.prepare("SELECT owner_user_id FROM study_materials WHERE id=?").bind(id).first<{ owner_user_id: string }>();
  if (existing && existing.owner_user_id !== userId) return Response.json({ error: "forbidden" }, { status: 403 });
  const data = JSON.stringify({ prompt, reference, explanation, answer, options });
  // The owner constraint must be enforced by the write itself: another user can
  // create this ID after the preflight read but before the UPSERT executes.
  const saved = await env.DB!.prepare("INSERT INTO study_materials (id,owner_user_id,title,locale,data,visibility) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,locale=excluded.locale,data=excluded.data,visibility=excluded.visibility,updated_at=CURRENT_TIMESTAMP WHERE study_materials.owner_user_id=excluded.owner_user_id RETURNING id")
    .bind(id, userId, title, locale, data, visibility).first<{ id: string }>();
  if (!saved) return Response.json({ error: "forbidden" }, { status: 403 });
  return Response.json({ ok: true, id }, { status: existing ? 200 : 201 });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "cross_origin_request" }, { status: 403 });
  const identity = await authenticateRequest(request), userId = identity?.userId;
  if (!userId) return Response.json({ error: "authentication_required" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") || "";
  await env.DB!.prepare("DELETE FROM study_materials WHERE id=? AND owner_user_id=?").bind(id, userId).run();
  return Response.json({ ok: true });
}
