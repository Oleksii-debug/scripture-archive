import { env } from "cloudflare:workers";
import { randomToken, sha256 } from "./auth";
import { COMMUNITY_RUN_ID, COMMUNITY_TARGET, communityWavePlan, identityFor, intervalSeconds, sqlDate } from "./community";

type Run = { status: string; control_version: number; paused_at: string | null; activated_at: string | null };
type Wave = { id: string; created_count: number; target_count: number; interval_pattern: string; pattern_index: number };

export async function ensureCommunityRun(now = new Date()) {
  const exists = await env.DB!.prepare("SELECT id FROM community_runs WHERE id=?").bind(COMMUNITY_RUN_ID).first();
  if (exists) return;
  const statements = [env.DB!.prepare("INSERT OR IGNORE INTO community_runs (id,status,started_at,updated_at) VALUES (?,'waiting',?,?)")
    .bind(COMMUNITY_RUN_ID, sqlDate(now), sqlDate(now))];
  for (const wave of communityWavePlan(now)) statements.push(env.DB!.prepare(
    "INSERT OR IGNORE INTO community_waves (id,run_id,label,starts_at,next_at,target_count,interval_pattern) VALUES (?,?,?,?,?,?,?)",
  ).bind(`${COMMUNITY_RUN_ID}:${wave.key}`, COMMUNITY_RUN_ID, `${wave.key}-${wave.count}`, wave.startsAt, wave.startsAt, wave.count, wave.pattern));
  // A resolved batch can carry false, missing or corrupt individual receipts.
  // Do not let START proceed on an unconfirmed run/wave initialization. The
  // INSERT OR IGNORE statements are idempotent and may legitimately change 0
  // rows when a concurrent request initialized the same canonical run.
  const receipts = await env.DB!.batch(statements);
  if (!Array.isArray(receipts) || receipts.length !== statements.length ||
      receipts.some(receipt => receipt?.success !== true ||
        !Number.isSafeInteger(receipt.meta?.changes) ||
        receipt.meta.changes < 0 || receipt.meta.changes > 1))
    throw Error("community_initialization_unconfirmed");
}

export async function advanceCommunity(now = new Date()) {
  const lease = crypto.randomUUID();
  const claimed = await env.DB!.prepare(`UPDATE community_runs SET lease_token=?,lease_until=datetime('now','+30 seconds')
    WHERE id=? AND status='running' AND (lease_until IS NULL OR lease_until<=CURRENT_TIMESTAMP)
    RETURNING control_version`).bind(lease, COMMUNITY_RUN_ID).first<{ control_version: number }>();
  if (!claimed) return;
  try {
    const waves = await env.DB!.prepare(`SELECT id,created_count,target_count,interval_pattern,pattern_index
      FROM community_waves WHERE run_id=? AND status='running' AND next_at<=? ORDER BY next_at`)
      .bind(COMMUNITY_RUN_ID, sqlDate(now)).all<Wave>();
    for (const wave of waves.results) {
      const created = Number(wave.created_count), count = created + 1;
      if (created >= Number(wave.target_count)) continue;
      const sequence = wave.id.endsWith(":initial") ? count : wave.id.endsWith(":morning") ? 100 + count
        : wave.id.endsWith(":afternoon") ? 300 + count : 600 + count;
      const person = identityFor(sequence);
      const next = sqlDate(new Date(now.getTime() + intervalSeconds(wave.interval_pattern, Number(wave.pattern_index), sqlDate(now)) * 1000));
      const allowed = "EXISTS (SELECT 1 FROM community_runs WHERE id=? AND status='running' AND lease_token=? AND control_version=?)";
      // In the same D1 transaction, progress the wave only when the preceding
      // INSERT really created its member. INSERT OR IGNORE can legally make
      // zero changes on a duplicate sequence/ID; advancing created_count
      // anyway would silently lose an agent and falsify completion.
      const receipts = await env.DB!.batch([
        env.DB!.prepare(`INSERT OR IGNORE INTO community_members
          (id,run_id,wave_id,sequence_number,first_name,last_name,locale,country_code,persona,seed,joined_at,next_action_at)
          SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE ${allowed}`)
          .bind(crypto.randomUUID(), COMMUNITY_RUN_ID, wave.id, sequence, person.firstName, person.lastName,
            person.locale, person.countryCode, person.persona, person.seed, sqlDate(now), sqlDate(now),
            COMMUNITY_RUN_ID, lease, claimed.control_version),
        env.DB!.prepare(`UPDATE community_waves SET created_count=?,pattern_index=pattern_index+1,next_at=?,status=?
          WHERE id=? AND created_count=? AND changes()=1 AND ${allowed}`)
          .bind(count, next, count === Number(wave.target_count) ? "complete" : "running", wave.id, created,
            COMMUNITY_RUN_ID, lease, claimed.control_version),
      ]);
      if (!Array.isArray(receipts) || receipts.length !== 2 ||
          receipts.some(receipt => receipt?.success !== true ||
            !Number.isSafeInteger(receipt.meta?.changes) ||
            receipt.meta.changes < 0 || receipt.meta.changes > 1) ||
          receipts[0].meta.changes !== receipts[1].meta.changes)
        throw Error("community_wave_write_unconfirmed");
    }
  } finally {
    await env.DB!.prepare("UPDATE community_runs SET lease_token=NULL,lease_until=NULL WHERE id=? AND lease_token=?")
      .bind(COMMUNITY_RUN_ID, lease).run();
  }
}

export async function controlCommunity(action: string, now = new Date()) {
  await ensureCommunityRun(now);
  const run = await env.DB!.prepare("SELECT status,control_version,paused_at,activated_at FROM community_runs WHERE id=?")
    .bind(COMMUNITY_RUN_ID).first<Run>();
  const valid = action === "start" ? run?.status === "waiting" : action === "pause" ? ["waiting","running"].includes(run?.status||"")
    : action === "resume" ? run?.status === "paused" : action === "stop" && ["waiting", "running", "paused"].includes(run?.status || "");
  if (!run || !valid) return { ok: false, error: "invalid_run_transition" };
  const status = action === "start" || action === "resume" ? "running" : action === "pause" ? "paused" : "stopped";
  const control = crypto.randomUUID();
  const activate = action === "start" || (action === "resume" && !run.activated_at);
  const guard = "EXISTS (SELECT 1 FROM community_runs WHERE id=? AND lease_token=?)";
  const statements = [env.DB!.prepare(`UPDATE community_runs SET status=?,control_version=control_version+1,lease_token=?,lease_until=NULL,
    paused_at=CASE WHEN ?='paused' THEN CURRENT_TIMESTAMP ELSE NULL END,
    started_at=CASE WHEN ?=1 THEN CURRENT_TIMESTAMP ELSE started_at END,
    activated_at=CASE WHEN ?=1 THEN CURRENT_TIMESTAMP ELSE activated_at END,
    stopped_at=CASE WHEN ?='stopped' THEN CURRENT_TIMESTAMP ELSE stopped_at END,updated_at=CURRENT_TIMESTAMP
    WHERE id=? AND control_version=? AND status=?`).bind(status, control, status, activate?1:0, activate?1:0, status, COMMUNITY_RUN_ID, run.control_version, run.status)];
  if (activate) {
    for (const wave of communityWavePlan(now)) statements.push(env.DB!.prepare(
      `UPDATE community_waves SET
        starts_at=datetime((SELECT activated_at FROM community_runs WHERE id=?), ?),
        next_at=datetime((SELECT activated_at FROM community_runs WHERE id=?), ?),
        target_count=?,label=? WHERE id=? AND created_count=0 AND ${guard}`,
    ).bind(COMMUNITY_RUN_ID, `+${wave.offsetMinutes} minutes`, COMMUNITY_RUN_ID, `+${wave.offsetMinutes} minutes`,
      wave.count, `${wave.key}-${wave.count}`, `${COMMUNITY_RUN_ID}:${wave.key}`, COMMUNITY_RUN_ID, control));
  }
  if (action === "resume" && !activate) {
    // A damaged pause timestamp must not become "+NaN seconds": SQLite
    // accepts that UPDATE but writes NULL wave deadlines and can ACK resume.
    // Trust only canonical D1 UTC seconds and refuse future/invalid clocks.
    const pausedAt = run.paused_at;
    if (typeof pausedAt !== "string" ||
        !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(pausedAt))
      throw Error("community_pause_timestamp_unavailable");
    const pausedTime = Date.parse(pausedAt.replace(" ", "T") + "Z");
    if (!Number.isFinite(pausedTime) || !Number.isFinite(now.getTime()) ||
        new Date(pausedTime).toISOString().slice(0, 19).replace("T", " ") !== pausedAt ||
        pausedTime > now.getTime())
      throw Error("community_pause_timestamp_unavailable");
    const seconds = Math.floor((now.getTime() - pausedTime) / 1000);
    if (!Number.isSafeInteger(seconds))
      throw Error("community_pause_timestamp_unavailable");
    statements.push(env.DB!.prepare(`UPDATE community_waves SET next_at=datetime(next_at,?) WHERE run_id=? AND status='running' AND ${guard}`)
      .bind(`+${seconds} seconds`, COMMUNITY_RUN_ID, COMMUNITY_RUN_ID, control));
  }
  if (action === "pause" || action === "stop") {
    statements.push(env.DB!.prepare(`UPDATE community_members SET next_action_at=CURRENT_TIMESTAMP
      WHERE run_id=? AND EXISTS(SELECT 1 FROM community_agent_sessions s WHERE s.member_id=community_members.id AND s.revoked_at IS NULL) AND ${guard}`)
      .bind(COMMUNITY_RUN_ID, COMMUNITY_RUN_ID, control));
    statements.push(env.DB!.prepare(`UPDATE community_agent_sessions SET revoked_at=CURRENT_TIMESTAMP
      WHERE revoked_at IS NULL AND member_id IN (SELECT id FROM community_members WHERE run_id=?) AND ${guard}`)
      .bind(COMMUNITY_RUN_ID, COMMUNITY_RUN_ID, control));
    statements.push(env.DB!.prepare(`UPDATE mission_attempts SET status='invalidated',invalidated_at=CURRENT_TIMESTAMP,invalidation_reason='community_paused'
      WHERE status='active' AND actor_id IN(SELECT id FROM community_members WHERE run_id=?) AND ${guard}`)
      .bind(COMMUNITY_RUN_ID, COMMUNITY_RUN_ID, control));
  }
  statements.push(env.DB!.prepare(`INSERT INTO community_run_log (id,run_id,event_type,details_json) SELECT ?,?,?,? WHERE ${guard}`)
    .bind(crypto.randomUUID(), COMMUNITY_RUN_ID, action, JSON.stringify({ target: COMMUNITY_TARGET, timezone: "Europe/Warsaw" }), COMMUNITY_RUN_ID, control));
  statements.push(env.DB!.prepare("UPDATE community_runs SET lease_token=NULL WHERE id=? AND lease_token=?").bind(COMMUNITY_RUN_ID,control));
  const result=await env.DB!.batch(statements);
  // D1 may return an unacknowledged or truncated batch result after a write.
  // Never tell the owner that START/PAUSE/RESUME/STOP succeeded without
  // individual durable acknowledgements, including the audit record and
  // release of our control lease. A zero-row CAS remains an honest conflict.
  if (!Array.isArray(result) || result.length !== statements.length ||
      result.some(receipt => receipt?.success !== true ||
        !Number.isSafeInteger(receipt.meta?.changes) || receipt.meta.changes < 0))
    throw Error("community_control_write_unconfirmed");
  if (result[0].meta.changes === 0) return {ok:false,error:"run_changed"};
  if (result[0].meta.changes !== 1 ||
      result[result.length - 2].meta.changes !== 1 ||
      result[result.length - 1].meta.changes !== 1)
    throw Error("community_control_write_unconfirmed");
  return {ok:true,status};
}

export async function communityOwnerState() {
  await ensureCommunityRun();
  const receipts = await env.DB!.batch([
    env.DB!.prepare("SELECT status,started_at,activated_at,paused_at,stopped_at FROM community_runs WHERE id=?").bind(COMMUNITY_RUN_ID),
    env.DB!.prepare("SELECT label,starts_at,next_at,created_count,target_count,status FROM community_waves WHERE run_id=? ORDER BY starts_at").bind(COMMUNITY_RUN_ID),
    env.DB!.prepare("SELECT COUNT(*) total FROM community_members WHERE run_id=?").bind(COMMUNITY_RUN_ID),
    env.DB!.prepare("SELECT event_type,created_at,details_json FROM community_run_log WHERE run_id=? ORDER BY created_at DESC,rowid DESC LIMIT 50").bind(COMMUNITY_RUN_ID),
  ]);
  // The owner must never see a fabricated empty run, wave list or zero people
  // after a partial/failed D1 SELECT batch. A read is trustworthy only when
  // each individual statement acknowledged an actual array of rows.
  if (!Array.isArray(receipts) || receipts.length !== 4 ||
      receipts.some(receipt => receipt?.success !== true || !Array.isArray(receipt.results)))
    throw Error("community_owner_snapshot_unavailable");
  const [run, waves, synthetic, log] = receipts;
  const current = run.results[0] as { status?: unknown } | undefined;
  const count = (synthetic.results[0] as { total?: unknown } | undefined)?.total;
  if (run.results.length !== 1 || !current ||
      !["waiting", "running", "paused", "stopped"].includes(String(current.status)) ||
      synthetic.results.length !== 1 || !Number.isSafeInteger(count) || (count as number) < 0)
    throw Error("community_owner_snapshot_unavailable");
  return { run: current, waves: waves.results, synthetic: { total: count }, log: log.results };
}

export async function leaseCommunityAgents(limit = 2) {
  await advanceCommunity();
  const lease=crypto.randomUUID();
  const run=await env.DB!.prepare(`UPDATE community_runs SET lease_token=?,lease_until=datetime('now','+30 seconds')
    WHERE id=? AND status='running' AND (lease_until IS NULL OR lease_until<=CURRENT_TIMESTAMP)
    RETURNING control_version`).bind(lease,COMMUNITY_RUN_ID).first<{control_version:number}>();
  if(!run){
    const current=await env.DB!.prepare("SELECT status FROM community_runs WHERE id=?").bind(COMMUNITY_RUN_ID).first<{status:string}>();
    return {jobs:[],status:current?.status||"waiting"};
  }
  const jobs:Array<{memberId:string;token:string;seed:number;locale:string}>=[];
  try{
    const active=await env.DB!.prepare(`SELECT COUNT(*) count FROM community_agent_sessions s
      JOIN community_members m ON m.id=s.member_id WHERE m.run_id=? AND s.control_version=?
      AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP`).bind(COMMUNITY_RUN_ID,run.control_version).first<{count:number}>();
    // An absent/corrupt count is not evidence that another agent slot is free.
    const activeCount=active?.count;
    if (typeof activeCount !== "number" || !Number.isSafeInteger(activeCount) ||
        activeCount < 0 || activeCount > 2)
      throw Error("community_session_count_unavailable");
    const capacity=Math.max(0,Math.min(2-activeCount,limit));
    if(!capacity)return {jobs,status:"running"};
    const members=await env.DB!.prepare(`SELECT id,seed,locale FROM community_members WHERE run_id=? AND COALESCE(next_action_at,joined_at)<=CURRENT_TIMESTAMP
      AND NOT EXISTS (SELECT 1 FROM community_agent_sessions s WHERE s.member_id=community_members.id AND s.revoked_at IS NULL
        AND s.expires_at>CURRENT_TIMESTAMP AND s.control_version=?) ORDER BY COALESCE(next_action_at,joined_at) LIMIT ?`)
      .bind(COMMUNITY_RUN_ID,run.control_version,capacity).all<{id:string;seed:number;locale:string}>();
    for(const member of members.results){
      const token=randomToken();
      const inserted=await env.DB!.prepare(`INSERT INTO community_agent_sessions (token_hash,member_id,control_version,expires_at)
        SELECT ?,?,?,datetime('now','+20 minutes') WHERE EXISTS(SELECT 1 FROM community_runs
          WHERE id=? AND status='running' AND control_version=? AND lease_token=?)`)
        .bind(await sha256(token),member.id,run.control_version,COMMUNITY_RUN_ID,run.control_version,lease).run();
      // A returned D1 promise/changes value without success is not a lease.
      if (inserted?.success !== true || !Number.isSafeInteger(inserted.meta?.changes) ||
          inserted.meta.changes < 0 || inserted.meta.changes > 1)
        throw Error("community_session_insert_unconfirmed");
      if (inserted.meta.changes === 0) continue;
      const scheduled=await env.DB!.prepare("UPDATE community_members SET next_action_at=datetime('now','+20 minutes') WHERE id=?").bind(member.id).run();
      if (scheduled?.success !== true || !Number.isSafeInteger(scheduled.meta?.changes) ||
          scheduled.meta.changes !== 1)
        throw Error("community_member_schedule_unconfirmed");
      jobs.push({memberId:member.id,token,seed:member.seed,locale:member.locale});
    }
  }finally{
    await env.DB!.prepare("UPDATE community_runs SET lease_token=NULL,lease_until=NULL WHERE id=? AND lease_token=?").bind(COMMUNITY_RUN_ID,lease).run();
  }
  return {jobs,status:"running"};
}
