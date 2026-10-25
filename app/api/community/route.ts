import { env } from "cloudflare:workers";
import { authenticateRequest, rateLimit, requestAddress, sameOrigin } from "../../../lib/auth";
import {
  activityFor,
  COMMUNITY_RUN_ID,
  identityFor,
  intervalSeconds,
  sqlDate,
  warsawMoment,
} from "../../../lib/community";

export const dynamic = "force-dynamic";

const OWNER_EMAIL = "dordiaioleksii1@gmail.com";
const clean = (value: unknown, max = 120) => typeof value === "string" ? value.trim().slice(0, max) : "";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
type Wave = { id: string; next_at: string; created_count: number; target_count: number; interval_pattern: string; pattern_index: number };
type SyntheticRow = { id: string; first_name: string; last_name: string; locale: string; country_code: string; persona: string; seed: number; joined_at: string };
type RealRow = { id: string; display_name: string; locale: string; joined_at: string; last_active_at: string | null; reading_data: string | null; mission_data: string | null };

async function initializeRun(now: Date) {
  const existing = await env.DB!.prepare("SELECT id FROM community_runs WHERE id=?").bind(COMMUNITY_RUN_ID).first();
  if (existing) return;
  const morning = warsawMoment(now, 8);
  const afternoon = warsawMoment(now, 15);
  const continuous = warsawMoment(now, 0, 3, 1);
  await env.DB!.batch([
    env.DB!.prepare("INSERT OR IGNORE INTO community_runs (id,status,timezone,started_at,updated_at) VALUES (?,'running','Europe/Warsaw',?,?)")
      .bind(COMMUNITY_RUN_ID, sqlDate(now), sqlDate(now)),
    env.DB!.prepare("INSERT OR IGNORE INTO community_waves (id,run_id,label,starts_at,next_at,target_count,interval_pattern) VALUES (?,?,?,?,?,100,'[180]')")
      .bind(`${COMMUNITY_RUN_ID}:initial`, COMMUNITY_RUN_ID, "initial-100", sqlDate(now), sqlDate(now)),
    env.DB!.prepare("INSERT OR IGNORE INTO community_waves (id,run_id,label,starts_at,next_at,target_count,interval_pattern) VALUES (?,?,?,?,?,200,'[120,240,360]')")
      .bind(`${COMMUNITY_RUN_ID}:morning`, COMMUNITY_RUN_ID, "morning-200", sqlDate(morning), sqlDate(morning)),
    env.DB!.prepare("INSERT OR IGNORE INTO community_waves (id,run_id,label,starts_at,next_at,target_count,interval_pattern) VALUES (?,?,?,?,?,300,'[120,180,240]')")
      .bind(`${COMMUNITY_RUN_ID}:afternoon`, COMMUNITY_RUN_ID, "afternoon-300", sqlDate(afternoon), sqlDate(afternoon)),
    env.DB!.prepare("INSERT OR IGNORE INTO community_waves (id,run_id,label,starts_at,next_at,target_count,interval_pattern) VALUES (?,?,?,?,?,1500,'adaptive')")
      .bind(`${COMMUNITY_RUN_ID}:continuous`, COMMUNITY_RUN_ID, "continuous-1500", sqlDate(continuous), sqlDate(continuous)),
    env.DB!.prepare("INSERT INTO community_run_log (id,run_id,event_type,details_json,created_at) VALUES (?,?, 'started', ?, ?)")
      .bind(crypto.randomUUID(), COMMUNITY_RUN_ID, JSON.stringify({ target: 2100, timezone: "Europe/Warsaw" }), sqlDate(now)),
  ]);
}

async function materializeDue(now = new Date()) {
  await initializeRun(now);
  const run = await env.DB!.prepare("SELECT status FROM community_runs WHERE id=?").bind(COMMUNITY_RUN_ID).first<{ status: string }>();
  if (run?.status !== "running") return;
  const waves = await env.DB!.prepare(
    "SELECT id,next_at,created_count,target_count,interval_pattern,pattern_index FROM community_waves WHERE run_id=? AND status='running' AND next_at<=? ORDER BY next_at",
  ).bind(COMMUNITY_RUN_ID, sqlDate(now)).all<Wave>();

  for (const wave of waves.results) {
    let nextAt = wave.next_at, created = Number(wave.created_count), patternIndex = Number(wave.pattern_index);
    const statements = [];
    // A bounded catch-up protects D1. Repeated page requests continue from the saved cursor.
    while (created < Number(wave.target_count) && new Date(`${nextAt.replace(" ", "T")}Z`) <= now && statements.length < 120) {
      const sequence = wave.id.endsWith(":initial") ? created + 1
        : wave.id.endsWith(":morning") ? 101 + created
          : wave.id.endsWith(":afternoon") ? 301 + created : 601 + created;
      const person = identityFor(sequence);
      statements.push(env.DB!.prepare(`INSERT OR IGNORE INTO community_members
        (id,run_id,wave_id,sequence_number,first_name,last_name,locale,country_code,persona,seed,joined_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(
        crypto.randomUUID(), COMMUNITY_RUN_ID, wave.id, sequence, person.firstName, person.lastName,
        person.locale, person.countryCode, person.persona, person.seed, nextAt,
      ));
      const seconds = intervalSeconds(wave.interval_pattern, patternIndex, nextAt);
      nextAt = sqlDate(new Date(new Date(`${nextAt.replace(" ", "T")}Z`).getTime() + seconds * 1000));
      created += 1;
      patternIndex += 1;
    }
    const finished = created >= Number(wave.target_count);
    statements.push(env.DB!.prepare("UPDATE community_waves SET next_at=?,created_count=?,pattern_index=?,status=? WHERE id=?")
      .bind(nextAt, created, patternIndex, finished ? "complete" : "running", wave.id));
    if (finished) statements.push(env.DB!.prepare("INSERT INTO community_run_log (id,run_id,event_type,details_json) VALUES (?,?, 'wave_completed', ?)")
      .bind(crypto.randomUUID(), COMMUNITY_RUN_ID, JSON.stringify({ wave: wave.id, count: created })));
    await env.DB!.batch(statements);
  }
}

function publicSynthetic(row: SyntheticRow, now: Date) {
  const activity = activityFor(Number(row.seed), row.persona, row.joined_at, now);
  return {
    id: row.id,
    displayName: `${row.first_name} ${row.last_name}`,
    locale: row.locale,
    countryCode: row.country_code,
    joinedAt: row.joined_at,
    online: activity.online,
    activity: activity.activity,
    chaptersRead: activity.chapters,
    missionsCompleted: activity.missions,
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
  await materializeDue(now);
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
        CASE WHEN p.public_progress=1 THEN MAX(CASE WHEN pr.mission_id='OT-AB-01' THEN pr.data END) END mission_data
      FROM accounts a JOIN profiles p ON p.user_id=a.id
      LEFT JOIN usage_sessions s ON s.user_id=a.id LEFT JOIN progress pr ON pr.user_id=a.id
      WHERE a.deleted_at IS NULL AND (p.public_first_name=1 OR p.public_last_name=1)
      GROUP BY a.id,p.first_name,p.last_name,p.public_first_name,p.public_last_name,p.public_progress,p.locale,a.created_at`),
    env.DB!.prepare("SELECT id,first_name,last_name,locale,country_code,persona,seed,joined_at FROM community_members WHERE run_id=? ORDER BY joined_at DESC")
      .bind(COMMUNITY_RUN_ID),
  ]);

  const synthetic = (syntheticRows.results as unknown as SyntheticRow[]).map(row => publicSynthetic(row, now));
  const real = (realRows.results as unknown as RealRow[]).map(row => {
    const online = Boolean(row.last_active_at && new Date(`${row.last_active_at.replace(" ", "T")}Z`).getTime() >= now.getTime() - 300_000);
    const mission = row.mission_data ? (() => { try { return JSON.parse(row.mission_data); } catch { return {}; } })() : {};
    return { id: row.id, displayName: row.display_name, locale: row.locale, countryCode: null, joinedAt: row.joined_at, online,
      activity: online ? "exploring" : "away", chaptersRead: progressCount(row.reading_data), missionsCompleted: mission?.complete ? 1 : 0 };
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
  if (identity?.email !== OWNER_EMAIL) return json({ error: "forbidden" }, 403);
  const body = await request.json().catch(() => null) as { action?: string } | null;
  const action = clean(body?.action, 20);
  await initializeRun(new Date());
  if (!['pause','resume','stop'].includes(action)) return json({ error: "invalid_action" }, 400);
  const status = action === "resume" ? "running" : action === "pause" ? "paused" : "stopped";
  const timeField = action === "pause" ? "paused_at=CURRENT_TIMESTAMP," : action === "stop" ? "stopped_at=CURRENT_TIMESTAMP," : "paused_at=NULL,";
  const statements = [];
  if (action === "resume") statements.push(env.DB!.prepare(`UPDATE community_waves SET next_at=datetime(next_at,
    '+' || COALESCE((SELECT unixepoch('now')-unixepoch(paused_at) FROM community_runs WHERE id=?),0) || ' seconds')
    WHERE run_id=? AND status='running'`).bind(COMMUNITY_RUN_ID, COMMUNITY_RUN_ID));
  statements.push(
    env.DB!.prepare(`UPDATE community_runs SET status=?,${timeField}updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(status, COMMUNITY_RUN_ID),
    env.DB!.prepare("INSERT INTO community_run_log (id,run_id,event_type,details_json) VALUES (?,?,?, '{}')")
      .bind(crypto.randomUUID(), COMMUNITY_RUN_ID, action),
  );
  await env.DB!.batch(statements);
  return json({ ok: true, status });
}

export async function ownerCommunityState() {
  await materializeDue();
  const [run, waves, synthetic] = await env.DB!.batch([
    env.DB!.prepare("SELECT status,started_at,paused_at,stopped_at FROM community_runs WHERE id=?").bind(COMMUNITY_RUN_ID),
    env.DB!.prepare("SELECT label,starts_at,next_at,created_count,target_count,status FROM community_waves WHERE run_id=? ORDER BY starts_at").bind(COMMUNITY_RUN_ID),
    env.DB!.prepare("SELECT COUNT(*) total FROM community_members WHERE run_id=?").bind(COMMUNITY_RUN_ID),
  ]);
  return { run: run.results[0] || null, waves: waves.results, synthetic: synthetic.results[0] || { total: 0 } };
}
