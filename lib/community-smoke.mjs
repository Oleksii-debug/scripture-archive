// Parse the real SSR tags for readiness; inert text is not a navigable shell.
// This intentionally fails closed and is not equivalent to a real browser check.
function hasVisibleCommunityAnchors(html) {
  // HTML raw-text/fallback content cannot establish visible SSR navigation.
  // <plaintext> consumes all following markup, including a fake closing tag.
  // <select> uses special HTML tree construction: <main>/<a> inside options
  // are ignored by browsers, not visible page navigation. Conservatively
  // treat its contents as inert until the closing select tag.
  const rawTags = new Set(["script", "style", "template", "noscript", "textarea", "title",
    "iframe", "xmp", "noembed", "noframes", "plaintext", "select"]);
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
  const inaccessible = attributes => {
    const aria = attr(attributes, "aria-hidden");
    const style = attr(attributes, "style");
    // HTML character references and CSS comments/escapes can hide elements
    // from the browser while appearing visible to this text-only preflight.
    // Treat opaque visibility declarations as unverified, not release-ready.
    return attr(attributes, "hidden") !== null ||
      attr(attributes, "inert") !== null ||
      (aria !== null && (aria.trim().toLowerCase() === "true" || aria.includes("&"))) ||
      (style !== null && (/[\\&]/.test(style) || style.includes("/*") ||
        style.includes("*/") ||
        /\b(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse)|content-visibility\s*:\s*hidden)\b/i.test(style) ||
        /\bopacity\s*:\s*(?:0+(?:\.0+)?|\.0+)(?=\s*(?:!important\b|;|$))/i.test(style)));
  };
  const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  const openTags = [];
  let hiddenDepth = 0;
  let htmlSeen = false, inBody = false, main = false, community = false, inert = null;
  let inertTemplateDepth = 0;
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
      // HTML plaintext has no recognized closing tag; all later bytes are text.
      if (inert === "plaintext") continue;
      // Unlike raw-text script/style, HTML templates can nest. An inner
      // </template> does not expose markup still inside the outer template.
      if (inert === "template" && tag === "template") {
        if (closing) {
          if (--inertTemplateDepth === 0) inert = null;
        } else {
          if (inertTemplateDepth >= 4096) return false;
          inertTemplateDepth++;
        }
      } else if (closing && tag === inert) inert = null;
      continue;
    }
    if (closing) {
      const index = openTags.findLastIndex(entry => entry.tag === tag);
      if (index < 0) return false;
      while (openTags.length > index) {
        if (openTags.pop().hidden) hiddenDepth--;
      }
      if (tag === "body") inBody = false;
      if (tag === "html") return htmlSeen && main && community;
      continue;
    }
    // A hidden root/body cannot certify a navigable public page.
    if ((tag === "html" || tag === "body") && inaccessible(attributes)) return false;
    // A meta refresh can navigate away from an otherwise valid SSR shell.
    // The text-only release probe must fail closed rather than certify it.
    if (tag === "meta") {
      const directive = attr(attributes, "http-equiv");
      if (directive !== null &&
          (directive.trim().toLowerCase() === "refresh" || directive.includes("&"))) return false;
    }
    // HTML <base> can redirect root-relative community links to another
    // origin or change their browsing target. No base tag is required by the
    // canonical shell; fail closed instead of certifying altered navigation.
    if (tag === "base") return false;
    if (tag === "html") htmlSeen = true;
    if (tag === "body" && htmlSeen) inBody = true;
    if (inBody && hiddenDepth === 0 && !inaccessible(attributes)) {
      if (tag === "main" && attr(attributes, "id") === "main") main = true;
      // The required link must navigate via sequential keyboard access.
      // <a download> saves the same-origin resource instead of opening the
      // community route; negative tabindex removes the link from Tab order.
      // This source preflight is not a substitute for browser/NVDA acceptance.
      if (tag === "a" && attr(attributes, "data-route") === "community" &&
          attr(attributes, "href") === "/community" &&
          attr(attributes, "download") === null) {
        const tabIndex = attr(attributes, "tabindex");
        if (tabIndex === null || /^\+?\d+$/.test(tabIndex.trim())) community = true;
      }
    }
    // Ancestor visibility matters: a valid anchor inside a hidden container
    // is no more usable than a hidden anchor itself. Raw/void tags cannot
    // contain navigable descendants.
    // text/html ignores trailing slashes on non-void tags: <div/> is not closed.
    // SVG/MathML are foreign namespaces: their <main>/<a> elements cannot
    // certify the HTML landmark/navigation. HTML5 permits self-closing foreign
    // roots (<svg/> / <math/>), unlike ordinary HTML non-void elements.
    const foreignRoot = tag === "svg" || tag === "math";
    // A slash must immediately precede >; <svg/ > remains an open SVG.
    const foreignSelfClosing = foreignRoot && /\/$/.test(attributes);
    if (!rawTags.has(tag) && !voidTags.has(tag) && !foreignSelfClosing) {
      // Preserve bounded-time/space fail-closed scanning on malformed HTML.
      if (openTags.length >= 4096) return false;
      // A dialog without the HTML boolean open attribute is not rendered.
      // Its descendants cannot establish keyboard-visible SSR readiness.
      // A lookalike data-open/aria-modal is not the native open attribute.
      // Closed <details> exposes its <summary>, but not its content panel.
      // For release readiness, conservatively refuse to certify any marker
      // inside a closed details subtree (including malformed summary markup).
      // The native HTML boolean open attribute is present even when empty
      // or spelled open="false"; data-open/aria-expanded are not equivalent.
      const hidden = inaccessible(attributes) || foreignRoot ||
        ((tag === "dialog" || tag === "details") &&
          attr(attributes, "open") === null);
      openTags.push({ tag, hidden });
      if (hidden) hiddenDepth++;
    }
    // <script/> is still a raw-text script until its actual closing tag.
    if (rawTags.has(tag)) {
      inert = tag;
      if (tag === "template") inertTemplateDepth = 1;
    }
  }
  return false;
}

// HTTP 200 text/html may be a login/maintenance placeholder rather than
// the real public app shell. Bound the read and require the actual SSR anchors.
// This cannot prove browser execution, installed worker SHA, or D1 readiness.
// Bound every remote readiness body, not only the HTML shell. A 200 response
// with megabytes of trailing JSON whitespace or SEO text must not qualify
// scheduler activation after unbounded buffering. Fatal UTF-8 decoding also
// refuses corrupted public text instead of silently replacing bytes.
async function readBoundedUtf8(response, maxBytes) {
  const reader = response.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let text = "", bytes = 0, complete = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) { complete = true; break; }
      if (!(value instanceof Uint8Array)) return null;
      bytes += value.byteLength;
      if (bytes > maxBytes) return null;
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } catch { return null; }
  finally {
    if (!complete) { try { await reader.cancel(); } catch {} }
    reader.releaseLock();
  }
}

async function hasCommunityShell(response) {
  const html = await readBoundedUtf8(response, 2 * 1024 * 1024);
  return html !== null && hasVisibleCommunityAnchors(html);
}

export async function communityDeploymentReady(origin, fetcher = fetch) {
  try {
    const paths=["/api/community?public=summary","/community","/api/account?action=me","/robots.txt","/sitemap.xml","/api/community/dispatch"];
    const checks=await Promise.all(paths.map(path=>fetcher(origin+path,{redirect:"manual",signal:AbortSignal.timeout(10000)})));
    // Only complete 200 resources establish a deployed route. Response.ok also
    // accepts 201/202/206, which can certify partial or asynchronous content.
    // The read-only signed-dispatch capability probe is the sole 204 route.
    if (checks.some((response, index) => response.status !== (index === 5 ? 204 : 200))) return false;
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
    // The other four bodies were previously read with unbounded json()/text().
    // Use the same streaming cap as HTML; all six probes remain GET-only.
    const [summaryText, accountText, robots, sitemap] = await Promise.all([
      readBoundedUtf8(checks[0], 2 * 1024 * 1024),
      readBoundedUtf8(checks[2], 2 * 1024 * 1024),
      readBoundedUtf8(checks[3], 2 * 1024 * 1024),
      readBoundedUtf8(checks[4], 2 * 1024 * 1024),
    ]);
    if (summaryText === null || accountText === null ||
        robots === null || sitemap === null) return false;
    const summary = JSON.parse(summaryText);
    // The public summary route is a read-only, privacy-limited projection.
    // JSON.parse discards earlier duplicate keys: a response containing private
    // owner/member bytes could otherwise pass after a later key overwrote them.
    // The canonical route uses Response.json (compact JSON.stringify output).
    // Refuse noncanonical/ambiguous raw JSON rather than certify concealed data.
    const plainObject = value => value !== null && typeof value === "object" &&
      !Array.isArray(value);
    const keysAllowed = (value, allowed) => plainObject(value) &&
      Object.keys(value).every(key => allowed.includes(key));
    const publicSummaryOnly = summaryText === JSON.stringify(summary) &&
      keysAllowed(summary, ["summary", "page", "pageSize", "totalPages", "members"]) &&
      keysAllowed(summary.summary, ["registered", "online", "visible"]) &&
      (!Object.hasOwn(summary.summary, "visible") ||
        (Number.isSafeInteger(summary.summary.visible) && summary.summary.visible >= 0)) &&
      (!Object.hasOwn(summary, "page") ||
        (Number.isSafeInteger(summary.page) && summary.page >= 1)) &&
      (!Object.hasOwn(summary, "pageSize") ||
        (Number.isSafeInteger(summary.pageSize) && summary.pageSize >= 1 && summary.pageSize <= 48)) &&
      (!Object.hasOwn(summary, "totalPages") ||
        (Number.isSafeInteger(summary.totalPages) && summary.totalPages >= 1)) &&
      (!Object.hasOwn(summary, "members") ||
        (Array.isArray(summary.members) && summary.members.length === 0));
    // JSON.parse silently discards earlier duplicate keys. A raw response like
    // {"user":{"email":"private"},"user":null} parses to {user:null} but
    // has already disclosed private bytes. Only the canonical anonymous
    // single-field JSON document can certify an unauthenticated release probe.
    // JSON whitespace is exactly SP, TAB, CR or LF (RFC 8259).
    const accountIsCanonicalAnonymous =
      /^[ \t\r\n]*\{[ \t\r\n]*"user"[ \t\r\n]*:[ \t\r\n]*null[ \t\r\n]*\}[ \t\r\n]*$/u.test(accountText);
    // A malformed successful summary is not evidence of a release-ready site.
    // Online accounts cannot outnumber registered accounts; both SQL COUNT
    // values must be nonnegative browser-safe integers before autostart.
    const registered = summary.summary?.registered;
    const online = summary.summary?.online;
    // This is an unauthenticated read-only probe. A successful /api/account
    // response containing a user or allowing caches to retain account data
    // cannot certify a safe release, even when the other routes look healthy.
    const accountUncacheable = hasNoStore(checks[2]);
    // A 200 robots/sitemap placeholder can advertise a different origin or
    // prohibit all crawlers while still containing the old marker substrings.
    // The canonical robots route declares one exact sitemap for this site.
    // Keep this a read-only source preflight, not a claim of live DNS/indexing.
    const robotsLines = robots.split(/\\r?\\n/).map(line => line.trim());
    const sitemapDeclarations = robotsLines.filter(line => /^sitemap\\s*:/i.test(line));
    const robotsSitemapMatches = sitemapDeclarations.length === 1 &&
      sitemapDeclarations[0].replace(/^sitemap\\s*:\\s*/i, "") === `${origin}/sitemap.xml`;
    const robotsBlocksAll = robotsLines.some(line => /^disallow\\s*:\\s*\\/\\s*(?:#.*)?$/i.test(line));
    // Existing minimal test fixtures may contain an empty <urlset>. When a
    // real sitemap advertises absolute <loc> URLs, none may escape this origin.
    const sitemapLocations = [...sitemap.matchAll(/<loc>([^<]*)<\\/loc>/g)].map(match => match[1]);
    const sitemapLocationsValid = sitemapLocations.every(location => {
      try {
        const url = new URL(location);
        return url.origin === origin && url.href === location;
      } catch { return false; }
    });
    return Number.isSafeInteger(registered) && registered >= 0 &&
      Number.isSafeInteger(online) && online >= 0 && online <= registered &&
      publicSummaryOnly && accountIsCanonicalAnonymous && accountUncacheable &&
      robotsSitemapMatches && !robotsBlocksAll &&
      sitemapLocationsValid && sitemap.includes("<urlset");
  }catch{return false;}
}
