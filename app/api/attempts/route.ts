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
  score: number | null;
  total: number | null;
};

const MISSION_ID = "OT-AB-01";
function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}
// A D1 promise resolving is not proof that the requested change committed.
// Inspect every receipt, including batch companions, before reporting success.
function confirmedChanges(result: unknown): number | null {
  const receipt = result as { success?: unknown; meta?: { changes?: unknown } } | null;
  const count = receipt?.meta?.changes;
  return receipt?.success === true && typeof count === "number" &&
    Number.isSafeInteger(count) && count >= 0 ? count : null;
}
function confirmedBatch(results: unknown, expected: number): number[] | null {
  if (!Array.isArray(results) || results.length !== expected) return null;
  const changes = results.map(confirmedChanges);
  return changes.every(value => value !== null) ? changes as number[] : null;
}
function clean(value: unknown, max = 100) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
// Bible book codes are identifiers, not prose. Truncating or coercing input
// can turn a malformed request into a legitimate existing chapter and consume
// reading receipts or invalidate an unrelated active assessment.
function requestedBook(value: unknown): string | null {
  if (typeof value !== "string" || value.length < 2 || value.length > 8 ||
      value !== value.trim() || !/^[a-z0-9]+$/i.test(value)) return null;
  return value.toUpperCase();
}
// Attempt IDs identify durable assessments; trimming or slicing an ID can
// point a malformed request at an unrelated valid assessment owned by the
// same principal. The canonical server generates UUID-style ASCII IDs.
function requestedAttemptId(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= 80 &&
    /^[A-Za-z0-9_-]+$/.test(value) ? value : null;
}
// Group mode is an assessment and durable-progress authority. A malformed
// explicit group identifier must not silently become a personal attempt, and
// truncating a long identifier must not alias a real group's ID.
function requestedGroupId(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return "";
  // Group IDs are exact D1 keys. Normalizing caller whitespace would silently
  // target another group's saved receipts, even after membership checks.
  if (typeof value !== "string" || !value || value.length > 80 ||
      value.trim() !== value) return null;
  return value;
}
// Chapter input must be numeric evidence, not JavaScript truthy/coercible text.
// Decimal form field values remain supported without accepting hex/exponent,
// whitespace, booleans, arrays or unsafe integers as a Bible passage.
function requestedChapter(value: unknown): number | null {
  if (typeof value === "number") return Number.isSafeInteger(value) && value > 0 ? value : null;
  if (typeof value !== "string" || !/^[1-9][0-9]*$/.test(value)) return null;
  const result = Number(value);
  return Number.isSafeInteger(result) ? result : null;
}
// Missing/empty locale retains historical Ukrainian default; explicitly typed
// non-text JSON is not a language choice and must never silently start a test.
function requestedLocale(value: unknown): Locale | null {
  if (value === undefined || value === null || value === "") return "uk";
  if (typeof value !== "string") return null;
  // Preserve existing textual fallback until additional locale assets are accepted.
  return value === "ru" || value === "en" ? value : "uk";
}
// D1 is not an enum/date constraint: legacy or corrupt rows can contain invalid
// deadlines. Date.parse(NaN) is never <= now, so such rows must fail closed.
function attemptDeadline(raw: unknown): number | null {
  if (typeof raw !== "string" || raw !== raw.trim()) return null;
  // D1 emits UTC "YYYY-MM-DD HH:MM:SS"; accept historical date-only and
  // explicit ISO-Z deadlines, never Date.parse's normalized invalid calendar
  // dates, regional timezone interpretations, or ambiguous short strings.
  const match = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}):(\d{2})|T(\d{2}):(\d{2}):(\d{2})Z)?$/.exec(raw);
  if (!match) return null;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const hour = Number(match[4] ?? match[7] ?? "0");
  const minute = Number(match[5] ?? match[8] ?? "0");
  const second = Number(match[6] ?? match[9] ?? "0");
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31 ||
      hour > 23 || minute > 59 || second > 59) return null;
  const timestamp = Date.UTC(year, month - 1, day, hour, minute, second);
  const canonical = new Date(timestamp);
  if (!Number.isFinite(timestamp) || canonical.getUTCFullYear() !== year ||
      canonical.getUTCMonth() + 1 !== month || canonical.getUTCDate() !== day ||
      canonical.getUTCHours() !== hour || canonical.getUTCMinutes() !== minute ||
      canonical.getUTCSeconds() !== second) return null;
  return timestamp;
}
// A successful SQLite read still can contain forged or legacy malformed
// timestamp text. Date.parse('1') and overflow days accept false history;
// match the canonical D1 CURRENT_TIMESTAMP UTC seconds (and the reader guard).
function canonicalHistoryUtcTimestamp(value: unknown): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) return false;
  const date = new Date(value.replace(" ", "T") + "Z");
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 19).replace("T", " ") === value;
}
// D1 can contain legacy/corrupt locale types despite TypeScript's static Locale.
// Never emit a task missing its localized question/options or grade against it.
function storedLocale(value: unknown): value is Locale {
  return value === "uk" || value === "ru" || value === "en";
}
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

// A result may be read repeatedly after a network failure. For results made by
// this version, report whether the group record still exists; older results do
// not carry a link to their randomly generated group-session IDs.
async function completedResponse(attempt: Attempt, accepted = false) {
  try {
    if (!attempt.result_json) return json({ error: "attempt_state_invalid" }, 503);
    // D1 can contain a legacy or damaged completed row. JSON.parse succeeds
    // for arrays, strings and forged score objects; none is a legitimate
    // assessment result. Never announce completed:true with inconsistent
    // persisted score/total, even on a retry after a network interruption.
    let parsed: unknown;
    try { parsed = JSON.parse(attempt.result_json); }
    catch { return json({ error: "attempt_state_invalid" }, 503); }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return json({ error: "attempt_state_invalid" }, 503);
    const result = parsed as Record<string, unknown>;
    if (typeof result.score !== "number" || typeof result.total !== "number" ||
        !Number.isSafeInteger(result.score) || !Number.isSafeInteger(result.total) ||
        result.total < 1 || result.score < 0 || result.score > result.total ||
        !Number.isSafeInteger(attempt.score) || !Number.isSafeInteger(attempt.total) ||
        attempt.score !== result.score || attempt.total !== result.total)
      return json({ error: "attempt_state_invalid" }, 503);
    let groupRecorded: boolean | undefined;
    if (attempt.group_id && result.completionVersion === 1) {
      const session = await env.DB!.prepare("SELECT id FROM group_sessions WHERE id=? AND group_id=?")
        .bind(`attempt:${attempt.id}`, attempt.group_id).first();
      groupRecorded = Boolean(session);
    }
    return json({ ...(accepted ? { accepted: true } : {}), completed: true, book: attempt.book_id, chapter: attempt.chapter, groupId: attempt.group_id, result, ...(groupRecorded === undefined ? {} : { groupRecorded }) });
  } catch { return json({ error: "database_unavailable" }, 503); }
}

// The final answer is accepted before grading so a temporary failure must be
// recoverable. All side effects are conditional on the same grading state and
// committed as one D1 batch; retries cannot add a second group session.
async function finishAttempt(attempt: Attempt, actorId: string, guest: boolean, accepted = false) {
  if (attempt.status === "completed") return completedResponse(attempt, accepted);
  if (attempt.status !== "grading") return json({ error: "attempt_changed" }, 409);
  if (!storedLocale(attempt.locale)) return json({ error: "attempt_state_invalid" }, 409);
  try {
    const tasks = tasksFor(attempt.book_id, attempt.chapter).slice(0, attempt.task_limit);
    if (!tasks.length || tasks.length !== attempt.task_limit || attempt.current_index !== tasks.length)
      return json({ error: "attempt_state_invalid" }, 503);
    const response = await env.DB!.prepare("SELECT task_id,selected_json,is_correct FROM mission_attempt_answers WHERE attempt_id=?").bind(attempt.id).all();
    if (!response.success || !Array.isArray(response.results) || response.results.length !== tasks.length)
      return json({ error: "attempt_state_invalid" }, 503);
    const rows = response.results as Array<Record<string, unknown>>;
    const byId = new Map(rows.map(row => [row.task_id, row]));
    for (const task of tasks) {
      const row = byId.get(task.id);
      if (!row || (row.is_correct !== 0 && row.is_correct !== 1)) return json({ error: "attempt_state_invalid" }, 503);
      const selected: unknown = JSON.parse(String(row.selected_json));
      if (!Array.isArray(selected) || !selected.length || selected.some(i => !Number.isInteger(i) || i < 0 || i >= task.options[attempt.locale].length) || new Set(selected).size !== selected.length)
        return json({ error: "attempt_state_invalid" }, 503);
      const expected = [...task.correct].sort((a, b) => a - b);
      const actual = [...selected].sort((a, b) => a - b);
      if (Number(JSON.stringify(actual) === JSON.stringify(expected)) !== row.is_correct) return json({ error: "attempt_state_invalid" }, 503);
    }
    const result = { ...resultFor(tasks, rows, attempt.locale), completionVersion: 1 }, encoded = JSON.stringify(result);
    const statements = [];
    // An older stalled attempt can be recovered after a newer one has already
    // completed. Do not let that recovery replace the newer saved progress.
    if (!guest) statements.push(env.DB!.prepare("INSERT INTO progress (user_id,mission_id,data,updated_at) SELECT ?,?,?,CURRENT_TIMESTAMP WHERE EXISTS (SELECT 1 FROM mission_attempts a WHERE a.id=? AND a.actor_id=? AND a.status='grading' AND NOT EXISTS (SELECT 1 FROM mission_attempts newer WHERE newer.actor_id=a.actor_id AND newer.mission_id=a.mission_id AND newer.book_id=a.book_id AND newer.chapter=a.chapter AND newer.status='completed' AND newer.rowid>a.rowid)) ON CONFLICT(user_id,mission_id) DO UPDATE SET data=excluded.data,updated_at=CURRENT_TIMESTAMP")
      .bind(actorId, `${MISSION_ID}:${attempt.book_id}:${attempt.chapter}`, encoded, attempt.id, actorId));
    if (attempt.group_id) statements.push(env.DB!.prepare("INSERT INTO group_sessions (id,group_id,created_by,book_id,chapter,chapters_completed,answers_correct,answers_total,meeting_date) SELECT ?,?,?,?,?,1,?,?,date('now') WHERE EXISTS (SELECT 1 FROM mission_attempts a JOIN home_group_members m ON m.group_id=a.group_id AND m.user_id=a.actor_id AND m.role IN ('owner','facilitator') WHERE a.id=? AND a.actor_id=? AND a.status='grading')")
      .bind(`attempt:${attempt.id}`, attempt.group_id, actorId, attempt.book_id, attempt.chapter, result.score, result.total, attempt.id, actorId));
    statements.push(env.DB!.prepare("UPDATE mission_attempts SET status='completed',completed_at=CURRENT_TIMESTAMP,score=?,total=?,result_json=? WHERE id=? AND actor_id=? AND status='grading'")
      .bind(result.score, result.total, encoded, attempt.id, actorId));
    const saved = await env.DB!.batch(statements);
    if (!saved.every(item => item.success)) return json({ error: "database_unavailable" }, 503);
    // A concurrent finalizer may already have committed. Always return the
    // stored result rather than a locally calculated potentially stale one.
    const stored = await env.DB!.prepare("SELECT * FROM mission_attempts WHERE id=? AND actor_id=?").bind(attempt.id, actorId).first<Attempt>();
    return stored?.status === "completed" ? completedResponse(stored, accepted) : json({ error: "attempt_changed" }, 409);
  } catch { return json({ error: "database_unavailable" }, 503); }
}

export async function GET(request: Request) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  // Authentication, active-assessment guards and readbacks must fail closed.
  try {
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
  if (action === "history") {
    const currentActor = await actor(request);
    if (!currentActor?.identity || currentActor.identity.provider === "agent") return json({ error: "authentication_required" }, 401);
    try {
      const [active, history, pending] = await env.DB.batch([
        env.DB.prepare("SELECT id FROM mission_attempts WHERE actor_id=? AND status='active' AND expires_at>CURRENT_TIMESTAMP LIMIT 1").bind(currentActor.id),
        env.DB.prepare("SELECT id,book_id,chapter,group_id,task_limit,score,total,completed_at FROM mission_attempts WHERE actor_id=? AND status='completed' ORDER BY rowid DESC LIMIT 100").bind(currentActor.id),
        env.DB.prepare("SELECT id,book_id,chapter,started_at FROM mission_attempts WHERE actor_id=? AND status='grading' ORDER BY started_at DESC,id DESC LIMIT 20").bind(currentActor.id),
      ]);
      if (!active.success || !history.success || !pending.success || !Array.isArray(active.results) || !Array.isArray(history.results) || !Array.isArray(pending.results)) return json({ error: "database_unavailable" }, 503);
      if (active.results.length) return json({ locked: true, attempts: [] });
      // A successful batch can still contain a legacy/corrupt summary. Never
      // publish an impossible score as a completed learning achievement.
      // Keep the saved result immutable: this GET only validates, never fixes
      // or deletes another user's historical attempts.
      const scoreValid = (row: Record<string, unknown>) =>
        typeof row.score === "number" && Number.isSafeInteger(row.score) && row.score >= 0 &&
        typeof row.total === "number" && Number.isSafeInteger(row.total) &&
        row.total > 0 && row.score <= row.total &&
        // A finite but inflated DB total is not evidence of work completed:
        // the recorded denominator must equal the attempt's saved task limit
        // and must be supported by the canonical source mission inventory.
        typeof row.task_limit === "number" && Number.isSafeInteger(row.task_limit) &&
        row.task_limit === row.total &&
        typeof row.book_id === "string" && Number.isSafeInteger(row.chapter) &&
        tasksFor(row.book_id, row.chapter as number).length >= row.task_limit;
      // Saved rows can predate current constraints or be corrupted in D1.
      // Invalid provenance must not be presented as an authentic chapter,
      // completed timestamp, or group/personal history. This read never repairs
      // another user's data or silently discards their record.
      const contextValid = (row: Record<string, unknown>, dateField: string) =>
        row && typeof row === "object" && !Array.isArray(row) &&
        typeof row.id === "string" && row.id.length > 0 && row.id.length <= 80 &&
        row.id.trim() === row.id &&
        typeof row.book_id === "string" && row.book_id.length > 0 &&
        row.book_id.length <= 8 && row.book_id.trim() === row.book_id &&
        Number.isSafeInteger(row.chapter) && (row.chapter as number) > 0 &&
        typeof row[dateField] === "string" &&
        (row[dateField] as string).trim() === row[dateField] &&
        canonicalHistoryUtcTimestamp(row[dateField]);
      const historyRows = history.results as Array<Record<string, unknown>>;
      const pendingRows = pending.results as Array<Record<string, unknown>>;
      if (historyRows.some(row =>
        !contextValid(row, "completed_at") || !scoreValid(row) ||
        (row.group_id != null &&
          (typeof row.group_id !== "string" || row.group_id.length < 1 ||
           row.group_id.length > 80 || row.group_id.trim() !== row.group_id))) ||
        pendingRows.some(row => !contextValid(row, "started_at")))
        return json({ error: "attempt_history_unavailable" }, 503);
      return json({ attempts: (history.results as Array<Record<string, unknown>>).map(row => ({ id: row.id, book: row.book_id, chapter: row.chapter, mode: row.group_id ? "group" : "personal", score: row.score, total: row.total, completedAt: row.completed_at })), pending: (pending.results as Array<Record<string, unknown>>).map(row => ({id:row.id,book:row.book_id,chapter:row.chapter,startedAt:row.started_at})) });
    } catch { return json({ error: "database_unavailable" }, 503); }
  }
  const attemptId = requestedAttemptId(url.searchParams.get("attemptId"));
  if (attemptId === null) {
    // Preserve the existing identity-service outage contract. A missing or
    // forged ID must not disguise an unavailable authenticator as a 404.
    // Never query a durable attempt or mutate D1 for this invalid identity.
    await actor(request);
    return json({ error: "attempt_not_found" }, 404);
  }
  const { attempt } = await ownedAttempt(request, attemptId);
  if (!attempt) return json({ error: "attempt_not_found" }, 404);
  if (attempt.status === "invalidated") return json({ error: "attempt_invalidated" }, 409);
  if (attempt.status === "completed") return completedResponse(attempt);
  if (attempt.status === "grading") return json({ grading: true });
  // Unknown/corrupt lifecycle states must never fall through to live task
  // disclosure. Only an explicitly active attempt can expose its next task.
  if (attempt.status !== "active") return json({ error: "attempt_state_invalid" }, 409);
  const deadline = attemptDeadline(attempt.expires_at);
  if (deadline === null) return json({ error: "attempt_state_invalid" }, 409);
  if (deadline <= Date.now()) return json({ error: "attempt_expired" }, 410);
  if (!storedLocale(attempt.locale)) return json({ error: "attempt_state_invalid" }, 409);
  const tasks = tasksFor(attempt.book_id, attempt.chapter).slice(0, attempt.task_limit), task = tasks[attempt.current_index];
  if (!task) return json({ error: "attempt_state_invalid" }, 409);
  return json({ attemptId: attempt.id, task: publicTask(task, attempt.locale, attempt.current_index + 1, tasks.length) });
  } catch { return json({ error: "database_unavailable" }, 503); }
}

export async function POST(request: Request) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  if (!sameOrigin(request)) return json({ error: "cross_origin_request" }, 403);
  // Guard every D1-dependent actor lookup and preflight, not only finalization.
  try {
  const action = new URL(request.url).searchParams.get("action") || "start";
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return json({ error: "invalid_json" }, 400);

  if (action === "chapter") {
    const book = requestedBook(body.book), chapter = requestedChapter(body.chapter);
    if (book === null) return json({ error: "invalid_book" }, 400);
    if (chapter === null) return json({ error: "invalid_chapter" }, 400);
    const currentActor = await actor(request);
    if (!currentActor) return json({ invalidated: false });
    // Invalidate before reporting a match: a read-only lookup would reveal the
    // active passage through enumeration. Group context must not bypass this.
    const result = await env.DB.batch([
      env.DB.prepare("UPDATE mission_attempts SET status='invalidated',invalidated_at=CURRENT_TIMESTAMP,invalidation_reason='chapter_opened' WHERE actor_id=? AND book_id=? AND chapter=? AND status='active' AND expires_at>CURRENT_TIMESTAMP").bind(currentActor.id, book, chapter),
      env.DB.prepare("UPDATE chapter_read_receipts SET consumed_at=CURRENT_TIMESTAMP WHERE actor_id=? AND book_id=? AND chapter=? AND consumed_at IS NULL").bind(currentActor.id, book, chapter),
    ]);
    const changes = confirmedBatch(result, 2);
    if (!changes) return json({ error: "database_unavailable" }, 503);
    return json({ invalidated: changes[0] > 0 });
  }

  if (action === "read") {
    const currentActor = await actor(request, true);
    if (!currentActor) return json({ error: "actor_unavailable" }, 401);
    const book = requestedBook(body.book), chapter = requestedChapter(body.chapter), groupId = requestedGroupId(body.groupId);
    if (groupId === null) return json({ error: "invalid_group" }, 400);
    if (book === null) return json({ error: "invalid_book" }, 400);
    if (chapter === null) return json({ error: "invalid_chapter" }, 400);
    if (!tasksFor(book, chapter).length) return json({ error: "mission_chapter_unavailable" }, 404);
    if (groupId && (!currentActor.identity || !await groupFacilitator(groupId, currentActor.identity.userId))) return json({ error: "group_facilitator_required" }, 403);
    const read=await env.DB.prepare("INSERT INTO chapter_read_receipts (id,actor_id,book_id,chapter,group_id) SELECT ?,?,?,?,? WHERE (?='' OR EXISTS (SELECT 1 FROM home_group_members WHERE group_id=? AND user_id=? AND role IN ('owner','facilitator')))")
      .bind(crypto.randomUUID(), currentActor.id, book, chapter, groupId || null, groupId, groupId, currentActor.id).run();
    const readChanges = confirmedChanges(read);
    if (readChanges === null) return json({ error: "database_unavailable" }, 503);
    if (readChanges === 0) return json({ error: "group_facilitator_required" }, 403);
    return json({ ok: true }, 201, currentActor.cookie ? { "Set-Cookie": currentActor.cookie } : {});
  }

  if (action === "start") {
    const currentActor = await actor(request, true);
    if (!currentActor) return json({ error: "actor_unavailable" }, 401);
    if (currentActor.identity && !currentActor.identity.emailVerified) return json({ error: "email_verification_required" }, 403);
    const book = requestedBook(body.book), chapter = requestedChapter(body.chapter), selectedLocale = requestedLocale(body.locale), groupId = requestedGroupId(body.groupId);
    if (groupId === null) return json({ error: "invalid_group" }, 400);
    if (book === null) return json({ error: "invalid_book" }, 400);
    if (chapter === null) return json({ error: "invalid_chapter" }, 400);
    if (selectedLocale === null) return json({ error: "invalid_locale" }, 400);
    const available = tasksFor(book, chapter);
    if (body.missionId !== MISSION_ID || !available.length) return json({ error: "mission_chapter_unavailable" }, 404);
    if (groupId && (!currentActor.identity || !await groupFacilitator(groupId, currentActor.identity.userId))) return json({ error: "group_facilitator_required" }, 403);
    if (groupId) {
      const registration = await env.DB.prepare("SELECT weekly_goal,catchup_mode,status,start_date FROM group_marathon_registrations WHERE group_id=?")
        .bind(groupId).first<{ weekly_goal: number; catchup_mode: string; status: string; start_date: string | null }>();
      if (registration) {
        if (registration.status !== "active" || !registration.start_date) return json({ error: "marathon_not_started" }, 409);
        // Database rows can predate the client validator or have bad SQLite
        // storage types; never let NaN/unsupported cohort modes unlock tasks.
        if (!Number.isSafeInteger(registration.weekly_goal) ||
            registration.weekly_goal < 1 || registration.weekly_goal > 31 ||
            registration.weekly_goal % 2 !== 1 ||
            !["steady", "flexible"].includes(registration.catchup_mode) ||
            !/^\d{4}-\d{2}-\d{2}$/.test(registration.start_date) ||
            !Number.isFinite(Date.parse(registration.start_date)) ||
            new Date(registration.start_date).toISOString().slice(0, 10) !== registration.start_date)
          return json({ error: "marathon_state_invalid" }, 409);
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
        // A missing or corrupt D1 usage aggregate is not proof of zero study.
        // Refuse to unlock a group mission on uncertain quota evidence.
        if (!used || !Number.isSafeInteger(used.count) || used.count < 0)
          return json({ error: "database_unavailable" }, 503);
        if (!repeated && used.count >= allowed) return json({ error: "weekly_limit_reached" }, 409);
      }
    }
    const receipt = await env.DB.prepare("SELECT id FROM chapter_read_receipts WHERE actor_id=? AND book_id=? AND chapter=? AND COALESCE(group_id,'')=? AND consumed_at IS NULL ORDER BY completed_at DESC LIMIT 1")
      .bind(currentActor.id, book, chapter, groupId).first<{ id: string }>();
    if (!receipt) return json({ error: "chapter_must_be_read" }, 409);
    const id = crypto.randomUUID(), taskLimit = currentActor.guest ? 1 : available.length;
    const started = await env.DB.batch([
      env.DB.prepare("INSERT INTO mission_attempts (id,actor_id,mission_id,book_id,chapter,group_id,locale,task_limit,expires_at) SELECT ?,?,?,?,?,?,?,?,datetime('now','+2 hours') WHERE EXISTS (SELECT 1 FROM chapter_read_receipts WHERE id=? AND actor_id=? AND consumed_at IS NULL) AND (?='' OR EXISTS (SELECT 1 FROM home_group_members WHERE group_id=? AND user_id=? AND role IN ('owner','facilitator')))")
        .bind(id, currentActor.id, MISSION_ID, book, chapter, groupId || null, selectedLocale, taskLimit, receipt.id, currentActor.id, groupId, groupId, currentActor.id),
      env.DB.prepare("UPDATE mission_attempts SET status='invalidated',invalidated_at=CURRENT_TIMESTAMP,invalidation_reason='new_attempt' WHERE actor_id=? AND status='active' AND id<>? AND EXISTS (SELECT 1 FROM mission_attempts WHERE id=?)").bind(currentActor.id, id, id),
      env.DB.prepare("UPDATE chapter_read_receipts SET consumed_at=CURRENT_TIMESTAMP WHERE id=? AND EXISTS (SELECT 1 FROM mission_attempts WHERE id=?)").bind(receipt.id, id),
    ]);
    const startChanges = confirmedBatch(started, 3);
    if (!startChanges) return json({ error: "database_unavailable" }, 503);
    if (startChanges[0] === 0) return json({ error: "chapter_must_be_read" }, 409);
    // A one-row INSERT must consume exactly its one read receipt. A valid
    // batch shape alone cannot certify this transition: a zero/multi-row
    // receipt update must never unlock the first private assessment task.
    // Prior active attempts may legitimately be zero or several rows.
    if (startChanges[0] !== 1 || startChanges[2] !== 1)
      return json({ error: "database_unavailable" }, 503);
    return json({ attemptId: id, task: publicTask(available[0], selectedLocale, 1, taskLimit), guest: currentActor.guest }, 201, currentActor.cookie ? { "Set-Cookie": currentActor.cookie } : {});
  }

  if (action === "invalidate") {
    const attemptId = requestedAttemptId(body.attemptId);
    if (attemptId === null) return json({ error: "attempt_not_found" }, 404);
    const { attempt } = await ownedAttempt(request, attemptId);
    if (!attempt) return json({ error: "attempt_not_found" }, 404);
    if (attempt.status === "active") {
      const invalidated = await env.DB.prepare("UPDATE mission_attempts SET status='invalidated',invalidated_at=CURRENT_TIMESTAMP,invalidation_reason=? WHERE id=? AND status='active'")
        .bind(clean(body.reason, 80) || "chapter_opened", attempt.id).run();
      if (confirmedChanges(invalidated) === null) return json({ error: "database_unavailable" }, 503);
    }
    return json({ ok: true });
  }

  if (action === "finalize") {
    const attemptId = requestedAttemptId(body.attemptId);
    if (attemptId === null) return json({ error: "attempt_not_found" }, 404);
    const { currentActor, attempt } = await ownedAttempt(request, attemptId);
    if (!currentActor || !attempt) return json({ error: "attempt_not_found" }, 404);
    return finishAttempt(attempt, currentActor.id, currentActor.guest);
  }

  if (action === "answer") {
    const attemptId = requestedAttemptId(body.attemptId);
    if (attemptId === null) return json({ error: "attempt_not_found" }, 404);
    const { currentActor, attempt } = await ownedAttempt(request, attemptId);
    if (!currentActor || !attempt) return json({ error: "attempt_not_found" }, 404);
    // Task cursors, including the idempotent grading path, must be JSON numbers.
    const taskIndex = body.taskIndex;
    if (typeof taskIndex !== "number" || !Number.isSafeInteger(taskIndex))
      return json({ error: "invalid_answer" }, 400);
    if ((attempt.status === "grading" || attempt.status === "completed") && taskIndex === attempt.task_limit)
      return finishAttempt(attempt, currentActor.id, currentActor.guest, true);
    if (attempt.status !== "active") return json({ error: attempt.status === "invalidated" ? "attempt_invalidated" : "attempt_closed" }, 409);
    if (!storedLocale(attempt.locale)) return json({ error: "attempt_state_invalid" }, 409);
    const deadline = attemptDeadline(attempt.expires_at);
    if (deadline === null) return json({ error: "attempt_state_invalid" }, 409);
    if (deadline <= Date.now()) {
      const expired = await env.DB.prepare("UPDATE mission_attempts SET status='invalidated',invalidated_at=CURRENT_TIMESTAMP,invalidation_reason='expired' WHERE id=? AND status='active'").bind(attempt.id).run();
      if (confirmedChanges(expired) === null) return json({ error: "database_unavailable" }, 503);
      return json({ error: "attempt_expired" }, 410);
    }
    const tasks = tasksFor(attempt.book_id, attempt.chapter).slice(0, attempt.task_limit), task = tasks[attempt.current_index];
    if (taskIndex < attempt.current_index + 1) return json({ error: "answer_already_submitted" }, 409);
    if (!task || taskIndex !== attempt.current_index + 1 || !Array.isArray(body.selected)) return json({ error: "invalid_answer" }, 400);
    // Answer option indexes are numeric JSON values, not coercible strings,
    // booleans or null. Reject ambiguous input before any durable grading write.
    if ((body.selected as unknown[]).some(index => typeof index !== "number"))
      return json({ error: "invalid_answer" }, 400);
    const selected = [...new Set(body.selected as number[])].sort((a, b) => a - b);
    if (!selected.length || selected.some(index => !Number.isInteger(index) || index < 0 || index >= task.options[attempt.locale].length)) return json({ error: "invalid_answer" }, 400);
    const expected = [...task.correct].sort((a, b) => a - b), correct = JSON.stringify(selected) === JSON.stringify(expected);
    const nextIndex = attempt.current_index + 1;
    const accepted = await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO mission_attempt_answers (attempt_id,task_id,selected_json,is_correct) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM mission_attempts WHERE id=? AND status='active' AND expires_at>CURRENT_TIMESTAMP AND current_index=?)")
        .bind(attempt.id, task.id, JSON.stringify(selected), correct ? 1 : 0, attempt.id, attempt.current_index),
      env.DB.prepare("UPDATE mission_attempts SET current_index=?,status=? WHERE id=? AND current_index=? AND status='active' AND expires_at>CURRENT_TIMESTAMP AND changes()=1")
        .bind(nextIndex, nextIndex === tasks.length ? "grading" : "active", attempt.id, attempt.current_index),
    ]);
    const answerChanges = confirmedBatch(accepted, 2);
    if (!answerChanges) return json({ error: "database_unavailable" }, 503);
    if (answerChanges[1] === 0) return json({ error: "attempt_changed" }, 409);
    // A moved cursor without a stored answer is a damaged transaction, not a pass.
    if (answerChanges[0] !== 1 || answerChanges[1] !== 1)
      return json({ error: "database_unavailable" }, 503);
    if (nextIndex < tasks.length) return json({ accepted: true, task: publicTask(tasks[nextIndex], attempt.locale, nextIndex + 1, tasks.length) });
    return finishAttempt({ ...attempt, status: "grading", current_index: nextIndex }, currentActor.id, currentActor.guest, true);
  }

  return json({ error: "unknown_action" }, 400);
  } catch { return json({ error: "database_unavailable" }, 503); }
}
