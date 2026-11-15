import { env } from "cloudflare:workers";
import { authenticateRequest, isVerifiedOwner, sameOrigin } from "../../../lib/auth";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => Response.json(data, {
  status,
  headers: { "Cache-Control": "private, no-store" },
});

const LOCALES = new Set(["uk", "ru", "en"]);
const TRADITIONS = new Set(["orthodox", "catholic", "protestant", "adventist", "other"]);
const validId = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 100;
const visible = (value: unknown, min: number, max: number): value is string =>
  typeof value === "string" && value.trim() === value && value.length >= min && value.length <= max &&
  !/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\u00a0\u034f\u115f\u1160\u2800\u3164\uffa0]/u.test(value);
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

type ClaimRow = {
  id: string;
  claimant_user_id?: string;
  claimant_email?: string;
  name: string;
  city: string;
  country_code: string;
  locale: string;
  tradition: string;
  website_url: string | null;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by?: string | null;
  review_note?: string;
  verification_evidence?: string;
};

function publicClaim(row: ClaimRow) {
  const website = row.website_url === null ? null : httpsUrl(row.website_url);
  if (!validId(row.id) || !visible(row.name, 3, 160) || !visible(row.city, 2, 120) ||
      !/^[A-Z]{2}$/.test(row.country_code) || !LOCALES.has(row.locale) ||
      !TRADITIONS.has(row.tradition) || (row.website_url !== null && !website) ||
      row.status !== "approved" || !timestamp(row.reviewed_at)) return null;
  return { id: row.id, name: row.name, city: row.city, countryCode: row.country_code,
    locale: row.locale, tradition: row.tradition, websiteUrl: website, reviewedAt: row.reviewed_at };
}

const claimCore = (row: ClaimRow) => {
  const website = row.website_url === null ? null : httpsUrl(row.website_url);
  if (!validId(row.id) || !visible(row.name, 3, 160) || !visible(row.city, 2, 120) ||
      !/^[A-Z]{2}$/.test(row.country_code) || !LOCALES.has(row.locale) ||
      !TRADITIONS.has(row.tradition) || (row.website_url !== null && !website) ||
      !timestamp(row.submitted_at))
    return null;
  return { id: row.id, name: row.name, city: row.city, countryCode: row.country_code,
    locale: row.locale, tradition: row.tradition, websiteUrl: website, submittedAt: row.submitted_at };
};

async function identity(request: Request) { return authenticateRequest(request); }

export async function GET(request: Request) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  const url = new URL(request.url), view = url.searchParams.get("view") || "public";
  try {
    if (view === "public") {
      const query = url.searchParams.get("q") || "";
      if (query.length > 80 || query.trim() !== query ||
          /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u.test(query)) return json({ error: "invalid_search" }, 400);
      const rows = await env.DB.prepare(`SELECT id,name,city,country_code,locale,tradition,website_url,status,submitted_at,reviewed_at
        FROM church_directory_claims WHERE status='approved' ORDER BY name,city,id LIMIT 200`).all<ClaimRow>();
      if (!rows.success || !Array.isArray(rows.results)) return json({ error: "churches_unavailable" }, 503);
      const normalized = query.normalize("NFKC").toLocaleLowerCase();
      const items = [];
      for (const row of rows.results) {
        const item = publicClaim(row);
        if (!item) return json({ error: "churches_unavailable" }, 503);
        if (!normalized || [item.name, item.city, item.countryCode, item.tradition]
          .some(value => value.normalize("NFKC").toLocaleLowerCase().includes(normalized))) items.push(item);
      }
      return json({ items });
    }
    const actor = await identity(request);
    if (!actor) return json({ error: "authentication_required" }, 401);
    if (actor.provider === "agent") return json({ error: "forbidden" }, 403);
    if (view === "mine") {
      const rows = await env.DB.prepare(`SELECT id,name,city,country_code,locale,tradition,website_url,status,submitted_at,reviewed_at,review_note
        FROM church_directory_claims WHERE claimant_user_id=? LIMIT 1`).bind(actor.userId).all<ClaimRow>();
      if (!rows.success || !Array.isArray(rows.results) || rows.results.length > 1)
        return json({ error: "churches_unavailable" }, 503);
      const items = [];
      for (const row of rows.results) {
        const base = claimCore(row);
        if (!base || !new Set(["pending", "approved", "rejected", "withdrawn"]).has(row.status) ||
            (row.reviewed_at !== null && !timestamp(row.reviewed_at)) ||
            typeof row.review_note !== "string" || row.review_note.length > 2000)
          return json({ error: "churches_unavailable" }, 503);
        items.push({ ...base, status: row.status, reviewedAt: row.reviewed_at, reviewNote: row.review_note });
      }
      return json({ items });
    }
    if (view !== "queue" || !isVerifiedOwner(actor)) return json({ error: "forbidden" }, 403);
    const rows = await env.DB.prepare(`SELECT c.id,c.claimant_user_id,a.email AS claimant_email,c.name,c.city,c.country_code,c.locale,c.tradition,c.website_url,c.status,c.submitted_at
      FROM church_directory_claims c JOIN accounts a ON a.id=c.claimant_user_id
      WHERE c.status='pending' AND a.deleted_at IS NULL AND a.email_verified_at IS NOT NULL
      ORDER BY c.submitted_at,c.id LIMIT 200`).all<ClaimRow>();
    if (!rows.success || !Array.isArray(rows.results)) return json({ error: "churches_unavailable" }, 503);
    const items = [];
    for (const row of rows.results) {
      const base = claimCore(row);
      if (!base || row.status !== "pending" || !validId(row.claimant_user_id) ||
          typeof row.claimant_email !== "string" || row.claimant_email.length < 3 || row.claimant_email.length > 320 ||
          row.claimant_email.trim() !== row.claimant_email || !row.claimant_email.includes("@") ||
          /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\s]/u.test(row.claimant_email))
        return json({ error: "churches_unavailable" }, 503);
      items.push({ ...base, claimantId: row.claimant_user_id, claimantEmail: row.claimant_email, status: row.status });
    }
    return json({ items });
  } catch { return json({ error: "churches_unavailable" }, 503); }
}

export async function POST(request: Request) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  if (!sameOrigin(request)) return json({ error: "cross_origin_request" }, 403);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return json({ error: "invalid_json" }, 400);
  let actor;
  try { actor = await identity(request); }
  catch { return json({ error: "authentication_unavailable" }, 503); }
  if (!actor) return json({ error: "authentication_required" }, 401);
  if (actor.provider === "agent" || !actor.emailVerified) return json({ error: "forbidden" }, 403);

  if (body.action === "submit") {
    const website = body.websiteUrl === "" || body.websiteUrl === null || body.websiteUrl === undefined
      ? null : httpsUrl(body.websiteUrl);
    if (!visible(body.name, 3, 160) || !visible(body.city, 2, 120) ||
        typeof body.countryCode !== "string" || !/^[A-Z]{2}$/.test(body.countryCode) ||
        typeof body.locale !== "string" || !LOCALES.has(body.locale) ||
        typeof body.tradition !== "string" || !TRADITIONS.has(body.tradition) ||
        (body.websiteUrl !== "" && body.websiteUrl !== null && body.websiteUrl !== undefined && !website) ||
        body.representationAttested !== true || body.websiteConsent !== true)
      return json({ error: "invalid_claim" }, 400);
    try {
      const id = crypto.randomUUID();
      const result = await env.DB.prepare(`INSERT INTO church_directory_claims
        (id,claimant_user_id,name,city,country_code,locale,tradition,website_url,representation_attested,website_consent,status)
        SELECT ?,a.id,?,?,?,?,?,?,1,1,'pending' FROM accounts a
        WHERE a.id=? AND a.deleted_at IS NULL AND a.email_verified_at IS NOT NULL
        ON CONFLICT(claimant_user_id) DO UPDATE SET id=excluded.id,name=excluded.name,city=excluded.city,
          country_code=excluded.country_code,locale=excluded.locale,tradition=excluded.tradition,
          website_url=excluded.website_url,representation_attested=1,website_consent=1,status='pending',
          submitted_at=CURRENT_TIMESTAMP,reviewed_at=NULL,reviewed_by=NULL,review_note='',verification_evidence=''`)
        .bind(id, body.name, body.city, body.countryCode, body.locale, body.tradition, website, actor.userId).run();
      const changes = result.meta?.changes;
      if (!result.success || !Number.isSafeInteger(changes) || changes < 0 || changes > 1)
        return json({ error: "claim_failed" }, 503);
      return changes === 1 ? json({ ok: true }, 201) : json({ error: "account_unavailable" }, 409);
    } catch { return json({ error: "claim_failed" }, 503); }
  }

  if (body.action === "withdraw") {
    if (!validId(body.id)) return json({ error: "invalid_claim" }, 400);
    try {
      const result = await env.DB.prepare(`UPDATE church_directory_claims SET status='withdrawn',reviewed_at=NULL,
        reviewed_by=NULL,review_note='',verification_evidence='' WHERE id=? AND claimant_user_id=? AND status IN ('pending','approved')
        AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=? AND a.deleted_at IS NULL AND a.email_verified_at IS NOT NULL)`)
        .bind(body.id, actor.userId, actor.userId).run();
      const changes = result.meta?.changes;
      if (!result.success || !Number.isSafeInteger(changes) || changes < 0 || changes > 1)
        return json({ error: "withdraw_failed" }, 503);
      return changes === 1 ? json({ ok: true }) : json({ error: "not_found_or_closed" }, 409);
    } catch { return json({ error: "withdraw_failed" }, 503); }
  }

  if (body.action === "review") {
    if (!isVerifiedOwner(actor)) return json({ error: "forbidden" }, 403);
    const decision = body.decision === "approve" || body.decision === "reject" ? body.decision : null;
    const rawNote = typeof body.note === "string" ? body.note : "";
    const rawEvidence = typeof body.verificationEvidence === "string" ? body.verificationEvidence : "";
    const note = rawNote.trim(), evidence = rawEvidence.trim();
    if (!validId(body.id) || !decision || rawNote.length > 2000 ||
        (decision === "reject" && note.length < 3) ||
        (decision === "approve" && (evidence.length < 3 || rawEvidence.length > 1000)))
      return json({ error: "invalid_review" }, 400);
    try {
      const result = await env.DB.prepare(`UPDATE church_directory_claims SET status=?,reviewed_at=CURRENT_TIMESTAMP,
        reviewed_by=?,review_note=?,verification_evidence=? WHERE id=? AND status='pending'
        AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=church_directory_claims.claimant_user_id
          AND a.deleted_at IS NULL AND a.email_verified_at IS NOT NULL)`)
        .bind(decision === "approve" ? "approved" : "rejected", actor.userId, note,
          decision === "approve" ? evidence : "", body.id).run();
      const changes = result.meta?.changes;
      if (!result.success || !Number.isSafeInteger(changes) || changes < 0 || changes > 1)
        return json({ error: "review_failed" }, 503);
      return changes === 1 ? json({ ok: true }) : json({ error: "not_found_or_closed" }, 409);
    } catch { return json({ error: "review_failed" }, 503); }
  }
  return json({ error: "unknown_action" }, 400);
}
