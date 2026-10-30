import { env } from "cloudflare:workers";
import { authenticateRequest, isVerifiedOwner, rateLimit, requestAddress, sameOrigin } from "../../../lib/auth";
import { COMMUNITY_RUN_ID } from "../../../lib/community";
import { advanceCommunity, communityOwnerState, controlCommunity, leaseCommunityAgents } from "../../../lib/community-engine";

export const dynamic = "force-dynamic";

const clean = (value: unknown, max = 120) => typeof value === "string" ? value.trim().slice(0, max) : "";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
function directoryInteger(raw: string | null, fallback: number, min: number, max: number) {
  // Do not return fractional/NaN pagination cursors while the array slice
  // silently truncates them. Non-decimal user input retains the safe default.
  if (raw === null || !/^[0-9]{1,5}$/.test(raw)) return fallback;
  const number = Number(raw);
  return Number.isSafeInteger(number) ? Math.max(min, Math.min(max, number)) : fallback;
}
type RealRow = { id: string; display_name: string; locale: string; joined_at: string; last_active_at: string | null; reading_data: string | null; mission_count: number };

function progressCount(raw: string | null) {
  if (!raw) return 0;
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.length : 0;
  } catch { return 0; }
}

export async function GET(request: Request) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  // A rate-limit backend failure is an outage, not a public directory HTML 500.
  try {
    if (!await rateLimit(`community:${requestAddress(request)}`, 600, 3600)) return json({ error: "too_many_requests" }, 429);
  } catch { return json({ error: "community_unavailable" }, 503); }
  const now = new Date();
  const action = new URL(request.url).searchParams.get("action");
  if (action === "owner") {
    try {
      const identity = await authenticateRequest(request);
      if (!isVerifiedOwner(identity)) return json({ error: "forbidden" }, 403);
      return json(await communityOwnerState());
    } catch { return json({ error: "community_unavailable" }, 503); }
  }
  // GET is strictly read-only: only owner-controlled POST and the existing
  // scheduled lease path may advance waves or create community members.
  // A public page view, crawler or release preflight must never trigger writes.
  try {
  const url = new URL(request.url), page = directoryInteger(url.searchParams.get("page"), 1, 1, 10000);
  const pageSize = directoryInteger(url.searchParams.get("pageSize"), 24, 12, 48);
  const query = clean(url.searchParams.get("q"), 60).toLocaleLowerCase();
  const sort = ["recent", "active", "progress", "name"].includes(clean(url.searchParams.get("sort"), 20)) ? clean(url.searchParams.get("sort"), 20) : "recent";

  const [accountCount, realOnline, realRows] = await env.DB!.batch([
    env.DB!.prepare("SELECT COUNT(*) total FROM accounts WHERE deleted_at IS NULL"),
    env.DB!.prepare("SELECT COUNT(DISTINCT s.user_id) total FROM usage_sessions s JOIN accounts a ON a.id=s.user_id AND a.deleted_at IS NULL WHERE s.last_seen_at>=datetime('now','-5 minutes')"),
    env.DB!.prepare(`SELECT a.id,
        trim(CASE WHEN p.public_first_name=1 THEN p.first_name ELSE '' END || ' ' || CASE WHEN p.public_last_name=1 THEN p.last_name ELSE '' END) display_name,
        p.locale,a.created_at joined_at,MAX(s.last_seen_at) last_active_at,
        CASE WHEN p.public_progress=1 THEN MAX(CASE WHEN pr.mission_id='READING' THEN pr.data END) END reading_data,
        CASE WHEN p.public_progress=1 THEN COUNT(DISTINCT CASE WHEN pr.mission_id LIKE 'OT-AB-01:%' THEN pr.mission_id END) ELSE 0 END mission_count
      FROM accounts a JOIN profiles p ON p.user_id=a.id
      LEFT JOIN usage_sessions s ON s.user_id=a.id LEFT JOIN progress pr ON pr.user_id=a.id
      WHERE a.deleted_at IS NULL AND (p.public_first_name=1 OR p.public_last_name=1)
      GROUP BY a.id,p.first_name,p.last_name,p.public_first_name,p.public_last_name,p.public_progress,p.locale,a.created_at`),
  ]);

  // A resolved D1 batch is not a successful read unless each individual
  // result confirms success and supplies a real row array. Never turn a
  // broken private/profile query into a fabricated zero-activity public 200.
  if ([accountCount, realOnline, realRows].some(receipt => receipt?.success !== true || !Array.isArray(receipt?.results)))
    return json({ error: "community_unavailable" }, 503);
  // SQLite COUNT always returns exactly one nonnegative integer. An empty
  // or corrupted count receipt must not be misrepresented as zero people.
  if ([accountCount, realOnline].some(receipt => receipt.results.length !== 1 ||
      typeof (receipt.results[0] as {total?:unknown})?.total !== "number" ||
      !Number.isSafeInteger((receipt.results[0] as {total:number}).total) ||
      (receipt.results[0] as {total:number}).total < 0))
    return json({ error: "community_unavailable" }, 503);
  const real = (realRows.results as unknown as RealRow[]).map(row => {
    const online = Boolean(row.last_active_at && new Date(`${row.last_active_at.replace(" ", "T")}Z`).getTime() >= now.getTime() - 300_000);
    return { id: row.id, displayName: row.display_name, locale: row.locale, countryCode: null, joinedAt: row.joined_at, online,
      activity: online ? "exploring" : "away", chaptersRead: progressCount(row.reading_data), missionsCompleted: Number(row.mission_count||0) };
  });
  let members = real;
  if (query) members = members.filter(member => member.displayName.toLocaleLowerCase().includes(query));
  members.sort((a, b) => sort === "name" ? a.displayName.localeCompare(b.displayName)
    : sort === "active" ? Number(b.online) - Number(a.online) || b.joinedAt.localeCompare(a.joinedAt)
      : sort === "progress" ? b.chaptersRead - a.chaptersRead || b.missionsCompleted - a.missionsCompleted
        : b.joinedAt.localeCompare(a.joinedAt));
  const totalVisible = members.length, offset = (page - 1) * pageSize;
  return json({
    summary: {
      registered: Number((accountCount.results[0] as { total?: number })?.total || 0),
      online: Number((realOnline.results[0] as { total?: number })?.total || 0),
      visible: totalVisible,
    },
    page, pageSize, totalPages: Math.max(1, Math.ceil(totalVisible / pageSize)), members: members.slice(offset, offset + pageSize),
    owner: undefined,
    schedule: undefined,
    ...(url.searchParams.get("public") === "summary" ? { members: [] } : {}),
    _internal: undefined,
  });
  } catch {
    // Failed lease/snapshot reads remain infrastructure errors, never 200
    // empty directory data or an unhandled HTML/500 response.
    return json({ error: "community_unavailable" }, 503);
  }
}

export async function POST(request: Request) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  if (!sameOrigin(request)) return json({ error: "cross_origin_request" }, 403);
  const identity = await authenticateRequest(request);
  const body = await request.json().catch(() => null) as { action?: string; limit?: number } | null;
  const action = clean(body?.action, 20);
  if (action === "finish" && identity?.provider === "agent") {
    await env.DB.prepare("UPDATE community_agent_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE member_id=? AND revoked_at IS NULL").bind(identity.userId).run();
    const member = await env.DB.prepare("SELECT persona,seed FROM community_members WHERE id=?").bind(identity.userId).first<{persona:string;seed:number}>();
    const hours = ({rare:48,moderate:24,regular:12,active:6} as Record<string,number>)[member?.persona||""]||24;
    await env.DB.prepare("UPDATE community_members SET next_action_at=datetime('now',?) WHERE id=?")
      .bind(`+${hours*3600+Number(member?.seed||0)%3600} seconds`,identity.userId).run();
    await env.DB.prepare("INSERT INTO community_run_log (id,run_id,event_type,details_json) VALUES (?,?,'agent_session_completed',?)")
      .bind(crypto.randomUUID(),COMMUNITY_RUN_ID,JSON.stringify({memberId:identity.userId})).run();
    return json({ok:true});
  }
  if (!isVerifiedOwner(identity)) return json({ error: "forbidden" }, 403);
  if (action === "lease") {
    return json(await leaseCommunityAgents(Math.max(1,Math.min(4,Math.trunc(Number(body?.limit)||1)))));
  }
  if (!["start","pause","resume","stop"].includes(action)) return json({error:"invalid_action"},400);
  const result=await controlCommunity(action);
  if(!result.ok)return json(result,409);
  if(action==="start"||action==="resume")await advanceCommunity();
  return json(result);
}

export async function ownerCommunityState() { return communityOwnerState(); }
