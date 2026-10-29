import { env } from "cloudflare:workers";
import { authenticateRequest, sameOrigin } from "../../../lib/auth";

export const dynamic = "force-dynamic";
const ownerEmail = "dordiaioleksii1@gmail.com";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
async function owner(request: Request) {
  const id = await authenticateRequest(request);
  return id && id.provider !== "agent" && id.emailVerified && id.email.toLowerCase() === ownerEmail ? id : null;
}
export async function GET(request: Request) {
  if (!env.DB) return json({error:"database_unavailable"},503);
  if (new URL(request.url).searchParams.get("view") === "me") {
    const identity = await authenticateRequest(request);
    if (!identity || identity.provider === "agent" || !identity.emailVerified) return json({editor:false});
    if (identity.email.toLowerCase() === ownerEmail) return json({editor:true,owner:true});
    if (identity.provider !== "password") return json({editor:false});
    try {
      const row = await env.DB.prepare("SELECT r.user_id FROM editorial_roles r JOIN accounts a ON a.id=r.user_id WHERE r.user_id=? AND a.deleted_at IS NULL AND a.email_verified_at IS NOT NULL").bind(identity.userId).first();
      return json({editor:Boolean(row)});
    } catch { return json({error:"database_unavailable"},503); }
  }
  if (!await owner(request)) return json({error:"forbidden"},403);
  try {
    if (new URL(request.url).searchParams.get("view") === "audit") {
      const events = await env.DB.prepare("SELECT e.id,e.subject_user_id,e.actor_user_id,e.action,e.created_at,a.email AS subject_email FROM editorial_role_events e LEFT JOIN accounts a ON a.id=e.subject_user_id AND a.deleted_at IS NULL ORDER BY e.id DESC LIMIT 200").all();
      if (!events.success || !Array.isArray(events.results)) throw Error("read failed");
      return json({events:events.results});
    }
    const rows = await env.DB.prepare("SELECT a.id,a.email,r.granted_at FROM editorial_roles r JOIN accounts a ON a.id=r.user_id WHERE a.deleted_at IS NULL ORDER BY a.email").all();
    if (!rows.success || !Array.isArray(rows.results)) throw Error("read failed");
    return json({editors:rows.results});
  } catch { return json({error:"database_unavailable"},503); }
}
export async function POST(request: Request) {
  if (!env.DB) return json({error:"database_unavailable"},503);
  if (!sameOrigin(request)) return json({error:"cross_origin_request"},403);
  const id = await owner(request);
  if (!id) return json({error:"forbidden"},403);
  const body = await request.json().catch(() => null) as {action?: unknown; userId?: unknown; email?: unknown} | null;
  if (!body || (body.action !== "grant" && body.action !== "revoke")) return json({error:"invalid_request"},400);
  const userId = typeof body.userId === "string" && body.userId.length <= 100 ? body.userId : "";
  const email = typeof body.email === "string" && body.email.length <= 254 ? body.email.trim().toLowerCase() : "";
  if ((body.action === "revoke" && !userId) || (body.action === "grant" && Boolean(userId) === Boolean(email)) || userId === id.userId) return json({error:"invalid_request"},400);
  try {
    if (body.action === "grant") {
      // One atomic conditional insert is the authority: retry and concurrent
      // grants cannot duplicate roles or audit events. Avoid D1 RETURNING/first
      // on a write; consult the acknowledged mutation count instead.
      const result = await env.DB.prepare(`INSERT OR IGNORE INTO editorial_roles(user_id,granted_by)
        SELECT id,? FROM accounts WHERE (id=? OR (?!='' AND lower(email)=?)) AND email_verified_at IS NOT NULL AND deleted_at IS NULL AND lower(email)<>?`)
        .bind(id.userId,userId,email,email,ownerEmail).run();
      if (!result.success) throw Error("write failed");
      // D1 may count the audit INSERT trigger alongside the role INSERT (2 changes).
      // Require usable metadata; never call an unacknowledged insert a duplicate.
      const changed = Number(result.meta?.changes);
      if (!Number.isSafeInteger(changed) || changed < 0) throw Error("write acknowledgement unavailable");
      return changed > 0 ? json({ok:true}) : json({error:"not_eligible_or_granted"},409);
    }
    const results = await env.DB.batch([
      env.DB.prepare("UPDATE editorial_roles SET revoked_by=? WHERE user_id=?").bind(id.userId,userId),
      env.DB.prepare("DELETE FROM editorial_roles WHERE user_id=? AND revoked_by=?").bind(userId,id.userId),
    ]);
    if (results.some(result => !result.success)) throw Error("write failed");
    return results[1].meta.changes ? json({ok:true}) : json({error:"not_found"},404);
  } catch { return json({error:"database_unavailable"},503); }
}
