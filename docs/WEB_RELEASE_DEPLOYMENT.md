# Scripture Archive web release

This release originates from the canonical website commit
`f8eba649ba404b9751e22bd45773a0fa0c06f122` and is deployed through the
existing project declared in `.openai/hosting.json`.

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
both properties exist.
