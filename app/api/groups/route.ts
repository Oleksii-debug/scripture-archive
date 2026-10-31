import { env } from "cloudflare:workers";
import catalog from "../../../public/data/catalog.json";
import { authenticateRequest, sameOrigin, type Identity } from "../../../lib/auth";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;
const BOOK_CHAPTERS = new Map(catalog.books.en.map(book => [book.code, book.chapters]));

function clean(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// Identifiers must not alias another record when caller input is oversized.
function boundedIdentifier(value: unknown, max = 80) {
  // IDs and invite codes are exact database keys, not display text.
  // Trimming a caller's input would silently authorize a different record.
  return typeof value === "string" && value.length <= max &&
    value.length > 0 && value.trim() === value ? value : "";
}

function integer(value: unknown, min: number, max: number) {
  // HTML number inputs send decimal strings, while JSON clients may send numbers.
  // Do not coerce booleans, arrays, null, hex/exponent notation or empty strings
  // into valid chapter/attendance/answer counts before a durable D1 write.
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !/^[0-9]+$/.test(value.trim())) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= min && number <= max ? number : null;
}

function forbidden(status = 401) {
  return Response.json({ error: status === 401 ? "authentication_required" : "forbidden" }, { status });
}
function unavailableWrite() {
  return Response.json({ error: "database_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store, private" } });
}

// No handler may treat a success-marked D1 batch with absent mutation metadata
// as a completed role, membership, ownership or session transition.
function acknowledgedWrite(receipt: unknown) {
  const r=receipt as {success?: boolean; meta?: {changes?: number}} | null;
  const changes=r?.meta?.changes;
  return r?.success===true && typeof changes==="number" &&
    Number.isSafeInteger(changes) && changes>=0;
}
function acknowledgedBatch(receipts: unknown, count: number) {
  return Array.isArray(receipts) && receipts.length===count && receipts.every(acknowledgedWrite);
}

const SETTINGS_KEYS = ['name','church','country','city','description','visibility','rosterVisibility'] as const;
function groupSettings(value: unknown): Row | null {
  if(!value || typeof value!=='object' || Array.isArray(value))return null;
  const row=value as Row;
  if(Object.keys(row).length!==SETTINGS_KEYS.length || SETTINGS_KEYS.some(key=>!Object.hasOwn(row,key)))return null;
  if(typeof row.name!=='string' || !row.name.trim() || row.name.length>100)return null;
  for(const [key,max] of [['church',160],['country',80],['city',80],['description',600]] as const)
    if(row[key]!==null && (typeof row[key]!=='string' || (row[key] as string).length>max))return null;
  if(!['public','private'].includes(row.visibility as string) || !['count','names','private'].includes(row.rosterVisibility as string))return null;
  return row;
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
  // D1 aggregate success does not make damaged stored group scores truthful.
  // A missing, negative, fractional or over-total answer count must never be
  // displayed as a public 0%, 100%+, or an invented successful group report.
  const counters = [row.answers_correct, row.answers_total, row.chapters_completed];
  if (counters.some(value => typeof value !== "number" ||
      !Number.isSafeInteger(value) || value < 0) ||
      (row.answers_correct as number) > (row.answers_total as number))
    throw Error("invalid_group_study_aggregate");
  // SQLite COUNT() is always a nonnegative integer. A corrupted/malformed
  // D1 response cannot be coerced into a false membership or meeting count.
  const publicCounts = [row.member_count, row.session_count, row.cohort_size];
  if (publicCounts.some(value => typeof value !== "number" ||
      !Number.isSafeInteger(value) || value < 0))
    throw Error("invalid_group_public_count");
  const total = row.answers_total as number;
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

async function checkedGroupRows<T>(result: {success?: boolean;results?: T[]}): Promise<T[]> {
  if(!result?.success || !Array.isArray(result.results))throw Error("group_read_unconfirmed");
  return result.results;
}

export async function GET(request: Request) {
  try {
  const url = new URL(request.url);
  const requestedGroupId = url.searchParams.get("groupId");
  if (requestedGroupId !== null && requestedGroupId.length > 80)
    return Response.json({ error: "invalid_group_id" }, { status: 400 });
  const groupId = boundedIdentifier(requestedGroupId);
  // An explicit malformed ID must not silently fall through to group discovery.
  if (requestedGroupId !== null && !groupId)
    return Response.json({ error: "invalid_group_id" }, { status: 400 });
  // Public group discovery includes no private membership or invite data.
  // Do not make that public endpoint depend on a failing/corrupt session;
  // details and mine remain fully authenticated and fail closed on auth errors.
  const id = (groupId || url.searchParams.get("mine") === "1")
    ? await authenticateRequest(request) : null;
  if(url.searchParams.get('action')==='name-visibility') {
    if(!id)return forbidden();
    if(!groupId||url.searchParams.get('groupId')!==groupId)return Response.json({error:'invalid_group'},{status:400});
    const row=await env.DB!.prepare('SELECT public_name FROM home_group_members WHERE group_id=? AND user_id=?').bind(groupId,id.userId).first<{public_name:number}>();
    if(!row)return Response.json({error:'not_found'},{status:404});
    if(row.public_name!==0&&row.public_name!==1)return unavailableWrite();
    return Response.json({publicName:row.public_name===1},{headers:{'Cache-Control':'no-store, private'}});
  }
  if (groupId) {
    const member = id ? await membership(groupId, id.userId) : null;
    const row = await env.DB!.prepare(`${groupSelect} WHERE g.id=? AND (g.visibility='public' OR ?=1)`).bind(groupId, member ? 1 : 0).first<Row>();
    if (!row) return Response.json({ error: "not_found" }, { status: 404 });
    const names = row.roster_visibility === "names"
      ? await checkedGroupRows(await env.DB!.prepare("SELECT display_name,role FROM home_group_members WHERE group_id=? AND public_name=1 ORDER BY joined_at").bind(groupId).all())
      : [];
    const sessions = await checkedGroupRows(await env.DB!.prepare("SELECT id,book_id,chapter,answers_correct,answers_total,participant_count,meeting_date,CASE WHEN ?=1 THEN reflection ELSE NULL END AS reflection FROM group_sessions WHERE group_id=? ORDER BY meeting_date DESC,created_at DESC LIMIT 12").bind(member ? 1 : 0, groupId).all());
    const peers = row.cohort_key ? (await checkedGroupRows(await env.DB!.prepare(`${groupSelect} WHERE g.visibility='public' AND m.cohort_key=? ORDER BY chapters_completed DESC,g.name LIMIT 50`).bind(row.cohort_key).all<Row>())).map(value => publicGroup(value)) : [];
    const answers=member?await checkedGroupRows(await env.DB!.prepare("SELECT task_id,solved,first_correct FROM group_answers WHERE group_id=?").bind(groupId).all()):[];
    // The owner needs the private membership list to transfer responsibility.
    // Check ownership again in the query, not only in the earlier lookup.
    const managementMembers = member?.role === "owner" && id ? await checkedGroupRows(await env.DB!.prepare("SELECT hm.user_id,hm.display_name,hm.role FROM home_group_members hm WHERE hm.group_id=? AND EXISTS (SELECT 1 FROM home_groups g JOIN home_group_members owner ON owner.group_id=g.id AND owner.user_id=g.owner_user_id AND owner.role='owner' WHERE g.id=hm.group_id AND g.owner_user_id=?) ORDER BY hm.joined_at,hm.user_id").bind(groupId,id.userId).all()) : [];
    // A private roster hides its member count, so its meeting attendance
    // must not disclose a backdoor count. Keep aggregate study metrics public.
    const visibleSessions = !member && row.roster_visibility === "private"
      ? sessions.map(session => ({ ...session, participant_count: null }))
      : sessions;
    return Response.json({ group: publicGroup(row, Boolean(member)), members: names, managementMembers, sessions: visibleSessions, peers, answers, membership: member?.role ?? null }, { headers: { "Cache-Control": "no-store" } });
  }
  if (url.searchParams.get("mine") === "1") {
    if (!id) return forbidden();
    const rows = await checkedGroupRows(await env.DB!.prepare(`${groupSelect} JOIN home_group_members mine ON mine.group_id=g.id WHERE mine.user_id=? ORDER BY g.updated_at DESC`).bind(id.userId).all<Row>());
    return Response.json({ groups: rows.map(row => publicGroup(row)) }, { headers: { "Cache-Control": "no-store" } });
  }
  const rows = await checkedGroupRows(await env.DB!.prepare(`${groupSelect} WHERE g.visibility='public' ORDER BY g.updated_at DESC LIMIT 100`).all<Row>());
  return Response.json({ groups: rows.map(row => publicGroup(row)) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({error:"groups_unavailable"},{status:503,headers:{"Cache-Control":"no-store, private"}});
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "cross_origin_request" }, { status: 403 });
  if (!env.DB) return unavailableWrite();
  // Session validation and D1 preflight reads are part of the write boundary.
  try {
  const id = await authenticateRequest(request);
  if (!id) return forbidden();
  const body = await request.json().catch(() => null) as Row | null;
  if (!body) return Response.json({ error: "invalid_json" }, { status: 400 });
  const action = new URL(request.url).searchParams.get("action") || "create";

  if(action==='name-visibility') {
    const groupId=body.groupId;
    if(typeof groupId!=='string'||!groupId||groupId.length>80||groupId.trim()!==groupId||typeof body.publicName!=='boolean'||typeof body.expectedPublicName!=='boolean')
      return Response.json({error:'invalid_name_visibility'},{status:400});
    const saved=await env.DB.prepare('UPDATE home_group_members SET public_name=? WHERE group_id=? AND user_id=? AND public_name=?')
      .bind(body.publicName?1:0,groupId,id.userId,body.expectedPublicName?1:0).run();
    if(!acknowledgedWrite(saved))return unavailableWrite();
    if(saved.meta.changes!==1)return Response.json({error:'name_visibility_changed_or_membership_missing'},{status:409});
    return Response.json({ok:true,publicName:body.publicName},{headers:{'Cache-Control':'no-store, private'}});
  }

  if (action === "settings") {
    // Exact values make both the authored text and the conflict check lossless.
    const next=groupSettings(body.settings), previous=groupSettings(body.expected);
    const groupId=body.groupId;
    if(typeof groupId!=='string'||!groupId||groupId.length>80||!next||!previous)
      return Response.json({error:"invalid_group_settings"},{status:400});
    const saved=await env.DB.prepare(`UPDATE home_groups SET name=?,church=?,country=?,city=?,description=?,visibility=?,roster_visibility=?,updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND owner_user_id=? AND EXISTS (SELECT 1 FROM home_group_members WHERE group_id=? AND user_id=? AND role='owner')
      AND name IS ? AND church IS ? AND country IS ? AND city IS ? AND description IS ? AND visibility IS ? AND roster_visibility IS ?`)
      .bind(...SETTINGS_KEYS.map(key=>next[key]),groupId,id.userId,groupId,id.userId,...SETTINGS_KEYS.map(key=>previous[key])).run();
    if(!acknowledgedWrite(saved))return unavailableWrite();
    if(saved.meta.changes!==1)return Response.json({error:"group_settings_changed_or_forbidden"},{status:409});
    return Response.json({ok:true},{headers:{"Cache-Control":"no-store, private"}});
  }

  if (action === "rotate-invite") {
    const groupId=boundedIdentifier(body.groupId), previous=boundedIdentifier(body.expectedInviteCode,32);
    if(!groupId||!previous||body.confirm!==true)return Response.json({error:"confirmation_required"},{status:400});
    const inviteCode=crypto.randomUUID().replaceAll('-','').toUpperCase();
    try {
      const updated=await env.DB!.prepare("UPDATE home_groups SET invite_code=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND invite_code=? AND owner_user_id=? AND EXISTS (SELECT 1 FROM home_group_members WHERE group_id=? AND user_id=? AND role='owner')").bind(inviteCode,groupId,previous,id.userId,groupId,id.userId).run();
      if(!acknowledgedWrite(updated))return Response.json({error:"database_unavailable"},{status:503});
      if(!updated.meta.changes)return Response.json({error:"invite_changed_or_forbidden"},{status:409});
      return Response.json({ok:true,inviteCode});
    } catch {return Response.json({error:"database_unavailable"},{status:503});}
  }

  if (action === "role") {
    const groupId=boundedIdentifier(body.groupId),target=boundedIdentifier(body.targetUserId),role=clean(body.role,20),previous=clean(body.expectedRole,20);
    if(!groupId||!target||target===id.userId||!['member','facilitator'].includes(role)||!['member','facilitator'].includes(previous)||role===previous)return Response.json({error:"invalid_role_change"},{status:400});
    // Repeat the same authorization and expected-role predicate in every write.
    // Revocation precedes the role change inside one atomic batch.
    const permitted="EXISTS (SELECT 1 FROM home_groups g JOIN home_group_members owner ON owner.group_id=g.id AND owner.user_id=g.owner_user_id AND owner.role='owner' JOIN home_group_members target ON target.group_id=g.id WHERE g.id=? AND g.owner_user_id=? AND target.user_id=? AND target.role=? AND target.user_id<>g.owner_user_id)";
    try {
      const saved=await env.DB!.batch([
        env.DB!.prepare("UPDATE chapter_read_receipts SET consumed_at=CURRENT_TIMESTAMP WHERE group_id=? AND actor_id=? AND consumed_at IS NULL AND ?='member' AND "+permitted).bind(groupId,target,role,groupId,id.userId,target,previous),
        env.DB!.prepare("UPDATE mission_attempts SET status='invalidated',invalidated_at=CURRENT_TIMESTAMP,invalidation_reason='group_role_revoked' WHERE group_id=? AND actor_id=? AND status='active' AND ?='member' AND "+permitted).bind(groupId,target,role,groupId,id.userId,target,previous),
        env.DB!.prepare("UPDATE home_group_members SET role=? WHERE group_id=? AND user_id=? AND role=? AND "+permitted).bind(role,groupId,target,previous,groupId,id.userId,target,previous),
      ]);
      if(!acknowledgedBatch(saved,3))return Response.json({error:"database_unavailable"},{status:503});
      if(!saved[2].meta.changes)return Response.json({error:"role_changed_or_forbidden"},{status:409});
      return Response.json({ok:true});
    } catch {return Response.json({error:"database_unavailable"},{status:503});}
  }

  if (action === "leave") {
    const groupId=boundedIdentifier(body.groupId), member=await membership(groupId,id.userId);
    if(!member)return Response.json({error:"not_found"},{status:404});
    if(member.role==='owner')return Response.json({error:"owner_transfer_required"},{status:409});
    try {
      const result=await env.DB!.batch([
        env.DB!.prepare("DELETE FROM home_group_members WHERE group_id=? AND user_id=? AND role IN ('member','facilitator') AND EXISTS (SELECT 1 FROM home_groups WHERE id=? AND owner_user_id<>?)").bind(groupId,id.userId,groupId,id.userId),
        env.DB!.prepare("UPDATE mission_attempts SET status='invalidated',invalidated_at=CURRENT_TIMESTAMP,invalidation_reason='group_left' WHERE actor_id=? AND group_id=? AND status='active' AND NOT EXISTS (SELECT 1 FROM home_group_members WHERE group_id=? AND user_id=?)").bind(id.userId,groupId,groupId,id.userId),
        env.DB!.prepare("UPDATE chapter_read_receipts SET consumed_at=CURRENT_TIMESTAMP WHERE actor_id=? AND group_id=? AND consumed_at IS NULL AND NOT EXISTS (SELECT 1 FROM home_group_members WHERE group_id=? AND user_id=?)").bind(id.userId,groupId,groupId,id.userId),
      ]);
      if(!acknowledgedBatch(result,3))return Response.json({error:"database_unavailable"},{status:503});
      if(!result[0].meta.changes)return Response.json({error:"membership_changed"},{status:409});
      return Response.json({ok:true});
    } catch {return Response.json({error:"database_unavailable"},{status:503});}
  }

  if (action === "transfer") {
    const groupId=boundedIdentifier(body.groupId), target=boundedIdentifier(body.targetUserId);
    if(!groupId||!target||target===id.userId)return Response.json({error:"invalid_transfer"},{status:400});
    try {
      const result=await env.DB!.batch([
        env.DB!.prepare("UPDATE home_groups SET owner_user_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND owner_user_id=? AND EXISTS (SELECT 1 FROM home_group_members WHERE group_id=? AND user_id=? AND role='owner') AND EXISTS (SELECT 1 FROM home_group_members WHERE group_id=? AND user_id=? AND role IN ('member','facilitator'))").bind(target,groupId,id.userId,groupId,id.userId,groupId,target),
        // changes() is from the immediately preceding ownership update in this transaction.
        // One statement changes both roles; a stale/unauthorized transfer changes neither.
        env.DB!.prepare("UPDATE home_group_members SET role=CASE WHEN user_id=? THEN 'owner' ELSE 'member' END WHERE group_id=? AND user_id IN (?,?) AND changes()=1").bind(target,groupId,id.userId,target),
      ]);
      if(!acknowledgedBatch(result,2))return Response.json({error:"database_unavailable"},{status:503});
      if(!result[0].meta.changes)return Response.json({error:"transfer_unavailable"},{status:409});
      return Response.json({ok:true});
    } catch {return Response.json({error:"database_unavailable"},{status:503});}
  }

  if (action === "delete") {
    const groupId=boundedIdentifier(body.groupId);
    if(!groupId||body.confirm!==true)return Response.json({error:"confirmation_required"},{status:400});
    try {
      const result=await env.DB!.batch([
        env.DB!.prepare("UPDATE mission_attempts SET status='invalidated',invalidated_at=CURRENT_TIMESTAMP,invalidation_reason='group_deleted' WHERE group_id=? AND status='active' AND EXISTS (SELECT 1 FROM home_groups g JOIN home_group_members owner ON owner.group_id=g.id AND owner.user_id=g.owner_user_id AND owner.role='owner' WHERE g.id=? AND g.owner_user_id=?)").bind(groupId,groupId,id.userId),
        env.DB!.prepare("UPDATE chapter_read_receipts SET consumed_at=CURRENT_TIMESTAMP WHERE group_id=? AND consumed_at IS NULL AND EXISTS (SELECT 1 FROM home_groups g JOIN home_group_members owner ON owner.group_id=g.id AND owner.user_id=g.owner_user_id AND owner.role='owner' WHERE g.id=? AND g.owner_user_id=?)").bind(groupId,groupId,id.userId),
        env.DB!.prepare("DELETE FROM home_groups WHERE id=? AND owner_user_id=? AND EXISTS (SELECT 1 FROM home_group_members WHERE group_id=? AND user_id=? AND role='owner')").bind(groupId,id.userId,groupId,id.userId),
      ]);
      if(!acknowledgedBatch(result,3))return Response.json({error:"database_unavailable"},{status:503});
      if(!result[2].meta.changes)return forbidden(403);
      return Response.json({ok:true});
    } catch {return Response.json({error:"database_unavailable"},{status:503});}
  }

  const person = await profile(id);
  if (!person) return Response.json({ error: "profile_required" }, { status: 409 });

  if (action === "start") {
    const groupId = boundedIdentifier(body.groupId), member = await membership(groupId, id.userId);
    if (member?.role !== "owner") return forbidden(403);
    const registration = await env.DB!.prepare("SELECT cohort_key,status FROM group_marathon_registrations WHERE group_id=?").bind(groupId).first<{cohort_key:string;status:string}>();
    if (!registration || registration.status !== "ready") return Response.json({error:"cohort_not_ready"},{status:409});
    const started=await env.DB!.prepare("UPDATE group_marathon_registrations SET status='active',start_date=date('now') WHERE cohort_key=? AND status='ready' AND EXISTS (SELECT 1 FROM home_groups g JOIN home_group_members owner ON owner.group_id=g.id AND owner.user_id=g.owner_user_id AND owner.role='owner' WHERE g.id=? AND g.owner_user_id=?)").bind(registration.cohort_key,groupId,id.userId).run();
    if(!acknowledgedWrite(started))return Response.json({error:"database_unavailable"},{status:503});
    if(!started.meta.changes)return Response.json({error:"cohort_changed_or_forbidden"},{status:409});
    return Response.json({ok:true});
  }

  if (action === "join") {
    const code = clean(body.inviteCode, 33).toUpperCase();
    if(!/^(?:[A-F0-9]{8}|[A-F0-9]{32})$/.test(code))return Response.json({error:"invalid_invite"},{status:404});
    const group = await env.DB!.prepare("SELECT id FROM home_groups WHERE invite_code=?").bind(code).first<{ id: string }>();
    if (!group) return Response.json({ error: "invalid_invite" }, { status: 404 });
    try {
      // Reuse the receipt guard already integrated for other group mutations.
      // An INSERT can commit while its D1 ACK is lost: do not claim success.
      const joined = await env.DB!.prepare("INSERT OR IGNORE INTO home_group_members (group_id,user_id,display_name,role,public_name,public_activity) SELECT id,?,?,'member',?,? FROM home_groups WHERE id=? AND invite_code=?")
        .bind(id.userId, `${person.first_name} ${person.last_name}`.trim(), body.publicName === true ? 1 : 0, body.publicActivity === true ? 1 : 0, group.id, code).run();
      if(!acknowledgedWrite(joined))return Response.json({error:"database_unavailable"},{status:503});
      if(!await membership(group.id,id.userId))return Response.json({error:"invalid_invite"},{status:404});
      return Response.json({ok:true,groupId:group.id});
    } catch {
      return Response.json({error:"database_unavailable"},{status:503});
    }
  }

  if (action === "session") {
    const groupId = boundedIdentifier(body.groupId);
    const member = await membership(groupId, id.userId);
    if (!member || !["owner", "facilitator"].includes(member.role)) return forbidden(403);
    const bookId = clean(body.bookId, 8).toUpperCase();
    const chapter = integer(body.chapter, 1, 200);
    const participantCount = body.participantCount === "" || body.participantCount == null ? null : integer(body.participantCount, 1, 500);
    const answersTotal = integer(body.answersTotal, 0, 1000);
    const answersCorrect = integer(body.answersCorrect, 0, 1000);
    // Unlike display labels, recorded meeting dates and private reflections
    // must not be clipped into different valid data before an actual D1 write.
    const meetingDate = typeof body.meetingDate === "string" ? body.meetingDate.trim() : "";
    const reflection = typeof body.reflection === "string" ? body.reflection.trim()
      : body.reflection == null ? "" : null;
    if (reflection === null || reflection.length > 1200)
      return Response.json({error:"invalid_session"},{status:400});
    const groupEdition = await env.DB!.prepare("SELECT bible_edition FROM home_groups WHERE id=?").bind(groupId).first<{bible_edition:string}>();
    const chapterLimit = groupEdition?.bible_edition === 'uk-ohiienko'
      ? catalog.editionBooks['uk-ohiienko'].find(book => book.code === bookId)?.chapters
      : BOOK_CHAPTERS.get(bookId);
    if (!chapterLimit || !chapter || chapter > Number(chapterLimit) || answersTotal == null || answersCorrect == null || answersCorrect > answersTotal || !/^\d{4}-\d{2}-\d{2}$/.test(meetingDate)) return Response.json({ error: "invalid_session" }, { status: 400 });
    if ((body.participantCount !== "" && body.participantCount != null && participantCount === null) || !Number.isFinite(Date.parse(meetingDate)) || new Date(meetingDate).toISOString().slice(0,10)!==meetingDate || meetingDate>new Date().toISOString().slice(0,10)) return Response.json({error:"invalid_session"},{status:400});
    const registration = await env.DB!.prepare("SELECT weekly_goal,catchup_mode,status,start_date FROM group_marathon_registrations WHERE group_id=?").bind(groupId).first<{weekly_goal:number;catchup_mode:string;status:string;start_date:string|null}>();
    if (registration) {
      if (registration.status !== "active" || !registration.start_date) return Response.json({error:"marathon_not_started"},{status:409});
      // D1 columns are SQLite-affinity only: a legacy/corrupt active cohort can
      // otherwise turn week/limits into NaN and skip every unlock comparison.
      // Validate persisted authority with the same bounds used on group creation.
      if (!Number.isSafeInteger(registration.weekly_goal) ||
          registration.weekly_goal < 1 || registration.weekly_goal > 31 ||
          registration.weekly_goal % 2 !== 1 ||
          !["steady", "flexible"].includes(registration.catchup_mode) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(registration.start_date) ||
          !Number.isFinite(Date.parse(registration.start_date)) ||
          new Date(registration.start_date).toISOString().slice(0, 10) !== registration.start_date)
        return Response.json({error:"marathon_state_invalid"},{status:409});
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
      // A SQL COUNT query must return one well-formed, nonnegative integer.
      // Missing/corrupt D1 read evidence is not an empty marathon week:
      // treating it as zero silently unlocks an extra group session.
      if (!used || !Number.isSafeInteger(used.count) || used.count < 0)
        return unavailableWrite();
      if (!repeated && used.count >= allowed) return Response.json({error:"weekly_limit_reached"},{status:409});
    }
    const sessionId=crypto.randomUUID();
    try {
    const saved=await env.DB!.batch([
      env.DB!.prepare("INSERT INTO group_sessions (id,group_id,created_by,book_id,chapter,chapters_completed,answers_correct,answers_total,reflection,participant_count,meeting_date) SELECT ?,?,?,?,?,1,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM home_group_members WHERE group_id=? AND user_id=? AND role IN ('owner','facilitator'))")
        .bind(sessionId, groupId, id.userId, bookId, chapter, answersCorrect, answersTotal, reflection || null, participantCount, meetingDate, groupId, id.userId),
      env.DB!.prepare("UPDATE home_groups SET updated_at=CURRENT_TIMESTAMP WHERE id=? AND EXISTS (SELECT 1 FROM group_sessions WHERE id=?)").bind(groupId,sessionId),
    ]);
    if(!acknowledgedBatch(saved,2))return Response.json({error:"database_unavailable"},{status:503});
    if(!saved[0].meta.changes)return forbidden(403);
    } catch {return Response.json({error:"database_unavailable"},{status:503});}
    return Response.json({ ok: true });
  }

  if (action !== "create") return Response.json({ error: "unknown_action" }, { status: 400 });
  // Group owners must not receive a 201 for a silently rewritten profile.
  // Validate authored fields *before* clean() can slice meaningful text, and
  // before group/membership/cohort records can be inserted into D1.
  if (typeof body.name !== "string" || ([
    ["name", 100], ["church", 160], ["country", 80],
    ["city", 80], ["description", 600],
  ] as const).some(([key, max]) => {
    const value = body[key];
    // An explicitly supplied non-string optional field must not be silently
    // converted to null by clean() and reported as successfully saved.
    return value != null && (typeof value !== "string" || value.trim().length > max);
  })) return Response.json({ error: "invalid_group" }, { status: 400 });
  const name = clean(body.name, 100);
  const weeklyGoal = integer(body.weeklyGoal, 1, 31);
  const catchupMode = clean(body.catchupMode, 16);
  const visibility = clean(body.visibility, 12);
  const rosterVisibility = clean(body.rosterVisibility, 12);
  const marathonEnabled = body.marathonEnabled === true || body.marathonEnabled === "on" || body.marathonEnabled === "true";
  // An explicit JSON value with a non-string type must not be silently
  // replaced with the Ukrainian default and acknowledged as the owner's choice.
  // Absent/null/blank HTML form values retain the established default.
  if (body.bibleEdition != null && typeof body.bibleEdition !== "string")
    return Response.json({error:"invalid_edition"},{status:400});
  const bibleEdition = clean(body.bibleEdition, 40) || "uk-ohiienko";
  if (!["uk-kulish","uk-ohiienko","uk-khomenko","uk-turkoniak","ru-synodal","ru-nrt","ru-rsp","ru-kulakov","en-web","en-kjv","en-niv","en-esv"].includes(bibleEdition)) return Response.json({error:"invalid_edition"},{status:400});
  if (!name || !weeklyGoal || weeklyGoal % 2 === 0 || !["flexible", "steady"].includes(catchupMode) || !["public", "private"].includes(visibility) || !["count", "names", "private"].includes(rosterVisibility)) return Response.json({ error: "invalid_group" }, { status: 400 });
  const groupId = crypto.randomUUID();
  const marathonId = crypto.randomUUID();
  const inviteCode = crypto.randomUUID().replaceAll("-", "").toUpperCase();
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
  // Keep the matching cohort transition atomic with creating the new group.
  const promoteCohort=marathonEnabled && cohortStatus==="ready";
  if(promoteCohort) statements.push(env.DB!.prepare("UPDATE group_marathon_registrations SET status='ready' WHERE cohort_key=? AND status='forming'").bind(cohortKey));
  try {
    const results=await env.DB!.batch(statements);
    // Only an acknowledged committed group, owner membership and optional
    // cohort registration can be returned as created. A lost D1 ACK is
    // uncertain, not proof of rollback: users can inspect their group list.
    if(!acknowledgedBatch(results,statements.length)||
      results.some((result,index)=>!(promoteCohort && index===statements.length-1) && result.meta.changes!==1))
      return Response.json({error:"group_creation_unconfirmed"},{status:503,headers:{"Cache-Control":"no-store"}});
    return Response.json({ok:true,groupId,cohortStatus},{status:201});
  } catch {
    return Response.json({error:"group_creation_unconfirmed"},{status:503,headers:{"Cache-Control":"no-store"}});
  }
  } catch { return unavailableWrite(); }
}
