import { env } from "cloudflare:workers";
import { authenticateRequest, isVerifiedOwner, sameOrigin } from "../../../lib/auth";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
const validId = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 100;
type Snapshot = { title: string; locale: string; data: { prompt: string; reference: string; options: string[]; answer: string; explanation: string } };
type RightsBasis = "original" | "permission" | "open_license" | "public_domain";
type RightsRow = { rights_holder: string | null; rights_basis: string | null; license_url: string | null };
type RightsMetadata = { holder: string; basis: RightsBasis; licenseUrl: string | null };
const RIGHTS_BASES = new Set<RightsBasis>(["original", "permission", "open_license", "public_domain"]);

function httpsUrl(value: unknown): string | null {
  // Match the canonical reader's raw-provenance boundary. WHATWG URL
  // percent-encodes bidi/invisible Unicode and silently accepts an empty
  // user-info delimiter, so inspect the original string before parsing.
  if (typeof value !== "string" || value.length < 9 || value.length > 500 ||
      value.trim() !== value || !/^https:\/\//i.test(value) ||
      /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\s]/u.test(value)) return null;
  const authority = value.slice(value.indexOf("://") + 3).split(/[/?#]/u, 1)[0];
  if (!authority || authority.includes("@")) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password ? parsed.href : null;
  } catch { return null; }
}

// `null` is an honest legacy record; `undefined` means corrupt or partial
// structured metadata and must fail the catalogue read closed.
function readRights(row: RightsRow): RightsMetadata | null | undefined {
  if (row.rights_holder === null && row.rights_basis === null && row.license_url === null) return null;
  if (typeof row.rights_holder !== "string" || row.rights_holder.trim() !== row.rights_holder ||
      row.rights_holder.length < 2 || row.rights_holder.length > 160 ||
      typeof row.rights_basis !== "string" || !RIGHTS_BASES.has(row.rights_basis as RightsBasis)) return undefined;
  const licenseUrl = row.license_url === null ? null : httpsUrl(row.license_url);
  if (row.license_url !== null && !licenseUrl) return undefined;
  if (row.rights_basis === "open_license" && !licenseUrl) return undefined;
  return { holder: row.rights_holder, basis: row.rights_basis as RightsBasis, licenseUrl };
}
function readSnapshot(raw: string): Snapshot | null {
  try {
    const v = JSON.parse(raw), d = v?.data;
    // Legacy snapshots must satisfy the same bounded, three-locale contract as
    // the canonical study-material writer before any public/private read.
    if (typeof v?.title !== "string" || v.title.trim().length < 3 || v.title.length > 160 ||
      !["uk", "ru", "en"].includes(v?.locale) || !d ||
      typeof d.prompt !== "string" || d.prompt.trim().length < 8 || d.prompt.length > 3000 ||
      typeof d.reference !== "string" || d.reference.trim().length < 3 || d.reference.length > 200 ||
      typeof d.answer !== "string" || !d.answer.trim() || d.answer.length > 500 ||
      typeof d.explanation !== "string" || d.explanation.trim().length < 8 || d.explanation.length > 2000 ||
      !Array.isArray(d.options) || d.options.length < 2 || d.options.length > 8 ||
      !d.options.every((x: unknown) => typeof x === "string" && x.trim().length > 0 && x.length <= 500) ||
      new Set(d.options).size !== d.options.length || !d.options.includes(d.answer)) return null;
    return v as Snapshot;
  } catch { return null; }
}
function owner(identity: Awaited<ReturnType<typeof authenticateRequest>>): boolean {
  return isVerifiedOwner(identity);
}
async function editor(identity: Awaited<ReturnType<typeof authenticateRequest>>) {
  if (!identity || identity.provider === "agent" || !identity.emailVerified) return false;
  if (owner(identity)) return true;
  if (identity.provider !== "password") return false;
  return Boolean(await env.DB!.prepare("SELECT r.user_id FROM editorial_roles r JOIN accounts a ON a.id=r.user_id WHERE r.user_id=? AND a.deleted_at IS NULL AND a.email_verified_at IS NOT NULL").bind(identity.userId).first());
}

export async function GET(request: Request) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  try {
  const view = new URL(request.url).searchParams.get("view") || "public";
  if (view === "public") {
    const rows = await env.DB.prepare("SELECT id,snapshot,provenance,submitted_at,reviewed_at,rights_holder,rights_basis,license_url FROM material_submissions WHERE status='approved' ORDER BY reviewed_at DESC,id LIMIT 200").all<{id:string;snapshot:string;provenance:string;submitted_at:string;reviewed_at:string} & RightsRow>();
    if (!rows.success || !Array.isArray(rows.results)) return json({ error: "materials_unavailable" }, 503);
    const items = [];
    for (const row of rows.results) {
      const item = readSnapshot(row.snapshot);
      const rights = readRights(row);
      if (!item || rights === undefined || typeof row.reviewed_at !== "string" || !row.reviewed_at || row.reviewed_at.length > 100) return json({ error: "materials_unavailable" }, 503);
      items.push({ id: row.id, title: item.title, locale: item.locale, reference: item.data.reference, prompt: item.data.prompt, options: item.data.options, provenance: row.provenance, reviewedAt: row.reviewed_at, rights });
    }
    return json({ items });
  }
  const identity = await authenticateRequest(request);
  if (!identity || identity.provider === "agent") return json({ error: "authentication_required" }, 401);
  if (view !== "mine" && view !== "queue" && view !== "history") return json({ error: "unknown_view" }, 400);
  if ((view === "queue" || view === "history") && !await editor(identity)) return json({ error: "forbidden" }, 403);
  const query = view === "mine"
    ? env.DB.prepare("SELECT id,material_id,snapshot,provenance,status,submitted_at,reviewed_at,review_note,closed_at,rights_holder,rights_basis,license_url,(SELECT reason FROM material_takedowns WHERE submission_id=material_submissions.id) AS takedown_reason FROM material_submissions WHERE author_id=? ORDER BY submitted_at DESC,id DESC LIMIT 200").bind(identity.userId)
    : view === "queue"
      ? env.DB.prepare("SELECT id,material_id,snapshot,provenance,status,submitted_at,reviewed_at,review_note,closed_at,author_id,reviewed_by,source_checked,rights_checked,rights_holder,rights_basis,license_url FROM material_submissions WHERE status='pending' AND (?=1 OR EXISTS (SELECT 1 FROM editorial_roles r JOIN accounts a ON a.id=r.user_id WHERE r.user_id=? AND a.deleted_at IS NULL AND a.email_verified_at IS NOT NULL)) ORDER BY submitted_at,id LIMIT 200").bind(owner(identity) ? 1 : 0,identity.userId)
      : env.DB.prepare("SELECT id,material_id,snapshot,provenance,status,submitted_at,reviewed_at,review_note,closed_at,author_id,reviewed_by,source_checked,rights_checked,rights_holder,rights_basis,license_url,(SELECT reason FROM material_takedowns WHERE submission_id=material_submissions.id) AS takedown_reason,(SELECT actor_user_id FROM material_takedowns WHERE submission_id=material_submissions.id) AS takedown_actor FROM material_submissions WHERE (?=1 OR EXISTS (SELECT 1 FROM editorial_roles r JOIN accounts a ON a.id=r.user_id WHERE r.user_id=? AND a.deleted_at IS NULL AND a.email_verified_at IS NOT NULL)) ORDER BY submitted_at DESC,id DESC LIMIT 200").bind(owner(identity) ? 1 : 0,identity.userId);
  const rows = await query.all<({id:string;material_id:string;snapshot:string;provenance:string;status:string;submitted_at:string;reviewed_at:string|null;review_note:string;closed_at:string|null;author_id?:string;reviewed_by?:string|null;source_checked?:number;rights_checked?:number;takedown_reason?:string|null;takedown_actor?:string|null} & RightsRow)>();
  if (!rows.success || !Array.isArray(rows.results)) return json({ error: "materials_unavailable" }, 503);
  const items = [];
  for (const row of rows.results) {
    const snapshot = readSnapshot(row.snapshot);
    const rights = readRights(row);
    if (!snapshot || rights === undefined) return json({ error: "materials_unavailable" }, 503);
    items.push({ id: row.id, materialId: row.material_id, snapshot, provenance: row.provenance, rights, status: row.status, submittedAt: row.submitted_at, reviewedAt: row.reviewed_at, reviewNote: row.review_note, closedAt: row.closed_at, takedownReason: row.takedown_reason || null,
      ...(view === "mine" ? {} : { authorId: row.author_id, reviewerId: row.reviewed_by, sourceChecked: Boolean(row.source_checked), rightsChecked: Boolean(row.rights_checked), takedownActor: row.takedown_actor || null }) });
  }
  return json({ items });
  } catch { return json({ error: "materials_unavailable" }, 503); }
}

export async function POST(request: Request) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  if (!sameOrigin(request)) return json({ error: "cross_origin_request" }, 403);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return json({ error: "invalid_json" }, 400);
  if (body.action === "librarySearch") {
    // Match only fields already visible in the public catalogue. Searching the
    // entire snapshot would turn private answer/explanation text into an oracle.
    if (typeof body.query !== "string" || body.query.length > 100)
      return json({ error: "invalid_search" }, 400);
    const cursor = body.cursor;
    if (cursor !== null && cursor !== undefined &&
      (!cursor || typeof cursor !== "object" || Array.isArray(cursor) ||
       Object.keys(cursor).sort().join(",") !== "id,submittedAt" ||
       !validId((cursor as Record<string, unknown>).id) ||
       typeof (cursor as Record<string, unknown>).submittedAt !== "string" ||
       !(cursor as {submittedAt:string}).submittedAt.length ||
       (cursor as {submittedAt:string}).submittedAt.length > 100))
      return json({ error: "invalid_search" }, 400);
    const after = cursor as {id:string;submittedAt:string} | null | undefined;
    try {
      // A keyset cursor keeps equal timestamps stable and avoids skipping rows
      // when a prior page is removed. Scan at most 200 records per request;
      // the extra row tells the client whether to offer continued searching.
      const sql = "SELECT id,snapshot,provenance,submitted_at,reviewed_at,rights_holder,rights_basis,license_url FROM material_submissions WHERE status='approved'" +
        (after ? " AND (submitted_at < ? OR (submitted_at = ? AND id > ?))" : "") +
        " ORDER BY submitted_at DESC,id ASC LIMIT 201";
      const statement = env.DB.prepare(sql);
      const rows = after ? await statement.bind(after.submittedAt, after.submittedAt, after.id).all<{
        id:string;snapshot:string;provenance:string;submitted_at:string;reviewed_at:string
      } & RightsRow>() : await statement.all<{id:string;snapshot:string;provenance:string;submitted_at:string;reviewed_at:string} & RightsRow>();
      if (!rows.success || !Array.isArray(rows.results)) return json({ error: "materials_unavailable" }, 503);
      const normalize = (value: string) => value.normalize("NFKC").toLowerCase();
      const query = normalize(body.query.trim());
      const items = [];
      let nextCursor: {id:string;submittedAt:string} | null = null;
      for (let i = 0; i < Math.min(rows.results.length, 200); i++) {
        const row = rows.results[i], item = readSnapshot(row.snapshot), rights = readRights(row);
        if (!item || !validId(row.id) || typeof row.provenance !== "string" || row.provenance.length > 1000 ||
          typeof row.submitted_at !== "string" || !row.submitted_at.length || row.submitted_at.length > 100 ||
          typeof row.reviewed_at !== "string" || !row.reviewed_at.length || row.reviewed_at.length > 100 || rights === undefined)
          return json({ error: "materials_unavailable" }, 503);
        if (!query || [item.title, item.data.reference, item.data.prompt, row.provenance, rights?.holder || "", rights?.basis || "", rights?.licenseUrl || ""]
          .some(value => normalize(value).includes(query))) {
          items.push({ id: row.id, title: item.title, locale: item.locale, reference: item.data.reference,
            prompt: item.data.prompt, options: item.data.options, provenance: row.provenance,
            reviewedAt: row.reviewed_at, rights });
        }
        if (items.length === 12 || i === 199) {
          if (i + 1 < rows.results.length) nextCursor = { id: row.id, submittedAt: row.submitted_at };
          break;
        }
      }
      return json({ items, nextCursor });
    } catch { return json({ error: "materials_unavailable" }, 503); }
  }
  if (body.action === "answer") {
    if (!validId(body.id) || !Number.isInteger(body.choice) || Number(body.choice) < 0) return json({ error: "invalid_answer" }, 400);
    try {
    const row = await env.DB.prepare("SELECT snapshot FROM material_submissions WHERE id=? AND status='approved'").bind(body.id).first<{snapshot:string}>();
    if (!row) return json({ error: "not_found" }, 404);
    const snapshot = readSnapshot(row.snapshot);
    if (!snapshot) return json({ error: "materials_unavailable" }, 503);
    const index = Number(body.choice);
    if (index >= snapshot.data.options.length) return json({ error: "invalid_answer" }, 400);
    const correct = snapshot.data.options[index] === snapshot.data.answer;
    return json(correct ? { correct, explanation: snapshot.data.explanation } : { correct });
    } catch { return json({ error: "materials_unavailable" }, 503); }
  }
  // A failing session store is not evidence of an unauthenticated author.
  let identity: Awaited<ReturnType<typeof authenticateRequest>>;
  try { identity = await authenticateRequest(request); }
  catch { return json({ error: "materials_unavailable" }, 503); }
  if (!identity || identity.provider === "agent") return json({ error: "authentication_required" }, 401);
  if (body.action === "submit") {
    const provenance = typeof body.provenance === "string" ? body.provenance.trim() : "";
    const rightsHolder = typeof body.rightsHolder === "string" ? body.rightsHolder.trim() : "";
    const rightsBasis = typeof body.rightsBasis === "string" && RIGHTS_BASES.has(body.rightsBasis as RightsBasis) ? body.rightsBasis as RightsBasis : null;
    const licenseUrl = body.licenseUrl === "" || body.licenseUrl === null || body.licenseUrl === undefined ? null : httpsUrl(body.licenseUrl);
    if (!validId(body.materialId) || provenance.length < 3 || provenance.length > 1000 ||
        rightsHolder.length < 2 || rightsHolder.length > 160 || !rightsBasis ||
        (body.licenseUrl !== "" && body.licenseUrl !== null && body.licenseUrl !== undefined && !licenseUrl) ||
        (rightsBasis === "open_license" && !licenseUrl) || body.rightsConfirmed !== true)
      return json({ error: "invalid_material" }, 400);
    const id = crypto.randomUUID();
    try {
      const draft = await env.DB.prepare("SELECT title,locale,data FROM study_materials WHERE id=? AND owner_user_id=?").bind(body.materialId, identity.userId).first<{title:string;locale:string;data:string}>();
      if (!draft) return json({ error: "not_found_or_pending" }, 409);
      let snapshot: string;
      try { snapshot = JSON.stringify({ title: draft.title, locale: draft.locale, data: JSON.parse(draft.data) }); }
      catch { return json({ error: "invalid_material" }, 400); }
      if (!readSnapshot(snapshot)) return json({ error: "invalid_material" }, 400);
      // The conditional INSERT is the source of truth; D1 .run() reports its
      // receipt without a SELECT-style write RETURNING race.
      const result = await env.DB.prepare(`INSERT INTO material_submissions(id,material_id,author_id,snapshot,provenance,rights_attested,status,rights_holder,rights_basis,license_url)
        SELECT ?,id,owner_user_id,json_object('title',title,'locale',locale,'data',json(data)),?,1,'pending',?,?,?
        FROM study_materials WHERE id=? AND owner_user_id=? AND title=? AND locale=? AND data=?
        ON CONFLICT DO NOTHING`).bind(id, provenance, rightsHolder, rightsBasis, licenseUrl, body.materialId, identity.userId, draft.title, draft.locale, draft.data).run();
      if (!result.success) return json({ error: "submission_failed" }, 503);
      // D1 must return a typed mutation receipt, not a coercible JSON value.
      // A lost or malformed ACK does not prove that the INSERT was rolled back.
      const changes = result.meta?.changes;
      if (!Number.isSafeInteger(changes) || changes < 0 || changes > 1) return json({ error: "submission_failed" }, 503);
      if (changes === 0) return json({ error: "not_found_or_pending" }, 409);
      return json({ ok: true, id }, 201);
    } catch { return json({ error: "submission_failed" }, 503); }
  }
  if (body.action === "withdraw") {
    if (!validId(body.id)) return json({ error: "invalid_submission" }, 400);
    try {
    const result = await env.DB.prepare("UPDATE material_submissions SET status='withdrawn',closed_at=CURRENT_TIMESTAMP WHERE id=? AND author_id=? AND status IN ('pending','approved')").bind(body.id, identity.userId).run();
    // An unconfirmed D1 UPDATE may already have committed; neither a missing
    // receipt nor a malformed affected-row count can claim a successful
    // withdrawal or a definitive not-found result.
    const changes = result.meta?.changes;
    if (!result.success || !Number.isSafeInteger(changes) || changes < 0 || changes > 1)
      return json({ error: "withdraw_failed" }, 503);
    return changes === 1 ? json({ ok: true }) : json({ error: "not_found_or_closed" }, 409);
    } catch { return json({ error: "withdraw_failed" }, 503); }
  }
  if (body.action === "takedown") {
    try { if (!await editor(identity)) return json({ error: "forbidden" }, 403); }
    catch { return json({ error: "takedown_failed" }, 503); }
    if (!validId(body.id) || typeof body.reason !== "string" ||
        body.reason.trim().length < 3 || body.reason.trim().length > 2000)
      return json({ error: "invalid_takedown" }, 400);
    try {
      const receipts = await env.DB.batch([
        env.DB.prepare(`UPDATE material_submissions SET status='withdrawn',closed_at=CURRENT_TIMESTAMP
          WHERE id=? AND status='approved' AND EXISTS
          (SELECT 1 FROM accounts a WHERE a.id=? AND a.deleted_at IS NULL AND a.email_verified_at IS NOT NULL
           AND (?=1 OR EXISTS (SELECT 1 FROM editorial_roles r WHERE r.user_id=a.id)))`)
          .bind(body.id, identity.userId, owner(identity) ? 1 : 0),
        env.DB.prepare("INSERT INTO material_takedowns(submission_id,actor_user_id,reason) SELECT ?,?,? WHERE changes()=1")
          .bind(body.id, identity.userId, body.reason.trim()),
      ]);
      if (!Array.isArray(receipts) || receipts.length !== 2 || receipts.some(r =>
        !r?.success || !Number.isSafeInteger(r.meta?.changes) || r.meta.changes < 0 || r.meta.changes > 1) ||
        receipts[0].meta.changes !== receipts[1].meta.changes) return json({ error: "takedown_failed" }, 503);
      return receipts[0].meta.changes === 1 ? json({ ok:true }) : json({ error:"not_found_or_closed" }, 409);
    } catch { return json({ error: "takedown_failed" }, 503); }
  }
  if (body.action === "review") {
    try { if (!await editor(identity)) return json({ error: "forbidden" }, 403); }
    catch { return json({ error: "review_failed" }, 503); }
    if (!validId(body.id) || (body.decision !== "approve" && body.decision !== "reject") || (body.note !== undefined && typeof body.note !== "string")) return json({ error: "invalid_review" }, 400);
    // Editorial decisions must preserve the full authored rationale. An
    // oversized note cannot be silently truncated into a different audit
    // record while acknowledging the review as successfully saved.
    if (typeof body.note === "string" && body.note.trim().length > 2000)
      return json({ error: "invalid_review" }, 400);
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (body.decision === "reject" && !note) return json({ error: "review_note_required" }, 400);
    if (body.decision === "approve" && (body.sourceChecked !== true || body.rightsChecked !== true)) return json({ error: "review_checks_required" }, 400);
    try {
      const results = await env.DB.batch([
        env.DB.prepare(`UPDATE material_submissions SET status='superseded',closed_at=CURRENT_TIMESTAMP
          WHERE material_id=(SELECT material_id FROM material_submissions WHERE id=? AND status='pending' AND author_id<>?)
          AND status='approved' AND ?='approve' AND (?=1 OR EXISTS (SELECT 1 FROM editorial_roles r JOIN accounts a ON a.id=r.user_id WHERE r.user_id=? AND a.deleted_at IS NULL AND a.email_verified_at IS NOT NULL))`).bind(body.id, identity.userId, body.decision, owner(identity) ? 1 : 0, identity.userId),
        env.DB.prepare("UPDATE material_submissions SET status=?,reviewed_at=CURRENT_TIMESTAMP,reviewed_by=?,review_note=?,source_checked=?,rights_checked=? WHERE id=? AND status='pending' AND author_id<>? AND (?=1 OR EXISTS (SELECT 1 FROM editorial_roles r JOIN accounts a ON a.id=r.user_id WHERE r.user_id=? AND a.deleted_at IS NULL AND a.email_verified_at IS NOT NULL))")
          .bind(body.decision === "approve" ? "approved" : "rejected", identity.userId, note, body.sourceChecked === true ? 1 : 0, body.rightsChecked === true ? 1 : 0, body.id, identity.userId, owner(identity) ? 1 : 0, identity.userId),
      ]);
      // D1 can commit a batch but lose its mutation receipt. A missing or
      // impossible changes count is unknown, never an approved/rejected ACK or
      // a fabricated "not found" response. The author can inspect history.
      if (!Array.isArray(results) || results.length !== 2 ||
        results.some(result => !result?.success ||
          !Number.isSafeInteger(result.meta?.changes) || result.meta.changes < 0) ||
        results[1].meta.changes > 1) return json({ error: "review_failed" }, 503);
      if (results[1].meta.changes === 1) return json({ ok: true });
      // The write predicates remain authoritative even if this explanatory read races.
      const own = await env.DB.prepare("SELECT id FROM material_submissions WHERE id=? AND status='pending' AND author_id=?")
        .bind(body.id, identity.userId).first<{id:string}>();
      return own ? json({ error: "self_review_forbidden" }, 403) : json({ error: "not_found_or_closed" }, 409);
    } catch { return json({ error: "review_failed" }, 503); }
  }
  return json({ error: "unknown_action" }, 400);
}
