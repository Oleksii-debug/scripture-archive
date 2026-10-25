# Release audit — 25 October 2026

## Implemented corrections

- Registration retains its form before asynchronous work. Successful account
  creation no longer becomes a client error when delivery is unavailable; the
  user receives an accurate message and a resend control.
- Password recovery returns to the sign-in form. Verification and reset links
  are claimed atomically, including concurrent reuse.
- Identity headers are disabled unless a trusted gateway is explicitly enabled.
  Malformed percent-encoded cookies do not crash account requests. Test tokens
  are restricted to loopback requests.
- Progress is derived from server-graded completed attempts and restored in
  another session. Clients cannot write their own score. Signing out clears the
  previous user's local progress and reading cache.
- Concurrent submissions of the same answer accept one result and reject the
  other, without duplicate grading. Final accepted answers enter grading before
  completion, so an invalidation cannot revive a partially completed attempt.
- Support has a page-level heading; reader labels and verse numbers have adequate
  contrast. The main domain is the default canonical origin.
- `npm run test:integration` provisions and removes its own local D1 database.

## Verified locally

- Production build and TypeScript: pass.
- API/database and unit/contract checks: 13 passed, none skipped. This includes
  concurrent token/answer reuse, denied forged identity headers, session
  revocation, persisted grading, group results and strict marathon limits.
- Existing Python validator adapters: 2 passed. These are wrappers around the
  repository validators, not an additional whole-product qualification.
- ESLint: 0 errors, 8 existing warnings.
- Browser registration, verification, sign-in, persisted session, owner report,
  hidden assessment identity and cross-tab invalidation: passed locally. The
  verification tokens were local test tokens; no real email receipt is implied.
- A separate browser run completed four chapter questions, restored their score
  in a new browser context, cleared private local data on sign-out, reset the
  password and signed in with the new password. No JavaScript exception occurred.
- Axe WCAG checks: 42 page/language/viewport combinations, no reported violations
  or horizontal overflow. Tested routes: home, account, reader, groups, community,
  progress and support; Ukrainian, Russian and English; widths 1440 and 390.
- Keyboard skip link, menu, route focus, form accessible names and Chrome's
  accessibility tree: checked. Native NVDA on Windows 11 was not available in
  this Linux environment and is not claimed as tested.

## Public observations and deployment limitations

- `https://scripture-archive.com/` and `https://www.scripture-archive.com/`
  respond with HTTP 200. Chromium opened the apex over verified HTTPS and showed
  Scripture Archive. No TLS checks were disabled.
- The apex and previous `chatgpt.site` origin returned identical HTML and
  `home.js` SHA-256 fingerprints. This establishes matching old application
  content, not the physical origin server or DNS provider.
- Both origins return 404 for `/account`, `/api/auth?action=verify`,
  `/robots.txt` and `/sitemap.xml`. The public site has not received this release.
- The configured DNS resolver returned ECONNREFUSED/timeouts for A, AAAA, CNAME
  and NS queries. Google/Cloudflare DNS-over-HTTPS and registry RDAP requests were
  rejected by the proxy with CONNECT 403. No DNS record values were established.
- `/cpanel` on the project domain returns 404; port 2083 returned HTTP 400;
  `cpanel.scripture-archive.com` was rejected with CONNECT 403. Provider candidate
  endpoints from the earlier official redirect-page inspection remain
  unconfirmed for this account and were not retried without a network change.
- HOSTiQ documents SSH (shared-hosting port 21098) and FTP with SSL/TLS. The
  customer's plan/server support is not known. This environment has no TCP
  destination grants, so SSH/SFTP/FTPS were not used.
- GitHub lists 102 workflows, none matching web deployment; the current tree has
  no deployment workflow. There are no repository deployment records or
  environments. Access to Actions secret metadata is denied (403); this does
  not prove that secrets are absent.
- The environment draft previously rejected network changes with `stale_base`.
  No repeat write was attempted. A fresh setup chat from current environment
  settings is required by that tool's response before configuration can be saved.
- There is no callable Sites publishing tool or authenticated Cloudflare
  deployment capability here. Real mail delivery, GA4/Search Console setup and
  production bot activation remain unverified and incomplete.

No production files or DNS records were changed. The previous source is retained
in Git and the pre-change handoff archive. The user subsequently prioritized bot
activation; unrelated design/hosting development should not expand further.

## Follow-up: prioritized agent work

Added a scheduler process with three fail-fast response checks and a local
learning-agent journey. The latest fresh-database run passed all 16 tests with
none skipped, then ran an agent through registration, local token verification,
sign-in, chapter fetch, four server-graded answers (1 correct), logout and progress
restoration. The agent does not read answer keys. Its opted-in community profile
also showed one actually completed chapter attempt and one read chapter.

The public scheduler preflight used the configured HTTPS proxy and stopped on
404 from the production community endpoint. The local scheduler was started
separately in this temporary workspace. The 2,100-profile schedule is not a
2,100-agent production rollout. Durable production execution, verified agent
provisioning and the missing deployment remain incomplete.
