# Scripture Archive web release

This release originates from the canonical website commit
`f8eba649ba404b9751e22bd45773a0fa0c06f122` and is deployed through the
existing project declared in `.openai/hosting.json`.

## Required production bindings

- D1 binding: `DB`
- `APP_BASE_URL=https://scripture-archive.com`
- `EMAIL_FROM=Scripture Archive <no-reply@scripture-archive.com>`
- secret `EMAIL_API_KEY` for the Resend API
- optional `NEXT_PUBLIC_GA4_ID` after the owner creates or selects a GA4 property

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
