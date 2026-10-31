import { env } from "cloudflare:workers";
import { authenticateRequest, isVerifiedOwner, parseCookies, rateLimit, requestAddress, sameOrigin, sha256 } from "../../../lib/auth";
import { COMMUNITY_RUN_ID } from "../../../lib/community";
import catalog from "../../../public/data/catalog.json";
import { advanceCommunity, communityOwnerState, controlCommunity, leaseCommunityAgents } from "../../../lib/community-engine";

export const dynamic = "force-dynamic";

const clean = (value: unknown, max = 120) => typeof value === "string" ? value.trim().slice(0, max) : "";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
function directoryInteger(raw: string | null, fallback: number, min: number, max: number) {
  // Do not return fractional/NaN pagination cursors while the array slice
  // silently truncates them. Non-decimal user input retains the safe default.
  if (raw === null || !/^[0-9]{1,15}$/.test(raw)) return fallback;
  const number = Number(raw);
  return Number.isSafeInteger(number) ? Math.max(min, Math.min(max, number)) : fallback;
}
type RealRow = { id: string; display_name: string; locale: string; joined_at: string; last_active_at: string | null; reading_data: string | null; mission_count: number };

// Derive passage limits from the same authoritative catalogue as the private
// READING account endpoint. Local editions may have different chapter divisions.
const READING_CHAPTERS = new Map<string, number>(catalog.books.en.map(book => [book.code, book.chapters]));
for (const books of Object.values(catalog.editionBooks)) {
  for (const book of books) READING_CHAPTERS.set(book.code, Math.max(READING_CHAPTERS.get(book.code) ?? 0, book.chapters));
}

// A public progress badge is derived from a private persisted READING record.
// Legacy/corrupt data must never be presented as zero or as fabricated chapters.
// Mirror the canonical reader's bounded receipt shape without writing to D1.
function progressCount(raw: string | null): number {
  if (raw === null) return 0;
  if (typeof raw !== "string") throw Error("invalid_public_reading_history");
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || value.length > 2000) throw Error("invalid_public_reading_history");
  const visited = new Set<string>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw Error("invalid_public_reading_receipt");
    const receipt = entry as Record<string, unknown>;
    if (typeof receipt.book !== "string" || !/^[1-3]?[A-Z]{2,3}$/.test(receipt.book) ||
        typeof receipt.chapter !== "number" || !Number.isSafeInteger(receipt.chapter) ||
        receipt.chapter < 1 || receipt.chapter > (READING_CHAPTERS.get(receipt.book) ?? 0) ||
        typeof receipt.title !== "string" || !receipt.title.trim() || receipt.title.length > 100)
      throw Error("invalid_public_reading_receipt");
    const key = receipt.book + ":" + receipt.chapter;
    if (visited.has(key)) throw Error("duplicate_public_reading_receipt");
    visited.add(key);
  }
  return value.length;
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
      WHERE a.deleted_at IS NULL AND p.public_community=1 AND (p.public_first_name=1 OR p.public_last_name=1)
      GROUP BY a.id,p.first_name,p.last_name,p.public_first_name,p.public_last_name,p.public_progress,p.public_community,p.locale,a.created_at`),
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
    // SQL COUNT must be a real nonnegative integer. Never coerce strings,
    // missing counts or NaN into plausible public progress statistics.
    if (!row || !Number.isSafeInteger(row.mission_count) || row.mission_count < 0)
      throw Error("invalid_public_mission_count");
    const online = Boolean(row.last_active_at && new Date(`${row.last_active_at.replace(" ", "T")}Z`).getTime() >= now.getTime() - 300_000);
    return { id: row.id, displayName: row.display_name, locale: row.locale, countryCode: null, joinedAt: row.joined_at, online,
      activity: online ? "exploring" : "away", chaptersRead: progressCount(row.reading_data), missionsCompleted: row.mission_count };
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
  let identity: Awaited<ReturnType<typeof authenticateRequest>>;
  try { identity = await authenticateRequest(request); }
  catch { return json({ error: "community_unavailable" }, 503); }
  const body = await request.json().catch(() => null) as { action?: string; limit?: number } | null;
  const action = clean(body?.action, 20);
  if (action === "finish" && identity?.provider === "agent") {
    try {
      // The same authenticated agent token is the only authority for finishing
      // this lease. Never revoke all sibling sessions by member ID.
      const token = parseCookies(request).get("sa_agent");
      if (!token) return json({ error: "forbidden" }, 403);
      const tokenHash = await sha256(token);
      const member = await env.DB.prepare("SELECT persona,seed FROM community_members WHERE id=? AND run_id=?")
        .bind(identity.userId, COMMUNITY_RUN_ID).first<{persona:string;seed:number}>();
      if (!member || !Number.isSafeInteger(member.seed) || member.seed < 0)
        return json({ error: "community_state_invalid" }, 409);
      const hours = ({rare:48,moderate:24,regular:12,active:6} as Record<string,number>)[member.persona] || 24;
      const delay = hours * 3600 + member.seed % 3600;
      const logId = await sha256("community-agent-finish:" + tokenHash);
      // D1.batch executes sequentially in one transaction. SQLite changes()
      // gates each successor on the immediately previous actual mutation.
      // Therefore failed, stale, cancelled and duplicate finishes cannot
      // schedule an agent or append a fake completion event.
      const receipts = await env.DB.batch([
        env.DB.prepare(`UPDATE community_agent_sessions SET revoked_at=CURRENT_TIMESTAMP
          WHERE token_hash=? AND member_id=? AND revoked_at IS NULL AND expires_at>CURRENT_TIMESTAMP
          AND EXISTS(SELECT 1 FROM community_members m JOIN community_runs r ON r.id=m.run_id
            WHERE m.id=community_agent_sessions.member_id AND r.id=? AND r.status='running'
              AND r.control_version=community_agent_sessions.control_version)`)
          .bind(tokenHash, identity.userId, COMMUNITY_RUN_ID),
        env.DB.prepare(`UPDATE community_members SET next_action_at=datetime('now',?)
          WHERE id=? AND run_id=? AND changes()=1
          AND EXISTS(SELECT 1 FROM community_agent_sessions s JOIN community_runs r
            ON r.id=community_members.run_id WHERE s.member_id=community_members.id
              AND s.token_hash=? AND s.revoked_at IS NOT NULL AND s.control_version=r.control_version
              AND r.status='running')`)
          .bind("+" + delay + " seconds", identity.userId, COMMUNITY_RUN_ID, tokenHash),
        env.DB.prepare(`INSERT OR IGNORE INTO community_run_log(id,run_id,event_type,details_json)
          SELECT ?,?,'agent_session_completed',? WHERE changes()=1
            AND EXISTS(SELECT 1 FROM community_agent_sessions s JOIN community_members m ON m.id=s.member_id
              JOIN community_runs r ON r.id=m.run_id WHERE s.token_hash=? AND s.member_id=?
                AND s.revoked_at IS NOT NULL AND s.control_version=r.control_version
                AND r.status='running' AND r.id=?)`)
          .bind(logId, COMMUNITY_RUN_ID, JSON.stringify({memberId:identity.userId}),
            tokenHash, identity.userId, COMMUNITY_RUN_ID),
      ]);
      if (!Array.isArray(receipts) || receipts.length !== 3 ||
          receipts.some(row => row?.success !== true || !Number.isSafeInteger(row.meta?.changes) ||
            row.meta.changes < 0 || row.meta.changes > 1))
        return json({ error: "community_unavailable" }, 503);
      if (receipts[0].meta.changes === 0 &&
          receipts[1].meta.changes === 0 && receipts[2].meta.changes === 0)
        return json({ error: "agent_session_not_active" }, 409);
      if (receipts.some(row => row.meta.changes !== 1))
        return json({ error: "community_unavailable" }, 503);
      return json({ ok: true });
    } catch { return json({ error: "community_unavailable" }, 503); }
  }
  if (!isVerifiedOwner(identity)) return json({ error: "forbidden" }, 403);
  if (action === "lease") {
    return json(await leaseCommunityAgents(Math.max(1,Math.min(4,Math.trunc(Number(body?.limit)||1)))));
  }
  if (!["start","pause","resume","stop"].includes(action)) return json({error:"invalid_action"},400);
  try {
    const result=await controlCommunity(action);
    if(!result.ok)return json(result,409);
    if(action==="start"||action==="resume")await advanceCommunity();
    return json(result);
  } catch {
    // Never issue an unhandled HTML/500 for an uncertain D1 control write.
    // A failed acknowledgement is not proof that the owner command committed.
    return json({error:"community_unavailable"},503);
  }
}

export async function ownerCommunityState() { return communityOwnerState(); }
