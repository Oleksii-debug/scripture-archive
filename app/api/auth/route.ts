import { env } from "cloudflare:workers";
import {
  authenticateRequest,
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
// Never truncate an identity. Truncating an overlength address into a valid
// stored prefix could authenticate, recover or send mail for a different input.
function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return "";
  const normalized = value.trim().toLowerCase();
  return normalized.length <= 254 ? normalized : "";
}
// Registration age is a profile/privacy boundary. Accept JSON integers and
// ordinary decimal HTML form values, never JavaScript-coercible arrays,
// hex, exponents, whitespace or fractional values.
function registrationAge(value: unknown): number | null {
  if (typeof value !== "number" && (typeof value !== "string" || !/^[1-9][0-9]{0,2}$/.test(value))) return null;
  const age = Number(value);
  return Number.isSafeInteger(age) && age >= 13 && age <= 120 ? age : null;
}
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
function registrationTextExceedsLimit(data: Body): boolean {
  // Profile edits already reject overlength text. Registration must not turn
  // an 81-character identity into somebody else's 80-character stored name
  // or silently lose user-authored sensitive details before a D1 mutation.
  const fields: Array<[unknown, number]> = [
    [data.firstName, 80], [data.lastName, 80],
    [data.denomination, 160], [data.church, 160],
  ];
  return fields.some(([value, max]) =>
    // Optional details may be omitted/null, but JSON arrays, objects, booleans
    // and numbers must not be silently replaced by empty user-authored text.
    (value != null && typeof value !== "string") ||
    (typeof value === "string" && value.trim().length > max));
}
function locale(value: unknown): string | null {
  // Historical missing/null or unsupported textual language choices fall
  // back to Ukrainian, but a wrong JSON type must not be disguised as one.
  if (value === undefined || value === null || value === "") return "uk";
  if (typeof value !== "string") return null;
  // Never truncate "en-US"/"ru-RU"/"ukX" into a different exact edition.
  const result = value.trim();
  return LOCALES.has(result) ? result : "uk";
}
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
    const age = registrationAge(data.age), gender = clean(data.gender, 30), tradition = clean(data.tradition, 40);
    const maritalStatus = clean(data.maritalStatus, 40), denomination = clean(data.denomination, 160);
    const church = clean(data.church, 160), selectedLocale = locale(data.locale);
    const hasChildren = data.hasChildren === true ? 1 : data.hasChildren === false ? 0 : null;
    const sensitiveConsent = data.acceptSensitive === true;
    let registrationAllowed: boolean;
    try { registrationAllowed = await rateLimit(`register:${address}`, 5, 3600); }
    catch { return json({ error: "registration_unavailable" }, 503); }
    if (!registrationAllowed) return json({ error: "too_many_requests" }, 429);
    if (registrationTextExceedsLimit(data) || selectedLocale === null) return json({ error: "invalid_registration" }, 400);
    if (!EMAIL.test(email) || !validPassword(password) || !firstName || !lastName || age === null || !GENDERS.has(gender) || (tradition && !TRADITIONS.has(tradition)) || !MARITAL.has(maritalStatus) || data.acceptPrivacy !== true)
      return json({ error: "invalid_registration" }, 400);
    if (!sensitiveConsent && ((tradition && tradition !== "prefer_not") || denomination || church))
      return json({ error: "sensitive_consent_required" }, 400);
    let duplicate: unknown;
    try { duplicate = await env.DB.prepare("SELECT id FROM accounts WHERE email=? AND deleted_at IS NULL").bind(email).first(); }
    catch { return json({ error: "registration_unavailable" }, 503); }
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
    try {
    if (!await rateLimit(`login:${address}:${email}`, 10, 900)) return json({ error: "too_many_requests" }, 429);
    // Existing registration/change/reset boundaries cap password length at 128.
    // Refuse larger login strings before account reads or expensive PBKDF2:
    // an unknown-email path deliberately computes a dummy password hash.
    if (!EMAIL.test(email) || typeof password !== "string" || password.length > 128)
      return json({ error: "invalid_credentials" }, 401);
    const account = await env.DB.prepare("SELECT * FROM accounts WHERE email=? AND deleted_at IS NULL").bind(email).first<Account>();
    const passwordOk = account
      ? await verifyPassword(password, account.password_hash, account.password_salt, account.password_iterations)
      : (await hashPassword(password, "AAAAAAAAAAAAAAAAAAAAAA", PASSWORD_ITERATIONS), false);
    if (!account || !passwordOk) return json({ error: "invalid_credentials" }, 401);
    if (!account.email_verified_at) return json({ error: "email_not_verified" }, 403);
    const session = await createSession(request, account.id, account.session_version);
    return json({ ok: true }, 200, { "Set-Cookie": session.cookie });
    } catch {
      // Authentication-store/session outages are not proof of a wrong password.
      // A signed-in session must only be acknowledged after session persistence.
      return json({ error: "authentication_unavailable" }, 503);
    }
  }

  // Do not clear the shared HttpOnly session cookie in an asynchronous old-
  // session response. A new login may have already set a newer cookie in this
  // browser; the late old response would otherwise erase that new session.
  // Security is enforced by durable D1 session revocation/version invalidation,
  // not by the browser's receipt order of Set-Cookie headers.
  if (action === "logout") {
    try { await revokeCurrentSession(request); }
    catch { return json({ error: "logout_unavailable" }, 503); }
    return json({ ok: true });
  }

  if (action === "resend-verification") {
    const email = normalizeEmail(data.email);
    let verificationAllowed: boolean;
    try { verificationAllowed = await rateLimit(`verify:${address}:${email}`, 3, 3600); }
    catch { return json({ error: "verification_unavailable" }, 503); }
    if (!verificationAllowed) return json({ error: "too_many_requests" }, 429);
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
    let recoveryAllowed: boolean;
    try { recoveryAllowed = await rateLimit(`forgot:${address}:${email}`, 3, 3600); }
    catch { return json({ error: "password_reset_unavailable" }, 503); }
    if (!recoveryAllowed) return json({ error: "too_many_requests" }, 429);
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
    let resetAllowed: boolean;
    try { resetAllowed = await rateLimit(`reset:${address}`, 8, 900); }
    catch { return json({ error: "password_reset_unavailable" }, 503); }
    if (!resetAllowed) return json({ error: "too_many_requests" }, 429);
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
    return json({ ok: true });
    } catch {
      // Transient D1/clock/crypto failure is not an invalid reset token.
      // Never acknowledge a partially applied password/session change.
      return json({ error: "password_reset_unavailable" }, 503);
    }
  }

  if (action === "change-password") {
    try {
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
      // Password reset or another password change may complete while hashing.
      // Compare against the credential snapshot that was actually verified.
      env.DB.prepare("UPDATE accounts SET password_hash=?,password_salt=?,password_iterations=?,session_version=session_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL AND session_version=? AND password_hash=? AND password_salt=? AND password_iterations=?")
        .bind(passwordData.hash, passwordData.salt, passwordData.iterations, identity.userId,
          account.session_version, account.password_hash, account.password_salt, account.password_iterations),
      // The D1 batch is atomic; revoke only if the preceding credential CAS won.
      env.DB.prepare("UPDATE auth_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE user_id=? AND revoked_at IS NULL AND changes()=1").bind(identity.userId),
    ]);
    if (!batchAcknowledged(receipts, 2) || receipts[0].meta.changes !== 1)
      return json({ error: "password_change_unavailable" }, 503);
    return json({ ok: true, signedOut: true });
    } catch {
      // Auth/session, throttling, password verification or D1 failures are
      // infrastructure errors, not incorrect credentials or a signed-out ACK.
      // D1.batch remains atomic; do not mutate the shared session cookie.
      return json({ error: "password_change_unavailable" }, 503);
    }
  }

  if (action === "delete-account") {
    try {
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
      env.DB.prepare("DELETE FROM material_takedowns WHERE actor_user_id=?").bind(identity.userId),
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
    // All 20 statements, including shared-record redaction and final account
    // update, must be acknowledged. Empty unrelated DELETEs may change 0 rows.
    if (!batchAcknowledged(receipts, 20) || receipts[18].meta.changes !== 1)
      throw Error("deletion_batch_unconfirmed");
    } catch {
      // D1 batch rejects atomically; do not pretend the account was erased.
      return json({ error: "deletion_failed" }, 503);
    }
    return json({ ok: true });
    } catch {
      // Initial identity/credential checks may also fail because D1 is down.
      // Never present an uncertain account state as invalid credentials or
      // send a session-cookie change when the destructive action is unknown.
      return json({ error: "deletion_failed" }, 503);
    }
  }

  return json({ error: "unknown_action" }, 400);
}
