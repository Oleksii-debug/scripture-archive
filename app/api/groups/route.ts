import { env } from "cloudflare:workers";
import catalog from "../../../public/data/catalog.json";
import { authenticateRequest, sameOrigin, type Identity } from "../../../lib/auth";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;
const BOOK_CHAPTERS = new Map(catalog.books.en.map(book => [book.code, book.chapters]));

function clean(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function integer(value: unknown, min: number, max: number) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
}

function forbidden(status = 401) {
  return Response.json({ error: status === 401 ? "authentication_required" : "forbidden" }, { status });
}

async function profile(id: Identity) {
  return env.DB!.prepare("SELECT first_name,last_name FROM profiles WHERE user_id=?").bind(id.userId).first<{ first_name: string; last_name: string }>();
}

async function membership(groupId: string, userId: string) {
  return env.DB!.prepare("SELECT role FROM home_group_members WHERE group_id=? AND user_id=?").bind(groupId, userId).first<{ role: string }>();
}

const groupSelect = `
  SELECT g.id,g.name,g.church,g.country,g.city,g.description,g.visibility,g.roster_visibility,g.invite_code,
    g.member_activity_visibility,g.created_at,g.marathon_enabled,g.study_route,g.bible_edition,
    COALESCE(m.weekly_goal,g.weekly_goal) AS weekly_goal,COALESCE(m.catchup_mode,g.catchup_mode) AS catchup_mode,
    m.cohort_key,m.status AS cohort_status,
    (SELECT COUNT(*) FROM home_group_members hm WHERE hm.group_id=g.id) AS member_count,
    (SELECT COUNT(*) FROM group_sessions gs WHERE gs.group_id=g.id) AS session_count,
    (SELECT COUNT(DISTINCT book_id || ':' || chapter) FROM group_sessions gs WHERE gs.group_id=g.id) AS chapters_completed,
    COALESCE((SELECT SUM(answers_correct) FROM group_sessions gs WHERE gs.group_id=g.id),0)+COALESCE((SELECT SUM(first_correct) FROM group_answers ga WHERE ga.group_id=g.id),0) AS answers_correct,
    COALESCE((SELECT SUM(answers_total) FROM group_sessions gs WHERE gs.group_id=g.id),0)+(SELECT COUNT(*) FROM group_answers ga WHERE ga.group_id=g.id) AS answers_total,
    (SELECT COUNT(*) FROM group_marathon_registrations cm WHERE cm.cohort_key=m.cohort_key) AS cohort_size
  FROM home_groups g LEFT JOIN group_marathon_registrations m ON m.group_id=g.id`;

function publicGroup(row: Row, includePrivate = false) {
  const total = Number(row.answers_total || 0);
  return {
    id: row.id, name: row.name, church: row.church, country: row.country, city: row.city,
    description: row.description, visibility: row.visibility, rosterVisibility: row.roster_visibility,
    memberActivityVisibility: Boolean(row.member_activity_visibility), createdAt: row.created_at,
    weeklyGoal: Number(row.weekly_goal || 0), catchupMode: row.catchup_mode,
    marathonEnabled: Boolean(row.marathon_enabled || row.cohort_status), studyRoute: row.study_route, bibleEdition: row.bible_edition,
    cohortStatus: row.cohort_status,
    cohortSize: Number(row.cohort_size || 0), memberCount: row.roster_visibility==='private'&&!includePrivate?null:Number(row.member_count || 0),
    sessionCount: Number(row.session_count || 0), chaptersCompleted: Number(row.chapters_completed || 0),
    answersCorrect: Number(row.answers_correct || 0), answersTotal: total,
    qualityPercent: total ? Math.round(Number(row.answers_correct || 0) * 100 / total) : null,
    correctPerChapter: Number(row.chapters_completed || 0) ? Math.round(Number(row.answers_correct || 0) * 10 / Number(row.chapters_completed || 0)) / 10 : null,
    ...(includePrivate ? { inviteCode: row.invite_code } : {})
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = await authenticateRequest(request);
  const groupId = clean(url.searchParams.get("groupId"), 80);
  if (groupId) {
    const member = id ? await membership(groupId, id.userId) : null;
    const row = await env.DB!.prepare(`${groupSelect} WHERE g.id=? AND (g.visibility='public' OR ?=1)`).bind(groupId, member ? 1 : 0).first<Row>();
    if (!row) return Response.json({ error: "not_found" }, { status: 404 });
    const names = row.roster_visibility === "names"
      ? (await env.DB!.prepare("SELECT display_name,role FROM home_group_members WHERE group_id=? AND public_name=1 ORDER BY joined_at").bind(groupId).all()).results
      : [];
    const sessions = (await env.DB!.prepare("SELECT id,book_id,chapter,answers_correct,answers_total,participant_count,meeting_date,reflection FROM group_sessions WHERE group_id=? ORDER BY meeting_date DESC,created_at DESC LIMIT 12").bind(groupId).all()).results;
    const peers = row.cohort_key ? (await env.DB!.prepare(`${groupSelect} WHERE g.visibility='public' AND m.cohort_key=? ORDER BY chapters_completed DESC,g.name LIMIT 50`).bind(row.cohort_key).all<Row>()).results.map(value => publicGroup(value)) : [];
    const answers=member?(await env.DB!.prepare("SELECT task_id,solved,first_correct FROM group_answers WHERE group_id=?").bind(groupId).all()).results:[];
    return Response.json({ group: publicGroup(row, Boolean(member)), members: names, sessions, peers, answers, membership: member?.role ?? null }, { headers: { "Cache-Control": "no-store" } });
  }
  if (url.searchParams.get("mine") === "1") {
    if (!id) return forbidden();
    const rows = (await env.DB!.prepare(`${groupSelect} JOIN home_group_members mine ON mine.group_id=g.id WHERE mine.user_id=? ORDER BY g.updated_at DESC`).bind(id.userId).all<Row>()).results;
    return Response.json({ groups: rows.map(row => publicGroup(row)) }, { headers: { "Cache-Control": "no-store" } });
  }
  const rows = (await env.DB!.prepare(`${groupSelect} WHERE g.visibility='public' ORDER BY g.updated_at DESC LIMIT 100`).all<Row>()).results;
  return Response.json({ groups: rows.map(row => publicGroup(row)) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "cross_origin_request" }, { status: 403 });
  const id = await authenticateRequest(request);
  if (!id) return forbidden();
  const person = await profile(id);
  if (!person) return Response.json({ error: "profile_required" }, { status: 409 });
  const body = await request.json().catch(() => null) as Row | null;
  if (!body) return Response.json({ error: "invalid_json" }, { status: 400 });
  const action = new URL(request.url).searchParams.get("action") || "create";

  if (action === "start") {
    const groupId = clean(body.groupId, 80), member = await membership(groupId, id.userId);
    if (member?.role !== "owner") return forbidden(403);
    const registration = await env.DB!.prepare("SELECT cohort_key,status FROM group_marathon_registrations WHERE group_id=?").bind(groupId).first<{cohort_key:string;status:string}>();
    if (!registration || registration.status !== "ready") return Response.json({error:"cohort_not_ready"},{status:409});
    await env.DB!.prepare("UPDATE group_marathon_registrations SET status='active',start_date=date('now') WHERE cohort_key=? AND status='ready'").bind(registration.cohort_key).run();
    return Response.json({ok:true});
  }

  if (action === "join") {
    const code = clean(body.inviteCode, 12).toUpperCase();
    const group = await env.DB!.prepare("SELECT id FROM home_groups WHERE invite_code=?").bind(code).first<{ id: string }>();
    if (!group) return Response.json({ error: "invalid_invite" }, { status: 404 });
    await env.DB!.prepare("INSERT OR IGNORE INTO home_group_members (group_id,user_id,display_name,role,public_name,public_activity) VALUES (?,?,?,'member',?,?)")
      .bind(group.id, id.userId, `${person.first_name} ${person.last_name}`.trim(), body.publicName === true ? 1 : 0, body.publicActivity === true ? 1 : 0).run();
    return Response.json({ ok: true, groupId: group.id });
  }

  if (action === "session") {
    const groupId = clean(body.groupId, 80);
    const member = await membership(groupId, id.userId);
    if (!member || !["owner", "facilitator"].includes(member.role)) return forbidden(403);
    const bookId = clean(body.bookId, 8).toUpperCase();
    const chapter = integer(body.chapter, 1, 200);
    const participantCount = body.participantCount === "" || body.participantCount == null ? null : integer(body.participantCount, 1, 500);
    const answersTotal = integer(body.answersTotal, 0, 1000);
    const answersCorrect = integer(body.answersCorrect, 0, 1000);
    const meetingDate = clean(body.meetingDate, 10);
    const groupEdition = await env.DB!.prepare("SELECT bible_edition FROM home_groups WHERE id=?").bind(groupId).first<{bible_edition:string}>();
    const chapterLimit = groupEdition?.bible_edition === 'uk-ohiienko'
      ? catalog.editionBooks['uk-ohiienko'].find(book => book.code === bookId)?.chapters
      : BOOK_CHAPTERS.get(bookId);
    if (!chapterLimit || !chapter || chapter > Number(chapterLimit) || answersTotal == null || answersCorrect == null || answersCorrect > answersTotal || !/^\d{4}-\d{2}-\d{2}$/.test(meetingDate)) return Response.json({ error: "invalid_session" }, { status: 400 });
    if ((body.participantCount !== "" && body.participantCount != null && participantCount === null) || !Number.isFinite(Date.parse(meetingDate)) || new Date(meetingDate).toISOString().slice(0,10)!==meetingDate || meetingDate>new Date().toISOString().slice(0,10)) return Response.json({error:"invalid_session"},{status:400});
    const registration = await env.DB!.prepare("SELECT weekly_goal,catchup_mode,status,start_date FROM group_marathon_registrations WHERE group_id=?").bind(groupId).first<{weekly_goal:number;catchup_mode:string;status:string;start_date:string|null}>();
    if (registration) {
      if (registration.status !== "active" || !registration.start_date) return Response.json({error:"marathon_not_started"},{status:409});
      const start = Date.parse(registration.start_date), day = Date.parse(meetingDate), week = Math.floor((day-start)/604800000);
      if (week<0) return Response.json({error:"invalid_meeting_week"},{status:400});
      const weekStart = new Date(start+week*604800000).toISOString().slice(0,10), weekEnd = new Date(start+(week+1)*604800000).toISOString().slice(0,10);
      const used = registration.catchup_mode === "steady"
        ? await env.DB!.prepare("SELECT COUNT(DISTINCT book_id || ':' || chapter) AS count FROM group_sessions WHERE group_id=? AND meeting_date>=? AND meeting_date<?").bind(groupId,weekStart,weekEnd).first<{count:number}>()
        : await env.DB!.prepare("SELECT COUNT(DISTINCT book_id || ':' || chapter) AS count FROM group_sessions WHERE group_id=? AND meeting_date>=? AND meeting_date<?").bind(groupId,registration.start_date,weekEnd).first<{count:number}>();
      const allowed = registration.weekly_goal*(registration.catchup_mode==="steady"?1:week+1);
      const passageIndex=chapter-12,firstUnlocked=registration.catchup_mode==='steady'?week*registration.weekly_goal:0,lastUnlocked=(week+1)*registration.weekly_goal;
      if(bookId!=='GEN'||passageIndex<firstUnlocked||passageIndex>=lastUnlocked)return Response.json({error:"passage_not_in_current_plan"},{status:409});
      const repeated = await env.DB!.prepare("SELECT id FROM group_sessions WHERE group_id=? AND book_id=? AND chapter=? LIMIT 1").bind(groupId,bookId,chapter).first();
      if (!repeated && Number(used?.count||0)>=allowed) return Response.json({error:"weekly_limit_reached"},{status:409});
    }
    await env.DB!.prepare("INSERT INTO group_sessions (id,group_id,created_by,book_id,chapter,chapters_completed,answers_correct,answers_total,reflection,participant_count,meeting_date) VALUES (?,?,?,?,?,1,?,?,?,?,?)")
      .bind(crypto.randomUUID(), groupId, id.userId, bookId, chapter, answersCorrect, answersTotal, clean(body.reflection, 1200) || null, participantCount, meetingDate).run();
    await env.DB!.prepare("UPDATE home_groups SET updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(groupId).run();
    return Response.json({ ok: true });
  }

  if (action !== "create") return Response.json({ error: "unknown_action" }, { status: 400 });
  const name = clean(body.name, 100);
  const weeklyGoal = integer(body.weeklyGoal, 1, 31);
  const catchupMode = clean(body.catchupMode, 16);
  const visibility = clean(body.visibility, 12);
  const rosterVisibility = clean(body.rosterVisibility, 12);
  const marathonEnabled = body.marathonEnabled === true || body.marathonEnabled === "on" || body.marathonEnabled === "true";
  const bibleEdition = clean(body.bibleEdition, 40) || "uk-ohiienko";
  if (!["uk-kulish","uk-ohiienko","uk-khomenko","uk-turkoniak","ru-synodal","ru-nrt","ru-rsp","ru-kulakov","en-web","en-kjv","en-niv","en-esv"].includes(bibleEdition)) return Response.json({error:"invalid_edition"},{status:400});
  if (!name || !weeklyGoal || weeklyGoal % 2 === 0 || !["flexible", "steady"].includes(catchupMode) || !["public", "private"].includes(visibility) || !["count", "names", "private"].includes(rosterVisibility)) return Response.json({ error: "invalid_group" }, { status: 400 });
  const groupId = crypto.randomUUID();
  const marathonId = crypto.randomUUID();
  const inviteCode = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  const openCohort=marathonEnabled?await env.DB!.prepare("SELECT cohort_key FROM group_marathon_registrations WHERE weekly_goal=? AND catchup_mode=? AND status IN ('forming','ready') ORDER BY created_at LIMIT 1").bind(weeklyGoal,catchupMode).first<{cohort_key:string}>():null;
  const cohortKey = openCohort?.cohort_key || `abraham-${weeklyGoal}-${catchupMode}-${crypto.randomUUID().slice(0,8)}`;
  const existing = marathonEnabled ? await env.DB!.prepare("SELECT COUNT(*) AS count FROM group_marathon_registrations WHERE cohort_key=?").bind(cohortKey).first<{ count: number }>() : null;
  const cohortStatus = marathonEnabled ? (Number(existing?.count || 0) >= 1 ? "ready" : "forming") : null;
  const statements = [
    env.DB!.prepare("INSERT INTO home_groups (id,owner_user_id,name,church,country,city,description,visibility,roster_visibility,member_activity_visibility,invite_code,weekly_goal,catchup_mode,marathon_enabled,study_route,bible_edition) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(groupId, id.userId, name, clean(body.church, 160) || null, clean(body.country, 80) || null, clean(body.city, 80) || null, clean(body.description, 600) || null, visibility, rosterVisibility, body.memberActivityVisibility === true ? 1 : 0, inviteCode, weeklyGoal, catchupMode, marathonEnabled ? 1 : 0, "abraham", bibleEdition),
    env.DB!.prepare("INSERT INTO home_group_members (group_id,user_id,display_name,role,public_name,public_activity) VALUES (?,?,?,'owner',?,?)")
      .bind(groupId, id.userId, `${person.first_name} ${person.last_name}`.trim(), body.publicOwnerName === true ? 1 : 0, body.publicOwnerActivity === true ? 1 : 0)
  ];
  if (marathonEnabled) statements.push(env.DB!.prepare("INSERT INTO group_marathon_registrations (id,group_id,weekly_goal,catchup_mode,cohort_key,status) VALUES (?,?,?,?,?,?)").bind(marathonId, groupId, weeklyGoal, catchupMode, cohortKey, cohortStatus));
  await env.DB!.batch(statements);
  if (marathonEnabled && cohortStatus === "ready") await env.DB!.prepare("UPDATE group_marathon_registrations SET status='ready' WHERE cohort_key=? AND status='forming'").bind(cohortKey).run();
  return Response.json({ ok: true, groupId, cohortStatus }, { status: 201 });
}
