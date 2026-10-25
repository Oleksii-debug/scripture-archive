import { env } from "cloudflare:workers";

export type Identity = {
  userId: string;
  email: string;
  fullName: string | null;
  emailVerified: boolean;
  provider: "password" | "chatgpt";
};

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

export function parseCookies(request: Request) {
  return new Map(
    (request.headers.get("cookie") || "")
      .split(";")
      .map(part => part.trim().split("="))
      .filter(parts => parts.length >= 2)
      .flatMap(([key, ...rest]) => {
        try { return [[key, decodeURIComponent(rest.join("="))] as const]; }
        catch { return []; }
      }),
  );
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
  return !site || site === "same-origin" || site === "same-site" || site === "none";
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

  const token = parseCookies(request).get(SESSION_COOKIE);
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
  await env.DB.prepare(
    "INSERT INTO auth_sessions (token_hash,user_id,session_version,user_agent_hash,created_at,expires_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP,datetime('now','+30 days'))",
  ).bind(tokenHash, userId, version, userAgentHash).run();
  return { token, cookie: sessionCookie(request, token) };
}

export async function revokeCurrentSession(request: Request) {
  const token = parseCookies(request).get(SESSION_COOKIE);
  if (token && env.DB)
    await env.DB.prepare("UPDATE auth_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE token_hash=?").bind(await sha256(token)).run();
}

export async function rateLimit(key: string, limit: number, seconds: number) {
  if (!env.DB) throw new Error("database_unavailable");
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const storedKey = await sha256(`${key}:${bucket}`);
  await env.DB.prepare(
    "INSERT INTO auth_rate_limits (key,window_start,count) VALUES (?,CURRENT_TIMESTAMP,1) ON CONFLICT(key) DO UPDATE SET count=count+1",
  ).bind(storedKey).run();
  const row = await env.DB.prepare("SELECT count FROM auth_rate_limits WHERE key=?").bind(storedKey).first<{ count: number }>();
  return Number(row?.count || 0) <= limit;
}

export function requestAddress(request: Request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
