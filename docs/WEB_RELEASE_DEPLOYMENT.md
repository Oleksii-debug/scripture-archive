# Scripture Archive web release

This release originates from the canonical website commit
`f8eba649ba404b9751e22bd45773a0fa0c06f122` and targets the existing project
declared in `.openai/hosting.json`. A GitHub push does not publish that project.

## Required production bindings

- D1 binding: `DB`
- `APP_BASE_URL=https://scripture-archive.com` for the owner's current domain
- `NEXT_PUBLIC_SITE_URL` set to the same public origin; canonical links,
  `robots.txt`, `sitemap.xml`, Open Graph URLs, and structured data use it
- `EMAIL_FROM=Scripture Archive <no-reply@scripture-archive.com>`
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

The current public domain responded over HTTPS on 2026-10-25, but served the
previous build: `/account`, `/api/auth`, `/robots.txt`, and `/sitemap.xml` returned
404. This observation is not evidence that the new release has been deployed.

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
