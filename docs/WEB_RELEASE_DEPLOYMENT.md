# Scripture Archive web release

## Publication truth and source boundaries (2026-10-25)

This document describes the **existing** Vinext/Cloudflare Sites project declared
in `.openai/hosting.json`; the presence of a project binding is **not**
evidence that an artifact or this commit is serving public requests.

- Exact inspected GitHub `main` commit: `93591836b53a36e0114ab2bc4bd92632128e8d96`.
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
  not been verified.
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
Live HTTPS, DNS/ownership, current-SHA deployment, database migration,
reviewed promotion, real browser flow, and physical NVDA remain
**NOT VERIFIED**. Do not label any release `DEPLOYED_SHA_VERIFIED`
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

## Required production bindings

- D1 binding: `DB`
- `APP_BASE_URL` set to the current public origin; use
  `https://scripture-archive-live.bubblybasil20.chatgpt.site` until the custom
  domain is connected, then change it to `https://scripture-archive.com`
- `NEXT_PUBLIC_SITE_URL` set to the same public origin; canonical links,
  `robots.txt`, `sitemap.xml`, Open Graph URLs, and structured data use it
- `EMAIL_FROM=Scripture Archive <no-reply@scripture-archive.com>`
- secret `EMAIL_API_KEY` for the Resend API
- `NEXT_PUBLIC_GA4_ID` after the owner creates or selects the Scripture Archive
  GA4 property
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` when Search Console supplies an HTML
  verification token for a URL-prefix property

`AUTH_TEST_MODE` must be absent in production. It is only for local automated
tests and exposes one-time test tokens in API responses.

Apply all migrations in `drizzle/` to the production D1 database before the
new worker receives traffic. Configure the sending domain in Resend and publish
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
```

The integration test requires a local worker with the migrations applied:

```sh
SCRIPTURE_TEST_URL=http://127.0.0.1:8787 node --test tests/api-flow.test.mjs
```

After deployment, verify the verification and password-reset messages with a
real mailbox before describing email delivery as operational. Add the custom
domain only after registration is complete, then verify the apex and `www`
hostnames, HTTPS redirects, certificate renewal, direct public routes,
`robots.txt`, and `sitemap.xml` from an external connection.

## Google verification and analytics

The current `chatgpt.site` origin can be indexed before the custom domain is
available. Create a URL-prefix Search Console property for the exact HTTPS
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
