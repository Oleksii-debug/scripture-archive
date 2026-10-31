// Parse the real SSR tags for readiness; inert text is not a navigable shell.
// This intentionally fails closed and is not equivalent to a real browser check.
function hasVisibleCommunityAnchors(html) {
  const rawTags = new Set(["script", "style", "template", "noscript", "textarea", "title"]);
  const voidTags = new Set(["area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"]);
  const attr = (source, wanted) => {
    let i = 0;
    while (i < source.length) {
      while (/\s/.test(source[i] || "") || source[i] === "/") i++;
      if (i >= source.length) break;
      const start = i;
      while (i < source.length && !/[\s=/>]/.test(source[i])) i++;
      if (start === i) { i++; continue; }
      const name = source.slice(start, i).toLowerCase();
      while (/\s/.test(source[i] || "")) i++;
      let value = null;
      if (source[i] === "=") {
        i++;
        while (/\s/.test(source[i] || "")) i++;
        if (source[i] === '"' || source[i] === "'") {
          const quote = source[i++], begin = i;
          while (i < source.length && source[i] !== quote) i++;
          if (i >= source.length) return null;
          value = source.slice(begin, i++);
        } else {
          const begin = i;
          while (i < source.length && !/[\s/>]/.test(source[i])) i++;
          value = source.slice(begin, i);
        }
      }
      // For boolean HTML attributes, presence (even with no value) matters.
      if (name === wanted) return value ?? "";
    }
    return null;
  };
  // Hidden/inert anchors are not usable keyboard or assistive-tech navigation.
  // Do not confuse lookalike data-* attributes with actual HTML semantics.
  const inaccessible = attributes =>
    attr(attributes, "hidden") !== null ||
    attr(attributes, "inert") !== null ||
    (attr(attributes, "aria-hidden") || "").trim().toLowerCase() === "true";
  let htmlSeen = false, inBody = false, main = false, community = false, inert = null;
  // Track effective HTML ancestry; hidden/inert ancestors also remove their
  // children from the accessible navigation surface. Bound untrusted nesting.
  const ancestry = [];
  for (let pos = 0; pos < html.length;) {
    const at = html.indexOf("<", pos);
    if (at < 0) break;
    if (html.startsWith("<!--", at)) {
      const end = html.indexOf("-->", at + 4);
      if (end < 0) return false;
      pos = end + 3;
      continue;
    }
    if (html.startsWith("<!", at) || html.startsWith("<?", at)) {
      const end = html.indexOf(">", at + 2);
      if (end < 0) return false;
      pos = end + 1;
      continue;
    }
    const match = /^<(\/)?([a-z][a-z\d:-]*)\b/i.exec(html.slice(at, at + 70));
    if (!match) { pos = at + 1; continue; }
    const closing = Boolean(match[1]), tag = match[2].toLowerCase();
    let end = at + match[0].length, quote = null;
    const start = end;
    for (; end < html.length; end++) {
      const c = html[end];
      if (quote) { if (c === quote) quote = null; }
      else if (c === '"' || c === "'") quote = c;
      else if (c === ">") break;
    }
    if (end >= html.length) return false;
    const attributes = html.slice(start, end);
    pos = end + 1;
    if (inert) {
      if (closing && tag === inert) inert = null;
      continue;
    }
    if (closing) {
      if (tag === "body") inBody = false;
      if (tag === "html") return htmlSeen && main && community;
      const i = ancestry.findLastIndex(element => element.tag === tag);
      if (i >= 0) ancestry.length = i;
      continue;
    }
    // A hidden root/body cannot certify a navigable public page.
    if ((tag === "html" || tag === "body") && inaccessible(attributes)) return false;
    if (tag === "html") htmlSeen = true;
    if (tag === "body" && htmlSeen) {
      // Browser HTML parsing implicitly ends the head when body starts.
      ancestry.length = 0;
      inBody = true;
    }
    const unavailable = inaccessible(attributes) ||
      (ancestry.length > 0 && ancestry[ancestry.length - 1].unavailable);
    if (inBody && !unavailable) {
      if (tag === "main" && attr(attributes, "id") === "main") main = true;
      if (tag === "a" && attr(attributes, "data-route") === "community" &&
          attr(attributes, "href") === "/community") community = true;
    }
    const selfClosing = /\/\s*$/.test(attributes);
    if (rawTags.has(tag) && !selfClosing) inert = tag;
    else if (!rawTags.has(tag) && !voidTags.has(tag) && !selfClosing) {
      if (ancestry.length >= 4096) return false;
      ancestry.push({ tag, unavailable });
    }
  }
  return false;
}

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
  return hasVisibleCommunityAnchors(html);
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
