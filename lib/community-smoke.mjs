// HTTP 200 text/html may be a login/maintenance placeholder rather than
// the real public app shell. Bound the read and require the actual SSR anchors.
// This cannot prove browser execution, installed worker SHA, or D1 readiness.
async function hasCommunityShell(response) {
  const reader = response.body?.getReader();
  if (!reader) return false;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let html = "", bytes = 0, complete = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) { complete = true; break; }
      if (!(value instanceof Uint8Array)) return false;
      bytes += value.byteLength;
      if (bytes > 2 * 1024 * 1024) return false;
      html += decoder.decode(value, { stream: true });
    }
    html += decoder.decode();
  } catch { return false; }
  finally {
    if (!complete) { try { await reader.cancel(); } catch {} }
    reader.releaseLock();
  }
  // HTML comments cannot supply functional public route/landmark elements.
  // Drop complete and unfinished comments before testing rendered shell.
  const visibleHtml = html.replace(/<!--[\s\S]*?(?:-->|$)/g, "");
  return /<html(?:\s|>)/i.test(visibleHtml) &&
    /<main\b[^>]*\bid=(["'])main\1/i.test(visibleHtml) &&
    /<a\b[^>]*\bdata-route=(["'])community\1/i.test(visibleHtml) &&
    /<\/html\s*>/i.test(visibleHtml);
}

export async function communityDeploymentReady(origin, fetcher = fetch) {
  try {
    const paths=["/api/community?public=summary","/community","/api/account?action=me","/robots.txt","/sitemap.xml","/api/community/dispatch"];
    const checks=await Promise.all(paths.map(path=>fetcher(origin+path,{redirect:"manual",signal:AbortSignal.timeout(10000)})));
    if(checks.some(response=>!response.ok))return false;
    // HTTP 200 alone is not a deployed community page: maintenance JSON or
    // a plain-text placeholder must not qualify automatic activation.
    const communityType = (checks[1].headers.get("Content-Type") || "").trim();
    if (!/^text\/html(?:\s*;|$)/i.test(communityType)) return false;
    if (!await hasCommunityShell(checks[1])) return false;
    const hasNoStore = response => (response.headers.get("Cache-Control") || "")
      .split(",").some(directive => directive.trim().toLowerCase() === "no-store");
    // Read-only protocol probe: old deployments can have the public routes
    // while still rejecting the signed GitHub scheduler. Never POST in smoke.
    // A cached/stale 204 protocol response is not live dispatch capability.
    if(checks[5].status!==204 ||
       checks[5].headers.get("X-Scripture-Runner-Protocol")!=="github-oidc-v1" ||
       !hasNoStore(checks[5]) || !hasNoStore(checks[0]))return false;
    const summary=await checks[0].json();
    const account=await checks[2].json();
    const robots=await checks[3].text();
    const sitemap=await checks[4].text();
    // A malformed successful summary is not evidence of a release-ready site.
    // Online accounts cannot outnumber registered accounts; both SQL COUNT
    // values must be nonnegative browser-safe integers before autostart.
    const registered = summary.summary?.registered;
    const online = summary.summary?.online;
    // This is an unauthenticated read-only probe. A successful /api/account
    // response containing a user or allowing caches to retain account data
    // cannot certify a safe release, even when the other routes look healthy.
    const accountUncacheable = hasNoStore(checks[2]);
    return Number.isSafeInteger(registered) && registered >= 0 &&
      Number.isSafeInteger(online) && online >= 0 && online <= registered &&
      account !== null && typeof account === "object" && !Array.isArray(account) &&
      Object.hasOwn(account, "user") && Object.keys(account).length === 1 &&
      account.user === null && accountUncacheable &&
      robots.includes("Sitemap:") && sitemap.includes("<urlset");
  }catch{return false;}
}
