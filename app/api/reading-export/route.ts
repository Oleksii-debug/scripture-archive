import { env } from "cloudflare:workers";
import { authenticateRequest } from "../../../lib/auth";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" };
const error = (message: string, status: number) => Response.json({ error: message }, { status, headers });

export async function GET(request: Request) {
  if (!env.DB) return error("database_unavailable", 503);
  const identity = await authenticateRequest(request);
  if (!identity || identity.provider === "agent") return error("authentication_required", 401);
  try {
    const [profile, progress, bookmarks] = await env.DB.batch([
      env.DB.prepare(`SELECT first_name,last_name,age_range,age,tradition,denomination,church,marital_status,gender,has_children,locale,sensitive_consent,sensitive_consent_version,privacy_accepted_at,public_first_name,public_last_name,public_church,public_progress,created_at,updated_at FROM profiles WHERE user_id=?`).bind(identity.userId),
      env.DB.prepare("SELECT mission_id,data,updated_at FROM progress WHERE user_id=? ORDER BY mission_id").bind(identity.userId),
      env.DB.prepare("SELECT edition,book,chapter,created_at FROM reader_bookmarks WHERE user_id=? ORDER BY created_at,book,chapter").bind(identity.userId),
    ]);
    if (!profile.success || !progress.success || !bookmarks.success) return error("export_unavailable", 503);
    const records = (progress.results as Array<{ mission_id: string; data: string; updated_at: string }>).map(row => ({
      mission: row.mission_id, data: JSON.parse(row.data), updatedAt: row.updated_at,
    }));
    const payload = { format: "scripture-archive-reading-export", version: 1, exportedAt: new Date().toISOString(),
      account: { email: identity.email }, profile: profile.results[0] ?? null, progress: records, bookmarks: bookmarks.results,
      scope: "Profile, saved reading and completed learning progress, and bookmarks. Other account data is not included." };
    return new Response(JSON.stringify(payload, null, 2), { status: 200, headers: {
      ...headers, "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="scripture-archive-reading-data.json"',
    } });
  } catch { return error("export_unavailable", 503); }
}
