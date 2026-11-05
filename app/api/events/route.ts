import { env } from "cloudflare:workers";
import { authenticateRequest, sameOrigin } from "../../../lib/auth";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => Response.json(data, {
  status, headers: { "Cache-Control": "private, no-store" },
});
const LOCALES = new Set(["uk", "ru", "en"]);
const validId = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 100;
const visible = (value: unknown, min: number, max: number): value is string =>
  typeof value === "string" && value.trim() === value && value.length >= min && value.length <= max &&
  !/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\u00a0\u034f\u115f\u1160\u2800\u3164\uffa0]/u.test(value);
const date = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
};
const timestamp = (value: unknown): value is string => typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value);

function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length < 9 || value.length > 500 || value.trim() !== value ||
      !/^https:\/\//i.test(value) || /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\s]/u.test(value)) return null;
  const authority = value.slice(value.indexOf("://") + 3).split(/[/?#]/u, 1)[0];
  if (!authority || authority.includes("@")) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password ? parsed.href : null;
  } catch { return null; }
}

type EventRow = {
  id: string; church_claim_id: string; church_name: string; title: string; summary: string;
  city: string; country_code: string; locale: string; starts_on: string; ends_on: string;
  accessibility_details: string; programme_url: string | null; registration_url: string | null;
  status: string; created_at: string; updated_at: string;
};

function project(row: EventRow, mine = false) {
  const programmeUrl = row.programme_url === null ? null : httpsUrl(row.programme_url);
  const registrationUrl = row.registration_url === null ? null : httpsUrl(row.registration_url);
  if (!validId(row.id) || !validId(row.church_claim_id) || !visible(row.church_name, 3, 160) ||
      !visible(row.title, 3, 160) || !visible(row.summary, 3, 500) || !visible(row.city, 2, 120) ||
      !/^[A-Z]{2}$/.test(row.country_code) || !LOCALES.has(row.locale) || !date(row.starts_on) ||
      !date(row.ends_on) || row.ends_on < row.starts_on || !visible(row.accessibility_details, 3, 500) ||
      (row.programme_url !== null && !programmeUrl) || (row.registration_url !== null && !registrationUrl) ||
      !timestamp(row.created_at) || !timestamp(row.updated_at) || !new Set(["active", "withdrawn"]).has(row.status) ||
      (!mine && row.status !== "active")) return null;
  return { id: row.id, churchId: row.church_claim_id, churchName: row.church_name, title: row.title,
    summary: row.summary, city: row.city, countryCode: row.country_code, locale: row.locale,
    startsOn: row.starts_on, endsOn: row.ends_on, accessibilityDetails: row.accessibility_details,
    programmeUrl, registrationUrl, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at };
}

export async function GET(request: Request) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  const url = new URL(request.url), view = url.searchParams.get("view") || "public";
  try {
    if (view === "public") {
      const query = url.searchParams.get("q") || "";
      if (query.length > 80 || query.trim() !== query || /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u.test(query))
        return json({ error: "invalid_search" }, 400);
      const rows = await env.DB.prepare(`SELECT e.id,c.id AS church_claim_id,c.name AS church_name,e.title,e.summary,e.city,e.country_code,
          e.locale,e.starts_on,e.ends_on,e.accessibility_details,e.programme_url,e.registration_url,e.status,e.created_at,e.updated_at
        FROM church_events e JOIN church_directory_claims c ON c.claimant_user_id=e.organizer_user_id
        JOIN accounts a ON a.id=c.claimant_user_id
        WHERE e.status='active' AND c.status='approved' AND c.claimant_user_id=e.organizer_user_id
          AND a.deleted_at IS NULL AND a.email_verified_at IS NOT NULL AND e.ends_on>=date('now')
        ORDER BY e.starts_on,e.title,e.id LIMIT 200`).all<EventRow>();
      if (!rows.success || !Array.isArray(rows.results)) return json({ error: "events_unavailable" }, 503);
      const normalized = query.normalize("NFKC").toLocaleLowerCase(), items = [];
      for (const row of rows.results) {
        const item = project(row);
        if (!item) return json({ error: "events_unavailable" }, 503);
        if (!normalized || [item.title, item.churchName, item.city, item.countryCode]
          .some(value => value.normalize("NFKC").toLocaleLowerCase().includes(normalized))) items.push(item);
      }
      return json({ items });
    }
    const actor = await authenticateRequest(request);
    if (!actor) return json({ error: "authentication_required" }, 401);
    if (actor.provider === "agent") return json({ error: "forbidden" }, 403);
    if (view !== "mine") return json({ error: "forbidden" }, 403);
    const rows = await env.DB.prepare(`SELECT e.id,c.id AS church_claim_id,c.name AS church_name,e.title,e.summary,e.city,e.country_code,
        e.locale,e.starts_on,e.ends_on,e.accessibility_details,e.programme_url,e.registration_url,e.status,e.created_at,e.updated_at
      FROM church_events e JOIN church_directory_claims c ON c.claimant_user_id=e.organizer_user_id
      WHERE e.organizer_user_id=? ORDER BY e.starts_on,e.id LIMIT 200`).bind(actor.userId).all<EventRow>();
    if (!rows.success || !Array.isArray(rows.results)) return json({ error: "events_unavailable" }, 503);
    const items = [];
    for (const row of rows.results) {
      const item = project(row, true);
      if (!item) return json({ error: "events_unavailable" }, 503);
      items.push(item);
    }
    return json({ items });
  } catch { return json({ error: "events_unavailable" }, 503); }
}

export async function POST(request: Request) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  if (!sameOrigin(request)) return json({ error: "cross_origin_request" }, 403);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return json({ error: "invalid_json" }, 400);
  let actor;
  try { actor = await authenticateRequest(request); }
  catch { return json({ error: "authentication_unavailable" }, 503); }
  if (!actor) return json({ error: "authentication_required" }, 401);
  if (actor.provider === "agent" || !actor.emailVerified) return json({ error: "forbidden" }, 403);

  if (body.action === "submit") {
    const programmeUrl = body.programmeUrl === "" || body.programmeUrl === null || body.programmeUrl === undefined
      ? null : httpsUrl(body.programmeUrl);
    const registrationUrl = body.registrationUrl === "" || body.registrationUrl === null || body.registrationUrl === undefined
      ? null : httpsUrl(body.registrationUrl);
    const id = body.id === undefined || body.id === null || body.id === "" ? crypto.randomUUID() : body.id;
    if (!validId(id) || !validId(body.churchId) || !visible(body.title, 3, 160) ||
        !visible(body.summary, 3, 500) || !visible(body.city, 2, 120) ||
        typeof body.countryCode !== "string" || !/^[A-Z]{2}$/.test(body.countryCode) ||
        typeof body.locale !== "string" || !LOCALES.has(body.locale) || !date(body.startsOn) || !date(body.endsOn) ||
        body.endsOn < body.startsOn || !visible(body.accessibilityDetails, 3, 500) ||
        (body.programmeUrl !== "" && body.programmeUrl !== null && body.programmeUrl !== undefined && !programmeUrl) ||
        (body.registrationUrl !== "" && body.registrationUrl !== null && body.registrationUrl !== undefined && !registrationUrl) ||
        body.organizerAuthorityAttested !== true || body.publicationConsent !== true)
      return json({ error: "invalid_event" }, 400);
    try {
      const existingId = body.id === undefined || body.id === null || body.id === "" ? "" : id;
      const result = await env.DB.prepare(`INSERT INTO church_events
        (id,church_claim_id,organizer_user_id,title,summary,city,country_code,locale,starts_on,ends_on,
          accessibility_details,programme_url,registration_url,organizer_authority_attested,publication_consent,status)
        SELECT ?,c.id,c.claimant_user_id,?,?,?,?,?,?,?,?,?,?,1,1,'active' FROM church_directory_claims c
        JOIN accounts a ON a.id=c.claimant_user_id
        WHERE c.id=? AND c.claimant_user_id=? AND c.status='approved' AND a.deleted_at IS NULL AND a.email_verified_at IS NOT NULL
          AND (?='' OR EXISTS(SELECT 1 FROM church_events old WHERE old.id=? AND old.organizer_user_id=?))
        ON CONFLICT(id) DO UPDATE SET church_claim_id=excluded.church_claim_id,title=excluded.title,summary=excluded.summary,
          city=excluded.city,country_code=excluded.country_code,locale=excluded.locale,starts_on=excluded.starts_on,
          ends_on=excluded.ends_on,accessibility_details=excluded.accessibility_details,programme_url=excluded.programme_url,
          registration_url=excluded.registration_url,organizer_authority_attested=1,publication_consent=1,status='active',
          updated_at=CURRENT_TIMESTAMP WHERE church_events.organizer_user_id=excluded.organizer_user_id`)
        .bind(id, body.title, body.summary, body.city, body.countryCode, body.locale, body.startsOn, body.endsOn,
          body.accessibilityDetails, programmeUrl, registrationUrl, body.churchId, actor.userId,
          existingId, existingId, actor.userId).run();
      const changes = result.meta?.changes;
      if (!result.success || !Number.isSafeInteger(changes) || changes < 0 || changes > 1)
        return json({ error: "event_failed" }, 503);
      return changes === 1 ? json({ ok: true, id }, 201) : json({ error: "approved_church_required" }, 409);
    } catch { return json({ error: "event_failed" }, 503); }
  }
  if (body.action === "withdraw") {
    if (!validId(body.id)) return json({ error: "invalid_event" }, 400);
    try {
      const result = await env.DB.prepare(`UPDATE church_events SET status='withdrawn',updated_at=CURRENT_TIMESTAMP
        WHERE id=? AND organizer_user_id=? AND status='active'`).bind(body.id, actor.userId).run();
      const changes = result.meta?.changes;
      if (!result.success || !Number.isSafeInteger(changes) || changes < 0 || changes > 1)
        return json({ error: "withdraw_failed" }, 503);
      return changes === 1 ? json({ ok: true }) : json({ error: "not_found_or_closed" }, 409);
    } catch { return json({ error: "withdraw_failed" }, 503); }
  }
  return json({ error: "unknown_action" }, 400);
}
