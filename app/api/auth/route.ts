import { env } from "cloudflare:workers";
import {
  authenticateRequest,
  clearSessionCookie,
  createSession,
  hashPassword,
  isAuthTestRequest,
  PASSWORD_ITERATIONS,
  randomToken,
  rateLimit,
  requestAddress,
  revokeCurrentSession,
  sameOrigin,
  sha256,
  verifyPassword,
} from "../../../lib/auth";
import { sendSecurityEmail } from "../../../lib/email";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCALES = new Set(["uk", "ru", "en"]);
const GENDERS = new Set(["man", "woman", "prefer_not"]);
const TRADITIONS = new Set(["orthodox", "catholic", "protestant", "other", "prefer_not"]);
const MARITAL = new Set(["married", "single", "separated", "widowed", "prefer_not"]);
type Body = Record<string, unknown>;
type Account = {
  id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  password_iterations: number;
  email_verified_at: string | null;
  session_version: number;
  locale?: string;
};

function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}
function clean(value: unknown, max = 160) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function normalizeEmail(value: unknown) { return clean(value, 254).toLowerCase(); }
function ageRange(age: number) {
  if (age <= 17) return "13-17";
  if (age <= 24) return "18-24";
  if (age <= 34) return "25-34";
  if (age <= 44) return "35-44";
  if (age <= 54) return "45-54";
  if (age <= 64) return "55-64";
  return "65+";
}
function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 12 && value.length <= 128;
}
function locale(value: unknown) { const result = clean(value, 2); return LOCALES.has(result) ? result : "uk"; }
function baseUrl(request: Request) { return (env.APP_BASE_URL || new URL(request.url).origin).replace(/\/$/, ""); }
async function body(request: Request) { return request.json().catch(() => null) as Promise<Body | null>; }
// A returned D1 batch is not a durable success receipt unless every
// statement was acknowledged with a concrete change count.
function batchAcknowledged(receipts: unknown, count: number): receipts is Array<{ success: true; meta: { changes: number } }> {
  return Array.isArray(receipts) && receipts.length === count &&
    receipts.every(receipt => receipt?.success === true && Number.isSafeInteger(receipt?.meta?.changes) && receipt.meta.changes >= 0);
}
async function createOneTimeToken(userId: string, purpose: "verify" | "reset", minutes: number) {
  const token = randomToken();
  const receipts = await env.DB!.batch([
    env.DB!.prepare("UPDATE auth_tokens SET used_at=CURRENT_TIMESTAMP WHERE user_id=? AND purpose=? AND used_at IS NULL").bind(userId, purpose),
    env.DB!.prepare("INSERT INTO auth_tokens (token_hash,user_id,purpose,expires_at) VALUES (?,?,?,datetime('now',?))")
      .bind(await sha256(token), userId, purpose, `+${minutes} minutes`),
  ]);
  if (!batchAcknowledged(receipts, 2) || receipts[1].meta.changes !== 1) throw Error('token_save_unconfirmed');
  return token;
}

async function tokenCheckTime() {
  // Use one database timestamp across all transaction statements, including
  // when execution crosses the token's expiration second.
  const row = await env.DB!.prepare("SELECT CURRENT_TIMESTAMP AS checked_at").bind().first<{ checked_at: string }>();
  if (!row?.checked_at) throw Error("database_time_unavailable");
  return row.checked_at;
}

export async function GET(request: Request) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  const url = new URL(request.url), action = url.searchParams.get("action");
  if (action !== "verify") return json({ error: "unknown_action" }, 400);
  const token = clean(url.searchParams.get("token"), 200);
  if (!token) return json({ error: "invalid_token" }, 400);
  try {
  const tokenHash = await sha256(token);
  const checkedAt = await tokenCheckTime();
  // The account update and token consumption share one D1 transaction. A
  // failed second statement must not strand an unverified account with a used token.
  const result = await env.DB.batch([
    env.DB.prepare(`UPDATE accounts SET email_verified_at=COALESCE(email_verified_at,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP
      WHERE deleted_at IS NULL AND id=(SELECT user_id FROM auth_tokens WHERE token_hash=? AND purpose='verify' AND used_at IS NULL AND expires_at>?)`).bind(tokenHash, checkedAt),
    env.DB.prepare(`UPDATE auth_tokens SET used_at=CURRENT_TIMESTAMP WHERE token_hash=? AND purpose='verify' AND used_at IS NULL AND expires_at>?
      AND user_id IN (SELECT id FROM accounts WHERE deleted_at IS NULL)`).bind(tokenHash, checkedAt),
  ]);
  if (!batchAcknowledged(result, 2)) return json({ error: "verification_unavailable" }, 503);
  if (result[0].meta.changes !== 1 || result[1].meta.changes !== 1)
    return json({ error: "invalid_or_expired_token" }, 400);
  return Response.redirect(`${baseUrl(request)}/account?verified=1`, 303);
  } catch {
    // Infrastructure failure must not become an unhandled 500 or a false
    // invalid-token verdict. The D1 batch is atomic; a retry is safe.
    return json({ error: "verification_unavailable" }, 503);
  }
}

export async function POST(request: Request) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  if (!sameOrigin(request)) return json({ error: "cross_origin_request" }, 403);
  const action = new URL(request.url).searchParams.get("action") || "";
  const data = await body(request);
  if (!data) return json({ error: "invalid_json" }, 400);
  const address = requestAddress(request);

  if (action === "register") {
    const email = normalizeEmail(data.email), password = data.password;
    const firstName = clean(data.firstName, 80), lastName = clean(data.lastName, 80);
    const age = Number(data.age), gender = clean(data.gender, 30), tradition = clean(data.tradition, 40);
    const maritalStatus = clean(data.maritalStatus, 40), denomination = clean(data.denomination, 160);
    const church = clean(data.church, 160), selectedLocale = locale(data.locale);
    const hasChildren = data.hasChildren === true ? 1 : data.hasChildren === false ? 0 : null;
    const sensitiveConsent = data.acceptSensitive === true;
    if (!await rateLimit(`register:${address}`, 5, 3600)) return json({ error: "too_many_requests" }, 429);
    if (!EMAIL.test(email) || !validPassword(password) || !firstName || !lastName || !Number.isInteger(age) || age < 13 || age > 120 || !GENDERS.has(gender) || (tradition && !TRADITIONS.has(tradition)) || !MARITAL.has(maritalStatus) || data.acceptPrivacy !== true)
      return json({ error: "invalid_registration" }, 400);
    if (!sensitiveConsent && ((tradition && tradition !== "prefer_not") || denomination || church))
      return json({ error: "sensitive_consent_required" }, 400);
    const duplicate = await env.DB.prepare("SELECT id FROM accounts WHERE email=? AND deleted_at IS NULL").bind(email).first();
    if (duplicate) return json({ error: "email_in_use" }, 409);
    const id = crypto.randomUUID(), passwordData = await hashPassword(password);
    try {
      const registrationReceipts = await env.DB.batch([
        env.DB.prepare("INSERT INTO accounts (id,email,password_hash,password_salt,password_iterations,first_name,last_name) VALUES (?,?,?,?,?,?,?)")
          .bind(id, email, passwordData.hash, passwordData.salt, passwordData.iterations, firstName, lastName),
        env.DB.prepare(`INSERT INTO profiles
          (user_id,email,first_name,last_name,age_range,age,tradition,denomination,church,marital_status,gender,has_children,locale,sensitive_consent,sensitive_consent_version,privacy_accepted_at,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`)
          .bind(id, email, firstName, lastName, ageRange(age), age, sensitiveConsent && tradition !== "prefer_not" ? tradition || null : null, sensitiveConsent ? denomination || null : null, sensitiveConsent ? church || null : null, maritalStatus, gender, hasChildren, selectedLocale, sensitiveConsent ? 1 : 0, sensitiveConsent ? 1 : 0),
      ]);
      // Do not send a verification token for an account/profile transaction
      // unless both inserted rows have reliable individual D1 receipts.
      if (!batchAcknowledged(registrationReceipts, 2) ||
          registrationReceipts[0].meta.changes !== 1 || registrationReceipts[1].meta.changes !== 1)
        return json({ error: "registration_save_unconfirmed" }, 503);
    } catch {
      // A transient database outage is not evidence that the email is taken.
      return json({ error: "registration_unavailable" }, 503);
    }
    // Account/profile may be durable even if the second token transaction is
    // unavailable. Do not send a link or claim successful registration then.
    let token: string;
    try { token = await createOneTimeToken(id, "verify", 24 * 60); }
    catch { return json({ error: "verification_unavailable" }, 503); }
    const delivery = await sendSecurityEmail(email, selectedLocale, "verify", `${baseUrl(request)}/api/auth?action=verify&token=${encodeURIComponent(token)}`);
    return json({ ok: true, verificationRequired: true, emailDelivered: delivery.delivered, ...(isAuthTestRequest(request) ? { testToken: token } : {}) }, 201);
  }

  if (action === "login") {
    const email = normalizeEmail(data.email), password = data.password;
    if (!await rateLimit(`login:${address}:${email}`, 10, 900)) return json({ error: "too_many_requests" }, 429);
    if (!EMAIL.test(email) || typeof password !== "string") return json({ error: "invalid_credentials" }, 401);
    const account = await env.DB.prepare("SELECT * FROM accounts WHERE email=? AND deleted_at IS NULL").bind(email).first<Account>();
    const passwordOk = account
      ? await verifyPassword(password, account.password_hash, account.password_salt, account.password_iterations)
      : (await hashPassword(password, "AAAAAAAAAAAAAAAAAAAAAA", PASSWORD_ITERATIONS), false);
    if (!account || !passwordOk) return json({ error: "invalid_credentials" }, 401);
    if (!account.email_verified_at) return json({ error: "email_not_verified" }, 403);
    const session = await createSession(request, account.id, account.session_version);
    return json({ ok: true }, 200, { "Set-Cookie": session.cookie });
  }

  if (action === "logout") {
    await revokeCurrentSession(request);
    return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie(request) });
  }

  if (action === "resend-verification") {
    const email = normalizeEmail(data.email);
    if (!await rateLimit(`verify:${address}:${email}`, 3, 3600)) return json({ error: "too_many_requests" }, 429);
    try {
    const account = await env.DB.prepare("SELECT a.id,a.email,a.email_verified_at,p.locale FROM accounts a LEFT JOIN profiles p ON p.user_id=a.id WHERE a.email=? AND a.deleted_at IS NULL").bind(email).first<Account>();
    if (account && !account.email_verified_at) {
      const token = await createOneTimeToken(account.id, "verify", 24 * 60);
      await sendSecurityEmail(account.email, account.locale || "uk", "verify", `${baseUrl(request)}/api/auth?action=verify&token=${encodeURIComponent(token)}`);
    }
    return json({ ok: true });
    } catch {
      // Do not leak infrastructure exceptions or claim an email was queued.
      return json({ error: "verification_unavailable" }, 503);
    }
  }

  if (action === "forgot-password") {
    const email = normalizeEmail(data.email);
    if (!await rateLimit(`forgot:${address}:${email}`, 3, 3600)) return json({ error: "too_many_requests" }, 429);
    try {
    const account = await env.DB.prepare("SELECT a.id,a.email,a.email_verified_at,p.locale FROM accounts a LEFT JOIN profiles p ON p.user_id=a.id WHERE a.email=? AND a.deleted_at IS NULL").bind(email).first<Account>();
    let testToken: string | undefined;
    if (account?.email_verified_at) {
      const token = await createOneTimeToken(account.id, "reset", 30);
      if (isAuthTestRequest(request)) testToken = token;
      await sendSecurityEmail(account.email, account.locale || "uk", "reset", `${baseUrl(request)}/account?reset=${encodeURIComponent(token)}`);
    }
    return json({ ok: true, ...(testToken ? { testToken } : {}) });
    } catch {
      // Database/token generation failed: this is not evidence of no account.
      return json({ error: "password_reset_unavailable" }, 503);
    }
  }

  if (action === "reset-password") {
    const token = clean(data.token, 200), password = data.password;
    if (!token || !validPassword(password)) return json({ error: "invalid_reset" }, 400);
    if (!await rateLimit(`reset:${address}`, 8, 900)) return json({ error: "too_many_requests" }, 429);
    try {
    const tokenHash = await sha256(token);
    const record = await env.DB.prepare("SELECT token_hash,user_id FROM auth_tokens WHERE token_hash=? AND purpose='reset' AND used_at IS NULL AND expires_at>CURRENT_TIMESTAMP").bind(tokenHash).first<{ token_hash: string; user_id: string }>();
    if (!record) return json({ error: "invalid_or_expired_token" }, 400);
    const passwordData = await hashPassword(password);
    const checkedAt = await tokenCheckTime();
    const result = await env.DB.batch([
      env.DB.prepare(`UPDATE accounts SET password_hash=?,password_salt=?,password_iterations=?,session_version=session_version+1,updated_at=CURRENT_TIMESTAMP
        WHERE id=? AND deleted_at IS NULL AND EXISTS (SELECT 1 FROM auth_tokens WHERE token_hash=? AND user_id=accounts.id AND purpose='reset' AND used_at IS NULL AND expires_at>?)`)
        .bind(passwordData.hash, passwordData.salt, passwordData.iterations, record.user_id, tokenHash, checkedAt),
      env.DB.prepare(`UPDATE auth_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE user_id=? AND revoked_at IS NULL
        AND EXISTS (SELECT 1 FROM auth_tokens t JOIN accounts a ON a.id=t.user_id WHERE t.token_hash=? AND t.user_id=? AND t.purpose='reset' AND t.used_at IS NULL AND t.expires_at>? AND a.deleted_at IS NULL)`)
        .bind(record.user_id, tokenHash, record.user_id, checkedAt),
      env.DB.prepare(`UPDATE auth_tokens SET used_at=CURRENT_TIMESTAMP WHERE token_hash=? AND user_id=? AND purpose='reset' AND used_at IS NULL AND expires_at>?
        AND user_id IN (SELECT id FROM accounts WHERE deleted_at IS NULL)`).bind(tokenHash, record.user_id, checkedAt),
    ]);
    if (!batchAcknowledged(result, 3)) return json({ error: "password_reset_unavailable" }, 503);
    if (result[0].meta.changes !== 1 || result[2].meta.changes !== 1)
      return json({ error: "invalid_or_expired_token" }, 400);
    return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie(request) });
    } catch {
      // Transient D1/clock/crypto failure is not an invalid reset token.
      // Never acknowledge a partially applied password/session change.
      return json({ error: "password_reset_unavailable" }, 503);
    }
  }

  if (action === "change-password") {
    const identity = await authenticateRequest(request);
    if (!identity || identity.provider !== "password") return json({ error: "authentication_required" }, 401);
    const currentPassword = data.currentPassword, newPassword = data.newPassword;
    if (typeof currentPassword !== "string" || !validPassword(newPassword)) return json({ error: "invalid_password_change" }, 400);
    if (!await rateLimit(`password-change:${identity.userId}:${address}`, 5, 3600)) return json({ error: "too_many_requests" }, 429);
    const account = await env.DB.prepare("SELECT * FROM accounts WHERE id=? AND deleted_at IS NULL").bind(identity.userId).first<Account>();
    if (!account || !await verifyPassword(currentPassword, account.password_hash, account.password_salt, account.password_iterations))
      return json({ error: "invalid_credentials" }, 401);
    const passwordData = await hashPassword(newPassword);
    const receipts = await env.DB.batch([
      env.DB.prepare("UPDATE accounts SET password_hash=?,password_salt=?,password_iterations=?,session_version=session_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?")
        .bind(passwordData.hash, passwordData.salt, passwordData.iterations, identity.userId),
      env.DB.prepare("UPDATE auth_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE user_id=? AND revoked_at IS NULL").bind(identity.userId),
    ]);
    if (!batchAcknowledged(receipts, 2) || receipts[0].meta.changes !== 1)
      return json({ error: "password_change_unavailable" }, 503);
    return json({ ok: true, signedOut: true }, 200, { "Set-Cookie": clearSessionCookie(request) });
  }

  if (action === "delete-account") {
    const identity = await authenticateRequest(request);
    if (!identity || identity.provider !== "password") return json({ error: "authentication_required" }, 401);
    const password = data.password;
    const account = await env.DB.prepare("SELECT * FROM accounts WHERE id=? AND deleted_at IS NULL").bind(identity.userId).first<Account>();
    if (!account || typeof password !== "string" || !await verifyPassword(password, account.password_hash, account.password_salt, account.password_iterations))
      return json({ error: "invalid_credentials" }, 401);
    try {
    const receipts = await env.DB.batch([
      env.DB.prepare("DELETE FROM progress WHERE user_id=?").bind(identity.userId),
      env.DB.prepare("DELETE FROM reader_bookmarks WHERE user_id=?").bind(identity.userId),
      env.DB.prepare("DELETE FROM mission_attempt_answers WHERE attempt_id IN (SELECT id FROM mission_attempts WHERE actor_id=?)").bind(identity.userId),
      env.DB.prepare("DELETE FROM mission_attempts WHERE actor_id=?").bind(identity.userId),
      env.DB.prepare("DELETE FROM chapter_read_receipts WHERE actor_id=?").bind(identity.userId),
      env.DB.prepare("DELETE FROM support_attachments WHERE request_id IN (SELECT id FROM support_requests WHERE user_id=?)").bind(identity.userId),
      env.DB.prepare("DELETE FROM support_requests WHERE user_id=?").bind(identity.userId),
      env.DB.prepare("DELETE FROM auth_tokens WHERE user_id=?").bind(identity.userId),
      env.DB.prepare("DELETE FROM editorial_roles WHERE user_id=? OR granted_by=?").bind(identity.userId, identity.userId),
      env.DB.prepare("DELETE FROM editorial_role_events WHERE subject_user_id=? OR actor_user_id=?").bind(identity.userId, identity.userId),
      // Preserve other members' numeric meeting history, but erase the departing
      // facilitator's stable identifier and free-text contribution in shared groups.
      // Owned groups are deleted below and cascade their sessions.
      env.DB.prepare("UPDATE group_sessions SET created_by='deleted-account',reflection=NULL WHERE created_by=?").bind(identity.userId),
      env.DB.prepare("DELETE FROM home_group_members WHERE user_id=?").bind(identity.userId),
      env.DB.prepare("DELETE FROM study_materials WHERE owner_user_id=?").bind(identity.userId),
      env.DB.prepare("DELETE FROM home_groups WHERE owner_user_id=?").bind(identity.userId),
      env.DB.prepare("DELETE FROM profiles WHERE user_id=?").bind(identity.userId),
      env.DB.prepare("UPDATE usage_sessions SET user_id=NULL WHERE user_id=?").bind(identity.userId),
      env.DB.prepare("UPDATE usage_events SET user_id=NULL WHERE user_id=?").bind(identity.userId),
      env.DB.prepare("UPDATE accounts SET email=?,first_name='',last_name='',deleted_at=CURRENT_TIMESTAMP,session_version=session_version+1,password_hash='',password_salt='' WHERE id=?")
        .bind(`deleted-${identity.userId}@invalid.local`, identity.userId),
      env.DB.prepare("DELETE FROM auth_sessions WHERE user_id=?").bind(identity.userId),
    ]);
    // All 19 statements, including shared-record redaction and final account
    // update, must be acknowledged. Empty unrelated DELETEs may change 0 rows.
    if (!batchAcknowledged(receipts, 19) || receipts[17].meta.changes !== 1)
      throw Error("deletion_batch_unconfirmed");
    } catch {
      // D1 batch rejects atomically; do not pretend the account was erased.
      return json({ error: "deletion_failed" }, 503);
    }
    return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie(request) });
  }

  return json({ error: "unknown_action" }, 400);
}
