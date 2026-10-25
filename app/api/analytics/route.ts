import { env } from "cloudflare:workers";
import { authenticateRequest, rateLimit, requestAddress, sameOrigin } from "../../../lib/auth";
import { ownerCommunityState } from "../community/route";

export const dynamic = "force-dynamic";

const OWNER_EMAIL = "dordiaioleksii1@gmail.com";
const EVENTS = new Set(["page_view", "sign_up", "sign_up_error", "login", "login_error", "quiz_start", "quiz_complete", "navigation_click", "support_click", "client_error"]);
const VALUE_KEYS = new Set(["destination", "error", "language", "method", "mode", "score", "total"]);
const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

function clientDimensions(request: Request) {
  const ua = request.headers.get("user-agent") || "";
  const device = /ipad|tablet/i.test(ua) ? "tablet" : /mobile|iphone|android/i.test(ua) ? "mobile" : "desktop";
  const operatingSystem = /android/i.test(ua) ? "Android" : /iphone|ipad|ipod/i.test(ua) ? "iOS" : /windows/i.test(ua) ? "Windows" : /mac os|macintosh/i.test(ua) ? "macOS" : /linux/i.test(ua) ? "Linux" : "Other";
  const browser = /edg\//i.test(ua) ? "Edge" : /firefox\//i.test(ua) ? "Firefox" : /crios\//i.test(ua) ? "Chrome iOS" : /chrome\//i.test(ua) ? "Chrome" : /safari\//i.test(ua) ? "Safari" : "Other";
  const cf = (request as Request & { cf?: { country?: string; city?: string } }).cf;
  const country = clean(cf?.country || request.headers.get("cf-ipcountry"), 2).toUpperCase() || null;
  const city = clean(cf?.city, 100) || null;
  return { device, operatingSystem, browser, country, city };
}

function safeValue(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key, entry]) => VALUE_KEYS.has(key) && ["string", "number", "boolean"].includes(typeof entry))
    .map(([key, entry]) => [key, typeof entry === "string" ? entry.slice(0, 80) : entry]));
}

export async function POST(request: Request) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  if (!sameOrigin(request)) return json({ error: "cross_origin_request" }, 403);
  if (!await rateLimit(`analytics:${requestAddress(request)}`, 1500, 3600)) return json({ error: "too_many_requests" }, 429);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const sessionId = clean(body?.sessionId, 36), action = clean(body?.action, 20);
  if (!body || !SESSION_ID.test(sessionId) || !["event", "heartbeat"].includes(action)) return json({ error: "invalid_analytics" }, 400);

  const identity = await authenticateRequest(request), dimensions = clientDimensions(request);
  const pageName = clean(body.pageName, 40).replace(/[^a-z0-9_-]/gi, "") || "home";
  const source = ["direct", "organic", "social", "referral", "campaign"].includes(clean(body.source, 20)) ? clean(body.source, 20) : "direct";
  const activeSeconds = action === "heartbeat" ? Math.min(60, Math.max(0, Math.round(Number(body.activeSeconds) || 0))) : 0;
  const eventType = clean(body.eventType, 40);
  if (action === "event" && !EVENTS.has(eventType)) return json({ error: "invalid_event" }, 400);
  const pageViews = action === "event" && eventType === "page_view" ? 1 : 0;

  const statements = [env.DB.prepare(`INSERT INTO usage_sessions
      (session_id,user_id,active_seconds,page_views,country,city,device,operating_system,browser,source)
      VALUES (?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(session_id) DO UPDATE SET
        user_id=COALESCE(excluded.user_id,usage_sessions.user_id),
        last_seen_at=CURRENT_TIMESTAMP,
        active_seconds=usage_sessions.active_seconds+?,
        page_views=usage_sessions.page_views+?`)
    .bind(sessionId, identity?.userId || null, activeSeconds, pageViews, dimensions.country, dimensions.city, dimensions.device, dimensions.operatingSystem, dimensions.browser, source, activeSeconds, pageViews)];
  if (action === "event") statements.push(env.DB.prepare(
    "INSERT INTO usage_events (id,session_id,user_id,event_type,page_name,value_json) VALUES (?,?,?,?,?,?)",
  ).bind(crypto.randomUUID(), sessionId, identity?.userId || null, eventType, pageName, JSON.stringify(safeValue(body.value))));
  await env.DB.batch(statements);
  return json({ ok: true }, 202);
}

export async function GET(request: Request) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  const identity = await authenticateRequest(request);
  if (identity?.email !== OWNER_EMAIL) return json({ error: "forbidden" }, 403);
  const requested = Number(new URL(request.url).searchParams.get("days")), days = [7, 30, 90].includes(requested) ? requested : 30;
  const since = `-${days - 1} days`;
  const [accounts, summary, daily, countries, devices, browsers, pages, events, recentUsers] = await env.DB.batch([
    env.DB.prepare("SELECT COUNT(*) total, SUM(CASE WHEN email_verified_at IS NOT NULL THEN 1 ELSE 0 END) verified, SUM(CASE WHEN created_at>=datetime('now',?) THEN 1 ELSE 0 END) new_accounts FROM accounts WHERE deleted_at IS NULL").bind(since),
    env.DB.prepare("SELECT COUNT(*) sessions,COUNT(DISTINCT user_id) signed_in_users,COALESCE(SUM(page_views),0) page_views,COALESCE(SUM(active_seconds),0) active_seconds FROM usage_sessions WHERE started_at>=datetime('now',?)").bind(since),
    env.DB.prepare("SELECT substr(started_at,1,10) day,COUNT(*) sessions,COALESCE(SUM(page_views),0) page_views,COALESCE(SUM(active_seconds),0) active_seconds FROM usage_sessions WHERE started_at>=datetime('now',?) GROUP BY day ORDER BY day").bind(since),
    env.DB.prepare("SELECT COALESCE(country,'—') label,COUNT(*) sessions FROM usage_sessions WHERE started_at>=datetime('now',?) GROUP BY label ORDER BY sessions DESC LIMIT 20").bind(since),
    env.DB.prepare("SELECT device label,COUNT(*) sessions FROM usage_sessions WHERE started_at>=datetime('now',?) GROUP BY device ORDER BY sessions DESC").bind(since),
    env.DB.prepare("SELECT browser label,COUNT(*) sessions FROM usage_sessions WHERE started_at>=datetime('now',?) GROUP BY browser ORDER BY sessions DESC").bind(since),
    env.DB.prepare("SELECT page_name label,COUNT(*) views FROM usage_events WHERE event_type='page_view' AND created_at>=datetime('now',?) GROUP BY page_name ORDER BY views DESC LIMIT 20").bind(since),
    env.DB.prepare("SELECT event_type label,COUNT(*) total FROM usage_events WHERE created_at>=datetime('now',?) GROUP BY event_type ORDER BY total DESC").bind(since),
    env.DB.prepare(`SELECT a.email,a.first_name,a.last_name,a.created_at,a.email_verified_at,
        MAX(s.last_seen_at) last_seen_at,COALESCE(SUM(s.active_seconds),0) active_seconds,
        COALESCE(SUM(s.page_views),0) page_views,MAX(s.country) country
      FROM accounts a LEFT JOIN usage_sessions s ON s.user_id=a.id
      WHERE a.deleted_at IS NULL GROUP BY a.id ORDER BY a.created_at DESC LIMIT 100`),
  ]);
  const community = await ownerCommunityState();
  return json({ days, accounts: accounts.results[0] || {}, summary: summary.results[0] || {}, daily: daily.results, countries: countries.results, devices: devices.results, browsers: browsers.results, pages: pages.results, events: events.results, recentUsers: recentUsers.results, community });
}
