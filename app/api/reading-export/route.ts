import { env } from "cloudflare:workers";
import { authenticateRequest } from "../../../lib/auth";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" };
const error = (message: string, status: number) => Response.json({ error: message }, { status, headers });

export async function GET(request: Request) {
  if (!env.DB) return error("database_unavailable", 503);
  let identity: Awaited<ReturnType<typeof authenticateRequest>>;
  try { identity = await authenticateRequest(request); }
  catch { return error("export_unavailable", 503); }
  if (!identity || identity.provider === "agent") return error("authentication_required", 401);
  try {
    const [profile, progress, bookmarks, attempts] = await env.DB.batch([
      env.DB.prepare(`SELECT first_name,last_name,age_range,age,tradition,denomination,church,marital_status,gender,has_children,locale,sensitive_consent,sensitive_consent_version,privacy_accepted_at,public_first_name,public_last_name,public_church,public_progress,created_at,updated_at FROM profiles WHERE user_id=?`).bind(identity.userId),
      env.DB.prepare("SELECT mission_id,data,updated_at FROM progress WHERE user_id=? ORDER BY mission_id").bind(identity.userId),
      env.DB.prepare("SELECT edition,book,chapter,created_at FROM reader_bookmarks WHERE user_id=? ORDER BY created_at,book,chapter").bind(identity.userId),
      env.DB.prepare("SELECT id,mission_id,book_id,chapter,group_id,locale,started_at,completed_at,result_json FROM mission_attempts WHERE actor_id=? AND status='completed' ORDER BY completed_at,id").bind(identity.userId),
    ]);
    // Every D1 batch result must have an acknowledged success and a real row array.
    // A malformed bookmarks response formerly produced a successful export with
    // null/missing bookmarks, incorrectly presenting lost data as a complete backup.
    if ([profile, progress, bookmarks, attempts].some(result => result?.success !== true || !Array.isArray(result.results)))
      return error("export_unavailable", 503);
    const records = (progress.results as Array<{ mission_id: string; data: string; updated_at: string }>).map(row => ({
      mission: row.mission_id, data: JSON.parse(row.data), updatedAt: row.updated_at,
    }));
    const attemptHistory = (attempts.results as Array<{id:string;mission_id:string;book_id:string;chapter:number;group_id:string|null;locale:string;started_at:string;completed_at:string;result_json:string}>).map(row => {
      if (typeof row.result_json !== "string") throw Error("invalid_attempt_result");
      const result = JSON.parse(row.result_json);
      if (!result || typeof result !== "object" || Array.isArray(result)) throw Error("invalid_attempt_result");
      return {id:row.id, mission:row.mission_id, book:row.book_id, chapter:row.chapter, groupId:row.group_id, locale:row.locale,
        startedAt:row.started_at, completedAt:row.completed_at, result};
    });
    const payload = { format: "scripture-archive-reading-export", version: 1, exportedAt: new Date().toISOString(),
      account: { email: identity.email }, profile: profile.results[0] ?? null, progress: records, bookmarks: bookmarks.results,
      attemptHistory, scope: "Profile, saved reading, completed learning progress and attempts, and bookmarks. Unfinished attempts and other account data are not included." };
    return new Response(JSON.stringify(payload, null, 2), { status: 200, headers: {
      ...headers, "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="scripture-archive-reading-data.json"',
    } });
  } catch { return error("export_unavailable", 503); }
}
