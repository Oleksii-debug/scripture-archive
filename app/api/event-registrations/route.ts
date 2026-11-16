import { env } from "cloudflare:workers";
import { authenticateRequest, sameOrigin } from "../../../lib/auth";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => Response.json(data, {
  status, headers: { "Cache-Control": "private, no-store" },
});
const id = (value: unknown): value is string => typeof value === "string" &&
  /^[A-Za-z0-9_-]{1,100}$/.test(value);
const visible = (value: unknown, min: number, max: number): value is string => typeof value === "string" &&
  value.trim() === value && value.length >= min && value.length <= max &&
  !/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\u00a0\u034f\u115f\u1160\u2800\u3164\uffa0]/u.test(value);
const name = (value: unknown) => visible(value, 2, 120);
const date = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
};
const stamp = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value);
// This is the same current-claim boundary as the public event directory.
const currentEvent = `JOIN church_directory_claims c ON c.id=e.church_claim_id AND c.claimant_user_id=e.organizer_user_id
  JOIN accounts organizer ON organizer.id=e.organizer_user_id`;
const published = `e.status='active' AND c.status='approved' AND organizer.deleted_at IS NULL
  AND organizer.email_verified_at IS NOT NULL`;
type Registration = { id: string; event_id: string; attendee_name: string; consent_at: string;
  title: string; starts_on: string; ends_on: string; available: number; locale: string };

export async function GET(request: Request) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  try {
    const actor = await authenticateRequest(request);
    if (!actor) return json({ error: "authentication_required" }, 401);
    if (actor.provider === "agent" || !actor.emailVerified) return json({ error: "forbidden" }, 403);
    const params = new URL(request.url).searchParams, view = params.get("view") || "mine";
    if (["view", "eventId", "after"].some(field => params.getAll(field).length > 1))
      return json({ error: "invalid_query" }, 400);
    if (view === "mine") {
      const rows = await env.DB.prepare(`SELECT r.id,r.event_id,r.attendee_name,r.consent_at,e.title,e.starts_on,e.ends_on,e.locale,
          CASE WHEN EXISTS(SELECT 1 FROM church_directory_claims c JOIN accounts a ON a.id=c.claimant_user_id
            WHERE c.id=e.church_claim_id AND c.claimant_user_id=e.organizer_user_id AND c.status='approved'
              AND a.deleted_at IS NULL AND a.email_verified_at IS NOT NULL) AND e.status='active' THEN 1 ELSE 0 END AS available
        FROM event_registrations r JOIN church_events e ON e.id=r.event_id
        JOIN accounts participant ON participant.id=r.user_id
        WHERE r.user_id=? AND participant.deleted_at IS NULL AND participant.email_verified_at IS NOT NULL
        ORDER BY e.starts_on,r.id LIMIT 101`).bind(actor.userId).all<Registration>();
      if (!rows.success || !Array.isArray(rows.results) || rows.results.length > 100)
        return json({ error: "registrations_unavailable" }, 503);
      const items = [];
      for (const row of rows.results) {
        if (!id(row.id) || !id(row.event_id) || !name(row.attendee_name) || !stamp(row.consent_at) ||
            !visible(row.title, 3, 160) || !date(row.starts_on) || !date(row.ends_on) || row.ends_on < row.starts_on ||
            (row.available !== 0 && row.available !== 1) || !["uk", "ru", "en"].includes(row.locale))
          return json({ error: "registrations_unavailable" }, 503);
        items.push({ id: row.id, eventId: row.event_id, attendeeName: row.attendee_name,
          consentAt: row.consent_at, title: row.title, startsOn: row.starts_on, endsOn: row.ends_on,
          locale: row.locale, available: row.available === 1 });
      }
      return json({ items });
    }
    if (view !== "roster") return json({ error: "invalid_query" }, 400);
    const eventId = params.get("eventId"), after = params.get("after");
    if (!id(eventId) || (after !== null && !id(after))) return json({ error: "invalid_query" }, 400);
    const event = await env.DB.prepare(`SELECT e.id FROM church_events e ${currentEvent}
      WHERE e.id=? AND e.organizer_user_id=? AND ${published}`).bind(eventId, actor.userId).first();
    if (!event) return json({ error: "event_unavailable" }, 404);
    const rows = await env.DB.prepare(`SELECT r.id,r.attendee_name,r.consent_at FROM event_registrations r
      JOIN accounts a ON a.id=r.user_id JOIN church_events e ON e.id=r.event_id ${currentEvent}
      WHERE r.event_id=? AND e.organizer_user_id=? AND ${published}
        AND a.deleted_at IS NULL AND a.email_verified_at IS NOT NULL ${after ? "AND r.id>?" : ""}
      ORDER BY r.id LIMIT 101`).bind(eventId, actor.userId, ...(after ? [after] : [])).all<Registration>();
    if (!rows.success || !Array.isArray(rows.results)) return json({ error: "registrations_unavailable" }, 503);
    const items = [];
    for (const row of rows.results.slice(0, 100)) {
      if (!id(row.id) || !name(row.attendee_name) || !stamp(row.consent_at))
        return json({ error: "registrations_unavailable" }, 503);
      items.push({ id: row.id, attendeeName: row.attendee_name, consentAt: row.consent_at });
    }
    return json({ items, nextCursor: rows.results.length > 100 ? items.at(-1)!.id : null });
  } catch { return json({ error: "registrations_unavailable" }, 503); }
}

export async function POST(request: Request) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  if (!sameOrigin(request)) return json({ error: "cross_origin_request" }, 403);
  try {
    const actor = await authenticateRequest(request);
    if (!actor) return json({ error: "authentication_required" }, 401);
    if (actor.provider === "agent" || !actor.emailVerified) return json({ error: "forbidden" }, 403);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || !id(body.eventId)) return json({ error: "invalid_registration" }, 400);
    if (body.action === "cancel") {
      const result = await env.DB.prepare("DELETE FROM event_registrations WHERE event_id=? AND user_id=?")
        .bind(body.eventId, actor.userId).run();
      if (!result.success || !Number.isSafeInteger(result.meta?.changes) || result.meta.changes < 0 || result.meta.changes > 1)
        return json({ error: "registration_failed" }, 503);
      return json({ ok: true });
    }
    if (body.action !== "register" || !name(body.attendeeName) || body.sharingConsent !== true)
      return json({ error: "invalid_registration" }, 400);
    const result = await env.DB.prepare(`INSERT INTO event_registrations (id,event_id,user_id,attendee_name,consent_version)
      SELECT ?,e.id,participant.id,?,1 FROM church_events e ${currentEvent}
      JOIN accounts participant ON participant.id=?
      WHERE e.id=? AND ${published} AND e.registration_enabled=1 AND e.ends_on>=date('now')
        AND participant.deleted_at IS NULL AND participant.email_verified_at IS NOT NULL
        AND ((SELECT count(*) FROM event_registrations WHERE user_id=participant.id)<100
          OR EXISTS(SELECT 1 FROM event_registrations WHERE user_id=participant.id AND event_id=e.id))
      ON CONFLICT(event_id,user_id) DO UPDATE SET attendee_name=excluded.attendee_name,
        consent_version=1,consent_at=CURRENT_TIMESTAMP`)
      .bind(crypto.randomUUID(), body.attendeeName, actor.userId, body.eventId).run();
    if (!result.success || !Number.isSafeInteger(result.meta?.changes) || result.meta.changes < 0 || result.meta.changes > 1)
      return json({ error: "registration_failed" }, 503);
    return result.meta.changes === 1 ? json({ ok: true }, 201) : json({ error: "event_unavailable_or_limit_reached" }, 409);
  } catch { return json({ error: "registration_failed" }, 503); }
}
