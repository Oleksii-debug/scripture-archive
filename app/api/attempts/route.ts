import { env } from "cloudflare:workers";
import mission from "../../../content/mission-abraham.json";
import { authenticateRequest, GUEST_COOKIE, guestCookie, parseCookies, randomToken, sameOrigin, sha256 } from "../../../lib/auth";

export const dynamic = "force-dynamic";

type Locale = "uk" | "ru" | "en";
type MissionTask = (typeof mission.tasks)[number];
type Attempt = {
  id: string;
  actor_id: string;
  mission_id: string;
  book_id: string;
  chapter: number;
  group_id: string | null;
  locale: Locale;
  task_limit: number;
  current_index: number;
  status: string;
  expires_at: string;
  result_json: string | null;
};

const MISSION_ID = "OT-AB-01";
function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}
function clean(value: unknown, max = 100) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function locale(value: unknown): Locale { return value === "ru" || value === "en" ? value : "uk"; }
function tasksFor(book: string, chapter: number) { return mission.tasks.filter(task => task.book === book && task.chapter === chapter); }
function publicTask(task: MissionTask, selectedLocale: Locale, index: number, total: number) {
  return {
    type: task.type,
    index,
    total,
    question: task.question[selectedLocale],
    options: task.options[selectedLocale],
  };
}
async function actor(request: Request, createGuest = false) {
  const identity = await authenticateRequest(request);
  if (identity) return { id: identity.userId, identity, cookie: null, guest: false };
  let token = parseCookies(request).get(GUEST_COOKIE), cookie: string | null = null;
  if (!token && createGuest) { token = randomToken(); cookie = guestCookie(request, token); }
  if (!token) return null;
  return { id: `guest:${await sha256(token)}`, identity: null, cookie, guest: true };
}
async function ownedAttempt(request: Request, attemptId: string) {
  const currentActor = await actor(request);
  if (!currentActor) return { currentActor: null, attempt: null };
  const attempt = await env.DB!.prepare("SELECT * FROM mission_attempts WHERE id=? AND actor_id=?").bind(attemptId, currentActor.id).first<Attempt>();
  return { currentActor, attempt };
}
async function groupFacilitator(groupId: string, userId: string) {
  return env.DB!.prepare("SELECT role FROM home_group_members WHERE group_id=? AND user_id=? AND role IN ('owner','facilitator')")
    .bind(groupId, userId).first<{ role: string }>();
}
function reference(task: MissionTask) {
  const verses = task.verses.length > 1 ? `${task.verses[0]}–${task.verses.at(-1)}` : String(task.verses[0]);
  return `${task.book} ${task.chapter}:${verses}`;
}
function resultFor(tasks: MissionTask[], answers: Array<Record<string, unknown>>, selectedLocale: Locale) {
  const byTask = new Map(answers.map(answer => [String(answer.task_id), answer]));
  const details = tasks.map(task => {
    const answer = byTask.get(task.id), correct = Boolean(answer?.is_correct);
    const selected = JSON.parse(String(answer?.selected_json || "[]")) as number[];
    return {
      taskId: task.id,
      correct,
      reference: reference(task),
      explanation: task.success[selectedLocale],
      selected: selected.map(index => task.options[selectedLocale][index]).filter(Boolean),
      correctAnswers: task.correct.map(index => task.options[selectedLocale][index]).filter(Boolean),
    };
  });
  const score = details.filter(detail => detail.correct).length;
  return {
    score,
    total: tasks.length,
    mastered: details.filter(detail => detail.correct).map(detail => detail.reference),
    mistakes: details.filter(detail => !detail.correct),
    details,
  };
}

export async function GET(request: Request) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  const url = new URL(request.url), action = url.searchParams.get("action") || "current";
  if (action === "manifest") {
    const currentActor = await actor(request);
    if (currentActor) {
      const active = await env.DB.prepare("SELECT id FROM mission_attempts WHERE actor_id=? AND status='active' AND expires_at>CURRENT_TIMESTAMP LIMIT 1").bind(currentActor.id).first();
      if (active) return json({ taskCount: mission.tasks.length, locked: true });
    }
    return json({
      id: MISSION_ID,
      title: mission.title,
      intro: mission.intro,
      taskCount: mission.tasks.length,
      chapters: [...new Map(mission.tasks.map(task => [`${task.book}:${task.chapter}`, { book: task.book, chapter: task.chapter }])).values()],
    });
  }
  if (action === "chapter") {
    return json({ error: "method_not_allowed" }, 405, { Allow: "POST" });
  }
  const attemptId = clean(url.searchParams.get("attemptId"), 80);
  const { attempt } = await ownedAttempt(request, attemptId);
  if (!attempt) return json({ error: "attempt_not_found" }, 404);
  if (attempt.status === "invalidated") return json({ error: "attempt_invalidated" }, 409);
  if (attempt.status === "completed") return json({ completed: true, book: attempt.book_id, chapter: attempt.chapter, groupId: attempt.group_id, result: attempt.result_json ? JSON.parse(attempt.result_json) : null });
  if (Date.parse(attempt.expires_at) <= Date.now()) return json({ error: "attempt_expired" }, 410);
  const tasks = tasksFor(attempt.book_id, attempt.chapter).slice(0, attempt.task_limit), task = tasks[attempt.current_index];
  if (!task) return json({ error: "attempt_state_invalid" }, 409);
  return json({ attemptId: attempt.id, task: publicTask(task, attempt.locale, attempt.current_index + 1, tasks.length) });
}

export async function POST(request: Request) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  if (!sameOrigin(request)) return json({ error: "cross_origin_request" }, 403);
  const action = new URL(request.url).searchParams.get("action") || "start";
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return json({ error: "invalid_json" }, 400);

  if (action === "chapter") {
    const book = clean(body.book, 8).toUpperCase(), chapter = Number(body.chapter);
    if (!book || !Number.isInteger(chapter) || chapter < 1) return json({ error: "invalid_chapter" }, 400);
    const currentActor = await actor(request);
    if (!currentActor) return json({ invalidated: false });
    // Invalidate before reporting a match: a read-only lookup would reveal the
    // active passage through enumeration. Group context must not bypass this.
    const result = await env.DB.batch([
      env.DB.prepare("UPDATE mission_attempts SET status='invalidated',invalidated_at=CURRENT_TIMESTAMP,invalidation_reason='chapter_opened' WHERE actor_id=? AND book_id=? AND chapter=? AND status='active' AND expires_at>CURRENT_TIMESTAMP").bind(currentActor.id, book, chapter),
      env.DB.prepare("UPDATE chapter_read_receipts SET consumed_at=CURRENT_TIMESTAMP WHERE actor_id=? AND book_id=? AND chapter=? AND consumed_at IS NULL").bind(currentActor.id, book, chapter),
    ]);
    if (!result.every(item => item.success)) return json({ error: "database_unavailable" }, 503);
    return json({ invalidated: result[0].meta.changes > 0 });
  }

  if (action === "read") {
    const currentActor = await actor(request, true);
    if (!currentActor) return json({ error: "actor_unavailable" }, 401);
    const book = clean(body.book, 8).toUpperCase(), chapter = Number(body.chapter), groupId = clean(body.groupId, 80);
    if (!tasksFor(book, chapter).length) return json({ error: "mission_chapter_unavailable" }, 404);
    if (groupId && (!currentActor.identity || !await groupFacilitator(groupId, currentActor.identity.userId))) return json({ error: "group_facilitator_required" }, 403);
    await env.DB.prepare("INSERT INTO chapter_read_receipts (id,actor_id,book_id,chapter,group_id) VALUES (?,?,?,?,?)")
      .bind(crypto.randomUUID(), currentActor.id, book, chapter, groupId || null).run();
    return json({ ok: true }, 201, currentActor.cookie ? { "Set-Cookie": currentActor.cookie } : {});
  }

  if (action === "start") {
    const currentActor = await actor(request, true);
    if (!currentActor) return json({ error: "actor_unavailable" }, 401);
    if (currentActor.identity && !currentActor.identity.emailVerified) return json({ error: "email_verification_required" }, 403);
    const book = clean(body.book, 8).toUpperCase(), chapter = Number(body.chapter), selectedLocale = locale(body.locale), groupId = clean(body.groupId, 80);
    const available = tasksFor(book, chapter);
    if (body.missionId !== MISSION_ID || !available.length) return json({ error: "mission_chapter_unavailable" }, 404);
    if (groupId && (!currentActor.identity || !await groupFacilitator(groupId, currentActor.identity.userId))) return json({ error: "group_facilitator_required" }, 403);
    if (groupId) {
      const registration = await env.DB.prepare("SELECT weekly_goal,catchup_mode,status,start_date FROM group_marathon_registrations WHERE group_id=?")
        .bind(groupId).first<{ weekly_goal: number; catchup_mode: string; status: string; start_date: string | null }>();
      if (registration) {
        if (registration.status !== "active" || !registration.start_date) return json({ error: "marathon_not_started" }, 409);
        const week = Math.floor((Date.now() - Date.parse(registration.start_date)) / 604800000);
        const passageIndex = chapter - 12, first = registration.catchup_mode === "steady" ? week * registration.weekly_goal : 0;
        const last = (week + 1) * registration.weekly_goal;
        if (book !== "GEN" || week < 0 || passageIndex < first || passageIndex >= last) return json({ error: "passage_not_in_current_plan" }, 409);
        const weekStart = new Date(Date.parse(registration.start_date) + week * 604800000).toISOString().slice(0, 10);
        const weekEnd = new Date(Date.parse(registration.start_date) + (week + 1) * 604800000).toISOString().slice(0, 10);
        const used = registration.catchup_mode === "steady"
          ? await env.DB.prepare("SELECT COUNT(DISTINCT book_id || ':' || chapter) AS count FROM group_sessions WHERE group_id=? AND meeting_date>=? AND meeting_date<?").bind(groupId, weekStart, weekEnd).first<{ count: number }>()
          : await env.DB.prepare("SELECT COUNT(DISTINCT book_id || ':' || chapter) AS count FROM group_sessions WHERE group_id=? AND meeting_date>=? AND meeting_date<?").bind(groupId, registration.start_date, weekEnd).first<{ count: number }>();
        const repeated = await env.DB.prepare("SELECT id FROM group_sessions WHERE group_id=? AND book_id=? AND chapter=? LIMIT 1").bind(groupId, book, chapter).first();
        const allowed = registration.weekly_goal * (registration.catchup_mode === "steady" ? 1 : week + 1);
        if (!repeated && Number(used?.count || 0) >= allowed) return json({ error: "weekly_limit_reached" }, 409);
      }
    }
    const receipt = await env.DB.prepare("SELECT id FROM chapter_read_receipts WHERE actor_id=? AND book_id=? AND chapter=? AND COALESCE(group_id,'')=? AND consumed_at IS NULL ORDER BY completed_at DESC LIMIT 1")
      .bind(currentActor.id, book, chapter, groupId).first<{ id: string }>();
    if (!receipt) return json({ error: "chapter_must_be_read" }, 409);
    const id = crypto.randomUUID(), taskLimit = currentActor.guest ? 1 : available.length;
    const started = await env.DB.batch([
      env.DB.prepare("INSERT INTO mission_attempts (id,actor_id,mission_id,book_id,chapter,group_id,locale,task_limit,expires_at) SELECT ?,?,?,?,?,?,?,?,datetime('now','+2 hours') WHERE EXISTS (SELECT 1 FROM chapter_read_receipts WHERE id=? AND actor_id=? AND consumed_at IS NULL)")
        .bind(id, currentActor.id, MISSION_ID, book, chapter, groupId || null, selectedLocale, taskLimit, receipt.id, currentActor.id),
      env.DB.prepare("UPDATE mission_attempts SET status='invalidated',invalidated_at=CURRENT_TIMESTAMP,invalidation_reason='new_attempt' WHERE actor_id=? AND status='active' AND id<>? AND EXISTS (SELECT 1 FROM mission_attempts WHERE id=?)").bind(currentActor.id, id, id),
      env.DB.prepare("UPDATE chapter_read_receipts SET consumed_at=CURRENT_TIMESTAMP WHERE id=? AND EXISTS (SELECT 1 FROM mission_attempts WHERE id=?)").bind(receipt.id, id),
    ]);
    if (!started[0].meta.changes) return json({ error: "chapter_must_be_read" }, 409);
    return json({ attemptId: id, task: publicTask(available[0], selectedLocale, 1, taskLimit), guest: currentActor.guest }, 201, currentActor.cookie ? { "Set-Cookie": currentActor.cookie } : {});
  }

  if (action === "invalidate") {
    const attemptId = clean(body.attemptId, 80), { attempt } = await ownedAttempt(request, attemptId);
    if (!attempt) return json({ error: "attempt_not_found" }, 404);
    if (attempt.status === "active")
      await env.DB.prepare("UPDATE mission_attempts SET status='invalidated',invalidated_at=CURRENT_TIMESTAMP,invalidation_reason=? WHERE id=?")
        .bind(clean(body.reason, 80) || "chapter_opened", attempt.id).run();
    return json({ ok: true });
  }

  if (action === "answer") {
    const attemptId = clean(body.attemptId, 80), { currentActor, attempt } = await ownedAttempt(request, attemptId);
    if (!currentActor || !attempt) return json({ error: "attempt_not_found" }, 404);
    if (attempt.status !== "active") return json({ error: attempt.status === "invalidated" ? "attempt_invalidated" : "attempt_closed" }, 409);
    if (Date.parse(attempt.expires_at) <= Date.now()) {
      await env.DB.prepare("UPDATE mission_attempts SET status='invalidated',invalidated_at=CURRENT_TIMESTAMP,invalidation_reason='expired' WHERE id=?").bind(attempt.id).run();
      return json({ error: "attempt_expired" }, 410);
    }
    const tasks = tasksFor(attempt.book_id, attempt.chapter).slice(0, attempt.task_limit), task = tasks[attempt.current_index];
    if (Number(body.taskIndex) < attempt.current_index + 1) return json({ error: "answer_already_submitted" }, 409);
    if (!task || Number(body.taskIndex) !== attempt.current_index + 1 || !Array.isArray(body.selected)) return json({ error: "invalid_answer" }, 400);
    const selected = [...new Set((body.selected as unknown[]).map(Number))].sort((a, b) => a - b);
    if (!selected.length || selected.some(index => !Number.isInteger(index) || index < 0 || index >= task.options[attempt.locale].length)) return json({ error: "invalid_answer" }, 400);
    const expected = [...task.correct].sort((a, b) => a - b), correct = JSON.stringify(selected) === JSON.stringify(expected);
    const nextIndex = attempt.current_index + 1;
    const accepted = await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO mission_attempt_answers (attempt_id,task_id,selected_json,is_correct) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM mission_attempts WHERE id=? AND status='active' AND current_index=?)")
        .bind(attempt.id, task.id, JSON.stringify(selected), correct ? 1 : 0, attempt.id, attempt.current_index),
      env.DB.prepare("UPDATE mission_attempts SET current_index=?,status=? WHERE id=? AND current_index=? AND status='active'")
        .bind(nextIndex, nextIndex === tasks.length ? "grading" : "active", attempt.id, attempt.current_index),
    ]);
    if (!accepted[1].meta.changes) return json({ error: "attempt_changed" }, 409);
    if (nextIndex < tasks.length) return json({ accepted: true, task: publicTask(tasks[nextIndex], attempt.locale, nextIndex + 1, tasks.length) });
    const rows = (await env.DB.prepare("SELECT task_id,selected_json,is_correct FROM mission_attempt_answers WHERE attempt_id=? ORDER BY answered_at").bind(attempt.id).all()).results as Array<Record<string, unknown>>;
    const result = resultFor(tasks, rows, attempt.locale), encoded = JSON.stringify(result);
    const statements = [
      env.DB.prepare("UPDATE mission_attempts SET status='completed',completed_at=CURRENT_TIMESTAMP,score=?,total=?,result_json=? WHERE id=?")
        .bind(result.score, result.total, encoded, attempt.id),
    ];
    if (!currentActor.guest)
      statements.push(env.DB.prepare("INSERT INTO progress (user_id,mission_id,data,updated_at) VALUES (?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id,mission_id) DO UPDATE SET data=excluded.data,updated_at=CURRENT_TIMESTAMP")
        .bind(currentActor.id, `${MISSION_ID}:${attempt.book_id}:${attempt.chapter}`, encoded));
    if (attempt.group_id)
      statements.push(env.DB.prepare("INSERT INTO group_sessions (id,group_id,created_by,book_id,chapter,chapters_completed,answers_correct,answers_total,meeting_date) VALUES (?,?,?,?,?,1,?,?,date('now'))")
        .bind(crypto.randomUUID(), attempt.group_id, currentActor.id, attempt.book_id, attempt.chapter, result.score, result.total));
    await env.DB.batch(statements);
    return json({ accepted: true, completed: true, book: attempt.book_id, chapter: attempt.chapter, groupId: attempt.group_id, result });
  }

  return json({ error: "unknown_action" }, 400);
}
