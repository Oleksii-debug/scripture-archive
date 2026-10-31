import { env } from "cloudflare:workers";

export type Identity = {
  userId: string;
  email: string;
  fullName: string | null;
  emailVerified: boolean;
  provider: "password" | "chatgpt" | "agent";
};

// One verified owner predicate for private reports and privileged mutations.
// Matching an unverified email address is not sufficient authorization.
export const OWNER_EMAIL = "dordiaioleksii1@gmail.com";
export function isVerifiedOwner(identity: Identity | null | undefined): identity is Identity {
  return Boolean(identity && identity.provider !== "agent" && identity.emailVerified &&
    identity.email.toLowerCase() === OWNER_EMAIL);
}

const encoder = new TextEncoder();
export const SESSION_COOKIE = "sa_session";
export const GUEST_COOKIE = "sa_guest";
export const PASSWORD_ITERATIONS = 310_000;

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

export function randomToken(size = 32) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export async function sha256(value: string) {
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

export async function hashPassword(password: string, encodedSalt = randomToken(16), iterations = PASSWORD_ITERATIONS) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: base64UrlToBytes(encodedSalt), iterations },
    key,
    256,
  );
  return { hash: bytesToBase64Url(new Uint8Array(bits)), salt: encodedSalt, iterations };
}

export async function verifyPassword(password: string, expectedHash: string, salt: string, iterations: number) {
  const actual = (await hashPassword(password, salt, iterations)).hash;
  if (actual.length !== expectedHash.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1)
    difference |= actual.charCodeAt(index) ^ expectedHash.charCodeAt(index);
  return difference === 0;
}

// Cookies can legitimately share a name when browsers send different Path
// scopes. Never let the last of two session/agent values silently win: the
// server cannot identify which identity the browser intended. Track repeated
// names even when a value is malformed, so a corrupt first cookie cannot be
// replaced by a valid-looking second value.
function readCookies(request: Request) {
  const cookies = new Map<string, string>();
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const raw of (request.headers.get("cookie") || "").split(";")) {
    const pair = raw.trim();
    const separator = pair.indexOf("=");
    if (separator <= 0) continue;
    const name = pair.slice(0, separator);
    if (seen.has(name)) {
      repeated.add(name);
      cookies.delete(name);
      continue;
    }
    seen.add(name);
    try { cookies.set(name, decodeURIComponent(pair.slice(separator + 1))); }
    catch { /* Malformed percent-encoding is never an authenticated cookie. */ }
  }
  return { cookies, repeated };
}

export function parseCookies(request: Request) {
  return readCookies(request).cookies;
}

export function sessionCookie(request: Request, token: string, maxAge = 60 * 60 * 24 * 30) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearSessionCookie(request: Request) {
  return sessionCookie(request, "", 0);
}

export function guestCookie(request: Request, token: string) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${GUEST_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${secure}`;
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return false;
  const site = request.headers.get("sec-fetch-site");
  // A sibling subdomain is same-site but NOT same-origin. SameSite cookies
  // are sent there, so accepting this browser signal permits CSRF from a
  // compromised sibling origin if the Origin header is absent.
  return !site || site === "same-origin" || site === "none";
}

export function isAuthTestRequest(request: Request) {
  return env.AUTH_TEST_MODE === "1" && ["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname);
}

export async function authenticateRequest(request: Request): Promise<Identity | null> {
  const headerUserId = request.headers.get("oai-authenticated-user-id");
  const headerEmail = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  // Enable only behind a gateway that strips client-supplied identity headers.
  if (env.TRUST_PLATFORM_AUTH === "1" && headerUserId && headerEmail) {
    const encoded = request.headers.get("oai-authenticated-user-full-name");
    let fullName: string | null = null;
    if (encoded && request.headers.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8") {
      try { fullName = decodeURIComponent(encoded); } catch {}
    }
    return { userId: headerUserId, email: headerEmail, fullName, emailVerified: true, provider: "chatgpt" };
  }

  const cookies = parseCookies(request), url = new URL(request.url);
  const agentToken = cookies.get("sa_agent");
  const agentRoute = url.pathname === "/api/attempts" ||
    (url.pathname === "/api/account" && ["me","reading","progress"].includes(url.searchParams.get("action") || "me")) ||
    (url.pathname === "/api/community" && request.method === "POST");
  if (agentToken && env.DB && agentRoute) {
    const row = await env.DB.prepare(`SELECT m.id,m.first_name,m.last_name,s.token_hash
      FROM community_agent_sessions s JOIN community_members m ON m.id=s.member_id JOIN community_runs r ON r.id=m.run_id
      WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP AND r.status='running' AND s.control_version=r.control_version`)
      .bind(await sha256(agentToken)).first<{id:string;first_name:string;last_name:string;token_hash:string}>();
    if (row) {
      const activity = url.pathname === "/api/attempts" ? "mission" : url.searchParams.get("action") === "reading" ? "reading" : "exploring";
      await env.DB.prepare("UPDATE community_agent_sessions SET last_seen_at=CURRENT_TIMESTAMP,activity=? WHERE token_hash=?")
        .bind(activity,row.token_hash).run();
      return {userId:row.id,email:"",fullName:`${row.first_name} ${row.last_name}`,emailVerified:true,provider:"agent"};
    }
  }

  const token = cookies.get(SESSION_COOKIE);
  if (!token || !env.DB) return null;
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(
    `SELECT a.id,a.email,a.email_verified_at,a.first_name,a.last_name
       FROM auth_sessions s JOIN accounts a ON a.id=s.user_id
      WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP
        AND s.session_version=a.session_version AND a.deleted_at IS NULL`,
  ).bind(tokenHash).first<Record<string, unknown>>();
  if (!row) return null;
  const first = String(row.first_name || "").trim(), last = String(row.last_name || "").trim();
  return {
    userId: String(row.id),
    email: String(row.email),
    fullName: `${first} ${last}`.trim() || null,
    emailVerified: Boolean(row.email_verified_at),
    provider: "password",
  };
}

export async function createSession(request: Request, userId: string, version: number) {
  if (!env.DB) throw new Error("database_unavailable");
  const token = randomToken();
  const tokenHash = await sha256(token);
  const userAgentHash = await sha256(request.headers.get("user-agent") || "unknown");
  // The login password may have been verified before a concurrent reset,
  // password change or account deletion. A version-blind VALUES insert can
  // acknowledge a cookie for a session that cannot authenticate. Use one
  // atomic INSERT...SELECT against the verified account version instead.
  const receipt=await env.DB.prepare(
    "INSERT INTO auth_sessions (token_hash,user_id,session_version,user_agent_hash,created_at,expires_at) SELECT ?,a.id,a.session_version,?,CURRENT_TIMESTAMP,datetime('now','+30 days') FROM accounts a WHERE a.id=? AND a.session_version=? AND a.deleted_at IS NULL AND a.email_verified_at IS NOT NULL",
  ).bind(tokenHash, userAgentHash, userId, version).run();
  // Never issue a usable-looking cookie for a session without a confirmed insert.
  if(receipt?.success!==true || typeof receipt.meta?.changes!=="number" || receipt.meta.changes!==1)
    throw new Error("session_create_unavailable");
  return { token, cookie: sessionCookie(request, token) };
}

export async function revokeCurrentSession(request: Request) {
  const { cookies, repeated } = readCookies(request);
  // Refuse an ambiguous logout rather than claiming a revocation that could
  // leave one still-live scoped cookie behind.
  if (repeated.has(SESSION_COOKIE)) throw new Error("ambiguous_session_cookie");
  const token = cookies.get(SESSION_COOKIE);
  if (!token) return;
  if (!env.DB) throw new Error("session_revoke_unavailable");
  const receipt=await env.DB.prepare("UPDATE auth_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE token_hash=?").bind(await sha256(token)).run();
  // A confirmed zero-row update is idempotent: this token has no session.
  const changes=receipt?.meta?.changes;
  if(receipt?.success!==true || typeof changes!=="number" || !Number.isSafeInteger(changes) || changes<0 || changes>1)
    throw new Error("session_revoke_unavailable");
}

export async function rateLimit(key: string, limit: number, seconds: number) {
  if (!env.DB) throw new Error("database_unavailable");
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const storedKey = await sha256(`${key}:${bucket}`);
  // An unresolved or rejected D1 write must not allow a request through.
  // The INSERT/UPSERT always changes exactly one counter row on success.
  const receipt = await env.DB.prepare(
    "INSERT INTO auth_rate_limits (key,window_start,count) VALUES (?,CURRENT_TIMESTAMP,1) ON CONFLICT(key) DO UPDATE SET count=count+1",
  ).bind(storedKey).run();
  if (receipt?.success !== true || !Number.isSafeInteger(receipt.meta?.changes) || receipt.meta.changes !== 1)
    throw new Error("rate_limit_write_unavailable");
  const row = await env.DB.prepare("SELECT count FROM auth_rate_limits WHERE key=?").bind(storedKey).first<{ count: number }>();
  // Missing/malformed counter evidence is not a count of zero. Fail closed;
  // callers already distinguish an unavailable limiter from a real 429 quota.
  if (!row || typeof row.count !== "number" || !Number.isSafeInteger(row.count) || row.count < 1)
    throw new Error("rate_limit_read_unavailable");
  return row.count <= limit;
}

export function requestAddress(request: Request) {
  // Only Cloudflare's edge-provided connecting address is an acceptable
  // throttling identity. X-Forwarded-For is client-controlled at untrusted
  // proxy boundaries: using it lets callers rotate login/reset rate buckets.
  // When the trusted edge address is absent, share a bounded fallback bucket
  // instead of treating an arbitrary caller header as proof of origin.
  const edgeAddress = request.headers.get("cf-connecting-ip");
  if (!edgeAddress || edgeAddress.length > 45 || edgeAddress.trim() !== edgeAddress) return "unknown";
  if (/^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(edgeAddress)) {
    return edgeAddress.split(".").every(octet => Number(octet) <= 255) ? edgeAddress : "unknown";
  }
  // The URL parser validates IPv6 syntax, including IPv4-mapped forms, and
  // normalizes equivalent spellings into the same rate-limit bucket.
  if (edgeAddress.includes(":") && /^[0-9a-fA-F:.]+$/.test(edgeAddress)) {
    try { return new URL(`https://[${edgeAddress}]/`).hostname.slice(1, -1); }
    catch { /* Refuse invalid edge IP metadata. */ }
  }
  return "unknown";
}
