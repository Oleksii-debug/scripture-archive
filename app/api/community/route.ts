import { env } from "cloudflare:workers";
import { authenticateRequest, rateLimit, requestAddress, sameOrigin } from "../../../lib/auth";
import { COMMUNITY_RUN_ID } from "../../../lib/community";
import { advanceCommunity, communityOwnerState, controlCommunity, leaseCommunityAgents } from "../../../lib/community-engine";

export const dynamic = "force-dynamic";

const OWNER_EMAIL = "dordiaioleksii1@gmail.com";
const clean = (value: unknown, max = 120) => typeof value === "string" ? value.trim().slice(0, max) : "";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
type SyntheticRow = { id: string; first_name: string; last_name: string; locale: string; country_code: string; joined_at: string; last_seen_at: string | null; activity: string | null; reading_data: string | null; mission_count: number };
type RealRow = { id: string; display_name: string; locale: string; joined_at: string; last_active_at: string | null; reading_data: string | null; mission_count: number };

function publicSynthetic(row: SyntheticRow, now: Date) {
  const online = Boolean(row.last_seen_at && new Date(`${row.last_seen_at.replace(" ", "T")}Z`).getTime() >= now.getTime() - 300_000);
  return {
    id: row.id, displayName: `${row.first_name} ${row.last_name}`, locale: row.locale,
    countryCode: row.country_code, joinedAt: row.joined_at, online,
    activity: online ? row.activity || "exploring" : "away",
    chaptersRead: progressCount(row.reading_data), missionsCompleted: Number(row.mission_count || 0),
  };
}

function progressCount(raw: string | null) {
  if (!raw) return 0;
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.length : 0;
  } catch { return 0; }
}

export async function GET(request: Request) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  if (!await rateLimit(`community:${requestAddress(request)}`, 600, 3600)) return json({ error: "too_many_requests" }, 429);
  const now = new Date();
  const action = new URL(request.url).searchParams.get("action");
  if (action === "owner") {
    const identity = await authenticateRequest(request);
    if (identity?.email !== OWNER_EMAIL) return json({ error: "forbidden" }, 403);
    return json(await communityOwnerState());
  }
  await advanceCommunity(now);
  const url = new URL(request.url), page = Math.max(1, Math.min(10000, Number(url.searchParams.get("page")) || 1));
  const pageSize = Math.max(12, Math.min(48, Number(url.searchParams.get("pageSize")) || 24));
  const query = clean(url.searchParams.get("q"), 60).toLocaleLowerCase();
  const sort = ["recent", "active", "progress", "name"].includes(clean(url.searchParams.get("sort"), 20)) ? clean(url.searchParams.get("sort"), 20) : "recent";

  const [accountCount, realOnline, realRows, syntheticRows] = await env.DB!.batch([
    env.DB!.prepare("SELECT COUNT(*) total FROM accounts WHERE deleted_at IS NULL"),
    env.DB!.prepare("SELECT COUNT(DISTINCT user_id) total FROM usage_sessions WHERE user_id IS NOT NULL AND last_seen_at>=datetime('now','-5 minutes')"),
    env.DB!.prepare(`SELECT a.id,
        trim(CASE WHEN p.public_first_name=1 THEN p.first_name ELSE '' END || ' ' || CASE WHEN p.public_last_name=1 THEN p.last_name ELSE '' END) display_name,
        p.locale,a.created_at joined_at,MAX(s.last_seen_at) last_active_at,
        CASE WHEN p.public_progress=1 THEN MAX(CASE WHEN pr.mission_id='READING' THEN pr.data END) END reading_data,
        CASE WHEN p.public_progress=1 THEN COUNT(DISTINCT CASE WHEN pr.mission_id LIKE 'OT-AB-01:%' THEN pr.mission_id END) ELSE 0 END mission_count
      FROM accounts a JOIN profiles p ON p.user_id=a.id
      LEFT JOIN usage_sessions s ON s.user_id=a.id LEFT JOIN progress pr ON pr.user_id=a.id
      WHERE a.deleted_at IS NULL AND (p.public_first_name=1 OR p.public_last_name=1)
      GROUP BY a.id,p.first_name,p.last_name,p.public_first_name,p.public_last_name,p.public_progress,p.locale,a.created_at`),
    env.DB!.prepare(`SELECT m.id,m.first_name,m.last_name,m.locale,m.country_code,m.joined_at,
      (SELECT MAX(s.last_seen_at) FROM community_agent_sessions s JOIN community_runs r ON r.id=m.run_id
        WHERE s.member_id=m.id AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP AND r.status='running' AND s.control_version=r.control_version) last_seen_at,
      (SELECT s.activity FROM community_agent_sessions s WHERE s.member_id=m.id AND s.revoked_at IS NULL
        AND s.expires_at>CURRENT_TIMESTAMP AND s.control_version=(SELECT control_version FROM community_runs WHERE id=m.run_id) ORDER BY s.last_seen_at DESC LIMIT 1) activity,
      (SELECT pr.data FROM progress pr WHERE pr.user_id=m.id AND pr.mission_id='READING') reading_data,
      (SELECT COUNT(*) FROM progress pr WHERE pr.user_id=m.id AND pr.mission_id LIKE 'OT-AB-01:%') mission_count
      FROM community_members m WHERE m.run_id=? ORDER BY m.joined_at DESC`)
      .bind(COMMUNITY_RUN_ID),
  ]);

  const synthetic = (syntheticRows.results as unknown as SyntheticRow[]).map(row => publicSynthetic(row, now));
  const real = (realRows.results as unknown as RealRow[]).map(row => {
    const online = Boolean(row.last_active_at && new Date(`${row.last_active_at.replace(" ", "T")}Z`).getTime() >= now.getTime() - 300_000);
    return { id: row.id, displayName: row.display_name, locale: row.locale, countryCode: null, joinedAt: row.joined_at, online,
      activity: online ? "exploring" : "away", chaptersRead: progressCount(row.reading_data), missionsCompleted: Number(row.mission_count||0) };
  });
  let members = [...real, ...synthetic];
  if (query) members = members.filter(member => member.displayName.toLocaleLowerCase().includes(query));
  members.sort((a, b) => sort === "name" ? a.displayName.localeCompare(b.displayName)
    : sort === "active" ? Number(b.online) - Number(a.online) || b.joinedAt.localeCompare(a.joinedAt)
      : sort === "progress" ? b.chaptersRead - a.chaptersRead || b.missionsCompleted - a.missionsCompleted
        : b.joinedAt.localeCompare(a.joinedAt));
  const totalVisible = members.length, offset = (page - 1) * pageSize;
  const syntheticOnline = synthetic.filter(member => member.online).length;
  return json({
    summary: {
      registered: Number((accountCount.results[0] as { total?: number })?.total || 0) + synthetic.length,
      online: Number((realOnline.results[0] as { total?: number })?.total || 0) + syntheticOnline,
      visible: totalVisible,
    },
    page, pageSize, totalPages: Math.max(1, Math.ceil(totalVisible / pageSize)), members: members.slice(offset, offset + pageSize),
    owner: undefined,
    schedule: undefined,
    ...(url.searchParams.get("public") === "summary" ? { members: [] } : {}),
    _internal: undefined,
  });
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
  if (identity?.email !== OWNER_EMAIL) return json({ error: "forbidden" }, 403);
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
