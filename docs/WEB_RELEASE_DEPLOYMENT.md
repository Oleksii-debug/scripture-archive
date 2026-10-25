# Scripture Archive web release

## Publication truth and source boundaries (2026-10-25)

This document describes the **existing** Vinext/Cloudflare Sites project declared
in `.openai/hosting.json`; the presence of a project binding is **not**
evidence that an artifact or this commit is serving public requests.

- Exact GitHub `main` commit inspected for this checkpoint: `6d2eff033380afef9d04f98ef98d87fa78688a11` (source only; **NOT** a deployed SHA). Historical initial PR base: `93591836b53a36e0114ab2bc4bd92632128e8d96`.
- The separately stored Google Drive archive
  `scripture-archive-live-f8eba64.zip` follows historical source commit
  `f8eba649ba404b9751e22bd45773a0fa0c06f122`. It must not
  qualify current `main`.
- Historical Google Drive `Scripture-Archive-Sites-Deployment-v14.tar.gz`
  is an offline artifact, not proof of a completed deployment. Its
  `dist/server/BUILD_ID` is not a Git commit SHA.
- The earlier public-link note contains fragment routes (`/#/reader/GEN/1`);
  today's server source exposes normal paths (`/reader`, `/groups`, etc.).
  Confirm the correct paths in an actual HTTP/browser session before
  publishing links.
- The historical v14 artifact's `dist/client/robots.txt` and
  `dist/client/sitemap.xml` advertise `https://scripture-archive.com`,
  while the currently documented temporary URL is
  `https://scripture-archive-live.bubblybasil20.chatgpt.site`.
  The v14 static sitemap contains only the home route and lacks the
  public `/reader`, `/campaigns`, `/missions`, `/groups`, `/support`,
  `/about`, and `/privacy` routes. **Reject promoting this old artifact
  to the temporary origin without rebuilding and requalifying it.**
  Current `main` defines dynamic SEO routes, but their live behavior has
  not been independently verified in this SA-13 run.
- A public URL in a file, domain mention in SEO metadata, or a successful
  source test does **not** prove the domain is registered, DNS is configured,
  HTTPS works, or the correct SHA was deployed.

## Safe staged promotion gate

1. Use only the existing `npm run build`/Vinext-Sites/Cloudflare worker
   path. Capture the checked-out **full Git SHA** and clean working tree,
   then execute `npm ci`, `npx tsc --noEmit`, `npm run lint`,
   `npm test`, and `npm run build` on that same candidate.
   Treat tests skipped for absent `SCRIPTURE_TEST_URL` as **NOT EXECUTED**.
2. Inspect the produced `dist/client` and `dist/server` contents
   before any traffic handoff: `app.js`, styles, logo, client chunk,
   and the complete three-language `data/bible` bundle for **uk/ru/en**.
   Do not treat a Vinext `BUILD_ID` as a Git SHA.
   If `robots.txt` and `sitemap.xml` are static in the package,
   require their hostnames to match the **actual chosen origin**, include
   every intended public route, and exclude private routes.
   If they are generated dynamically, the file-system check alone is
   insufficient: require HTTP GET checks of both endpoints.
3. Record explicit owner permission **before** changing hosting bindings,
   D1 production migrations, production data, deployment/traffic,
   DNS, domain purchases, custom domains, permissions or email settings.
   Never use `AUTH_TEST_MODE` on a public server. Never modify the
   foundation or any unrelated site to make room for this project.
4. After a separately approved staging deploy, externally check HTTPS,
   the certificate, origin/redirects, real response headers, cache policy,
   `/robots.txt`, `/sitemap.xml`, `/`, `/reader`, `/groups`,
   `/missions`, `/about`, `/privacy`, static assets, Bible JSON
   under each of the **three** editions, and direct-path reloads. Test
   all permanent UI languages `uk`, `ru`, `en`, skip-link, native
   keyboard navigation, accessible error/retry, and persistence/readback
   where an authenticated server operation is expected.
5. To claim live completion, bind the exact deployed source SHA to a
   verifiable server/release declaration **and** to external HTTP/browser
   evidence. A build identifier alone cannot establish source parity.
   Real NVDA acceptance must be marked **NOT EXECUTED** absent a real
   Windows/NVDA run.
6. For rollback, retain the previously verified immutable artifact
   and the prior configuration, use the platform's approved traffic
   rollback mechanism, and restore data only from a separately validated
   owner-approved backup. Never assume reversing an already applied D1
   migration is safe; preserve migration/backup evidence.

**Current gate:** source and historical-artifact inspection only.
Independently observed current live HTTPS, DNS/ownership, current-SHA deployment, database migration,
reviewed promotion, real browser flow, and physical NVDA remain
**NOT VERIFIED in SA-13**. The repository's separate `docs/RELEASE_AUDIT_2026-10-25.md` reports HTTPS 200 for an older public application and 404 for new routes; that is historical audit evidence, not a release-SHA match. Do not label any release `DEPLOYED_SHA_VERIFIED`
or `PUBLIC_READY` from these notes.


### Read-only declared-origin preflight

Before considering any **owner-approved** staged deployment, run the existing
Node test suite plus the separate non-deploying origin declaration check.
Set `NEXT_PUBLIC_SITE_URL` and `APP_BASE_URL` in the **isolated release
environment** to the owner-approved intended HTTPS origin; pass the same
origin explicitly:

```sh
node scripts/check-web-release-origin.mjs --expected-origin https://APPROVED-HOST.EXAMPLE
```

It refuses absent, mismatched, HTTP, credential-bearing or path/query/fragment
origins. A passing result is labeled `DECLARED_ORIGIN_MATCH_ONLY`: it checks
**declared configuration parity**, not domain purchase/ownership, public DNS,
certificate validity, actual host configuration, effective production secrets,
deployed SHA, endpoint accessibility or existing user data. Do not export
production credentials, use this check to modify bindings, or infer permission
to publish. Real `GET /robots.txt`, `GET /sitemap.xml`, direct-path and
public asset checks still require externally observed HTTPS after an approved
deployment.

Evidence checkpoint (2026-10-25): 6/6 isolated Node 22 declaration tests PASS
and repeated PASS; committed source blobs matched locally executed sources by
Git blob hashes. Full exact-PR checkout `npm test`/`lint`/`build`, independent
review and deployment are **NOT EXECUTED**. The release gate remains **NOT
QUALIFIED**; UK/RU/EN are the only permanent interface languages.

### 2026-10-25 direct-route drift and migration gates

- Source snapshots observed in GitHub: `e80779230fef246db9482decff2cfd75b3aeca12`
  introduced the `/help` home/sitemap link without accepting it in the
  Next catch-all route. Later `main` commit
  `6b7947e158ca44a6f049e02dbdaa037ea0125134` **independently fixed**
  that route and its metadata and introduced public `/community`.
  These commits are source snapshots, **not** deployed-SHA evidence.
  The earlier `93591836b53a36e0114ab2bc4bd92632128e8d96`
  was an even older main inspection baseline.
- PR #288 intentionally **does not duplicate** the later main's route fix.
  Its `tests/public-route-release-contract.test.mjs` checks that every
  advertised sitemap and home-navigation route resolves to a server-side
  public/private catch-all entry, that private routes are not indexed,
  that an advertised `/help` has metadata, and that permanent UI locales
  remain exactly `uk/ru/en`. These tests are source-level contracts,
  not live HTTP, accessibility or deployment qualifications.
  Reconcile this PR against newer main and execute the test on the
  **actual rebased exact candidate** before any merge.
- Main now includes `drizzle/0006_support_requests.sql` and
  `drizzle/0007_community.sql`; they require explicit staging verification
  of compatibility, backup/rollback and privacy. No production D1 migration,
  provider email configuration or user-data restore has been executed.
- The new `/api/community` path builds **synthetic** participants and
  includes them in the `registered` public summary. A public site must
  not represent generated participants as real registered users without
  a conspicuous, accurate disclosure or correction. This is a separate
  public-truth qualification blocker requiring review before promotion.
- Source resource listing has 66 JSON books in each of `uk`, `ru`,
  `en` and `uk-ohiienko` (two Ukrainian editions, **not** four permanent
  UI languages). The three-locale manifest declares 198 files; verify
  this coverage and the alternative local Ukrainian edition in the
  **actually built artifact**, not only in GitHub source.

**Checkpoint:** focused source-level tests have local evidence; GitHub CI,
exact-PR full build, external browser GET, HTTPS certificate, deployed SHA,
owner permission and D1 migration/rollback qualification remain **NOT DONE**.

## Required production bindings

- D1 binding: `DB`
- `APP_BASE_URL` set only to the explicitly owner-approved, verified HTTPS origin (do not assume `scripture-archive.com` is owned or connected solely because it appears in source)
- `NEXT_PUBLIC_SITE_URL` set to the same public origin; canonical links,
  `robots.txt`, `sitemap.xml`, Open Graph URLs, and structured data use it
- `EMAIL_FROM=Scripture Archive <no-reply@scripture-archive.com>` only after owner approval and sending-domain verification
- secret `EMAIL_API_KEY` for the Resend API
- `NEXT_PUBLIC_GA4_ID` after the owner creates or selects the Scripture Archive
  GA4 property
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` when Search Console supplies an HTML
  verification token for a URL-prefix property

`AUTH_TEST_MODE` must be absent in production. It is only for local automated
tests; one-time test tokens are returned only for loopback request origins.
Leave `TRUST_PLATFORM_AUTH` absent for ordinary hosting. Set it to `1` only
when an authenticated hosting gateway guarantees that client-supplied
`oai-authenticated-*` headers are removed and replaced. Password accounts do not
need this setting. Untrusted headers must never grant owner access.

Only after explicit owner approval, a validated backup and an isolated rehearsal, apply the required migrations in `drizzle/` to the intended D1 database before
any new worker receives production traffic. Do not automatically run production migrations. Configure the sending domain in Resend and publish
the provider-supplied SPF and DKIM records. Publish a DMARC record separately;
start with an address-owned reporting mailbox and increase policy enforcement
only after delivery reports are healthy.

Migration `0005_usage_analytics.sql` adds consent-based first-party analytics.
It stores a random browser-session identifier, approximate country/city supplied
by the hosting edge, device/browser categories, page names, key event names and
active seconds. It never stores an IP address, password, answer, reset token or
page query string. The owner can review 30-day totals and recent registrations
on `/editor`; account deletion removes the account link from retained aggregate
analytics.

## Release checks

```sh
npm ci
npx tsc --noEmit
npm run lint
npm test
npm run build
npm run test:integration
```

`test:integration` creates a new temporary local D1 database, applies all eight
migrations, starts a loopback worker, runs the checks, then stops the worker and
removes its own temporary database. It never uses the production database.
Checks include concurrent reuse of verification/reset tokens, rejected identity
header spoofing, server-owned grading and progress restored in another session.

Alternatively, tests can target an already running local test worker:

```sh
SCRIPTURE_TEST_URL=http://127.0.0.1:8787 node --test tests/api-flow.test.mjs
```

After deployment, verify the verification and password-reset messages with a
real mailbox before describing email delivery as operational. Add the custom
domain only after registration is complete, then verify the apex and `www`
hostnames, HTTPS redirects, certificate renewal, direct public routes,
`robots.txt`, and `sitemap.xml` from an external connection.

The separate repository `docs/RELEASE_AUDIT_2026-10-25.md` reports an HTTPS 200 response serving an older build on 2026-10-25; `/account`, `/api/auth`, `/robots.txt`, and `/sitemap.xml` reportedly returned 404. This is attributed prior-run evidence, not an independently repeated live probe in the present SA-13 run, proof of domain ownership, or confirmation that this release was deployed.

## Google verification and analytics

An owner-authorized, verified `chatgpt.site` origin may be indexed before a separately verified custom domain is available. Create a URL-prefix Search Console property for the exact HTTPS
origin, place its HTML-tag token in `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`,
redeploy, verify ownership, and submit `/sitemap.xml`. When the custom domain is
connected, create the domain property with its DNS TXT record and update both
public-origin variables.

Create or select a GA4 property and web stream for the same current origin. Put
only its public `G-...` measurement ID in `NEXT_PUBLIC_GA4_ID`. Analytics loads
after consent, sends manual page views for direct client-side routes, and strips
query strings and private route identifiers so verification and reset tokens do
not reach GA4. Link the verified Search Console property from GA4 Admin after
both properties exist. The first-party `/editor` report remains available even
without GA4 and measures active foreground time with a bounded heartbeat; GA4
provides the independent Google acquisition, geography and engagement reports.


### 2026-10-25 keyboard anchor / legacy fragment release guard

On exact main source `6d2eff033380afef9d04f98ef98d87fa78688a11`,
the canonical `public/app.js` treated **any** location fragment as a
client-side workspace name. The actual `app/page.tsx` skip link is
`href="#main"`, so activating it on a direct `/reader/GEN/1` route
selected a bogus `main` route and fell back to the home view.
Additionally, the unconditional `hashchange` handler rerendered the
page when a normal keyboard-accessible anchor changed.

Draft PR #288 retains the existing single client router and legacy
`#/reader/GEN/1` links, but delegates fragment classification to
`public/route-location.js`. Only `#/` fragments represent client
routes; native `#main` and other HTML anchors preserve the canonical
path and do **not** retrigger a route render. New
`tests/hash-anchor-navigation.test.mjs` verifies skip links, direct
reader/group paths, legacy fragment compatibility, leaving legacy
fragments, and that the actual app imports and invokes the classifier.

Local isolated Node 22 helper tests: **5/5 PASS**; remote source
readback confirmed updated app wiring and tests against the candidate
blobs. This is **source-level regression evidence**, not an actual
browser/NVDA acceptance or full exact-PR `npm test`/`npm run build`.
CI check-runs and independent review have not qualified this change.
The latest branch SHA must be reacquired after this documentation
commit. Domain ownership, current public DNS/TLS, active deployment
SHA, database state and UK/RU/EN built asset delivery remain
**NOT VERIFIED**. Do not merge, deploy, change public links or claim
PUBLIC_READY merely from this source-level PASS.
