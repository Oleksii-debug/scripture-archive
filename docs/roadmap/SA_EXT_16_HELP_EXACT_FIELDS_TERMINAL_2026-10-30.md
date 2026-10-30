# Scripture Archive — SA-EXT-16 / HELP_RAW_FIELD_TRUNCATION — scoped terminal

**Date:** 2026-10-30

**Closure:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` for this exact defect only.

- `remaining_scoped_implementation=0`
- `necessary_unmerged_PRs=0` for this defect
- All full parent sections `SA-EXT-01…20`, including `SA-EXT-16`, remain **OPEN**.
- Owner coordination: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).

## Reproduced defect

In the canonical support submission endpoint `app/api/help/route.ts`, the original source blob
`f8341b24030e4630b306e604dd504b9a3f5ed35d` normalized untrusted email,
subject and message with `trim().slice(0,limit)` **before validation**.
An address with exactly 254 characters plus a suffix was silently shortened to a
different syntactically valid address. A 161-character subject and 6001-character
message likewise had authored content silently removed. Email delivery and durable
record could therefore refer to altered user-supplied data.

## Actual implementation and main integration

- [PR #616](https://github.com/Oleksii-debug/scripture-archive/pull/616) **SQUASH MERGED**;
  feature `main@e6889d77e832f3f2c6fb3ba9ebbcb4ac63ed880b`.
- Canonical route blob in merged `main`:
  `dbb4b6bc1b8b56a3817902d81d89253a33fa03bd`.
- Native Node regression test `tests/help-exact-fields.test.mjs` blob:
  `f78dc4a95aaf86c0b47567cc44913bda2ef536f3`.
- Rejected overlong email/subject/message **before** D1 persistence/email;
  exact-limit legitimate payloads remain untruncated, ordinary whitespace trim
  preserved. Unchanged: origin check, auth/rate-limiter, file attachment policy,
  DB receipt gate, mail-delivery acknowledgment, supported UK/RU/EN locales.
- No separate server, parallel support inbox, migrations, real email or deployment.

## Exact-head validation truth

- [Actions 41037040019](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41037040019)
  on the exact PR head `165bd8587235dda83484ce71fae1b80883979511`:
  **Node 1419 PASS / 0 FAIL**, including six new native Help route regression tests.
  TypeScript, lint, and build **PASS**.
- **Overall workflow FAIL**: disposable local Wrangler Worker/D1 integration
  **21/22 PASS, 1 FAIL** twice on unrelated `tests/api-flow.test.mjs`.
  Error text in actual job log:
  `Your worker restarted mid-request. Please try sending the request again.`,
  HTTP 503; cross-origin guard expected 403 on the first attempt, and a
  separate stateful POST on the second. Existing runner repair [#361](https://github.com/Oleksii-debug/scripture-archive/pull/361)
  is merged but does not eliminate intermittent local-proxy restarts.
  Python steps in this failing run were **SKIPPED**, not PASS.
- **Not verified:** live Sites SHA, physical Windows/NVDA, real browser,
  production D1, email transport/recipient delivery, end-to-end privacy audit,
  parent SA-EXT-16 acceptance.

No source redevelopments for this exact defect without a new reproduced regression
or approved requirement. The full platform and all 20 parent sections remain open.
