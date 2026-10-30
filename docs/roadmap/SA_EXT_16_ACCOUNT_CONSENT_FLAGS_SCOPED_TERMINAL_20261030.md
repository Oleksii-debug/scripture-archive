# SA-EXT-16 / CANONICAL_ACCOUNT_CONSENT_FLAG_TRUTH — source closure

Date: 2026-10-30. **РОЗДІЛ SA-EXT-16 — ЗАКРИТО лише підфункцію `CANONICAL_ACCOUNT_CONSENT_FLAG_TRUTH`**. State: `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. This is **not** completion of the full SA-EXT-16 parent or the 20-section program.

The canonical authenticated account read path in `app/api/account/route.ts` previously mapped corrupt SQLite rows such as `sensitive_consent=2` or text `"1"` to user-facing explicit `sensitiveConsent=true` via JavaScript truthiness. Corrupt public church flags were also exposed as positive visibility even when their value was not exactly the approved integer 1. This undermined the strict, versioned privacy contract despite the separately hardened read-only release snapshot preflight.

**Shipped repair:** the existing `publicUser()` response now requires strict numerical `sensitive_consent === 1`, `sensitive_consent_version === 1` and `public_church === 1` before reporting explicit consent or public church visibility. Valid consent v1 remains functional; there is no new account route, database, user migration or change to the private church text itself. Source-executing `tests/account-get-action-failclosed.test.mjs` covers 12 valid, malformed and cross-combination values with one-principal D1 read and `no-store, private` responses.

- Functional [PR #755](https://github.com/Oleksii-debug/scripture-archive/pull/755) squash merged to exact `main@6cb3db442498cc11c21df7eeddd69f526745d5dd`.
- Merged production blob `app/api/account/route.ts@306169079f6c0f5b5b8aaa46746192638865c539` and merged regression blob `tests/account-get-action-failclosed.test.mjs@7ead6db4992dcd96b45d5babe597b19b5794030e`, independently read back on main.
- Actual exact PR-head [GitHub Actions #41066697871](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41066697871) for `c59e39e302aed1b86636c4b2c8513dd813046e91`: **COMPLETED SUCCESS**, Node **2159 PASS / 0 FAIL / 1 SKIP**, disposable Worker/D1 **22/22 PASS**, Python **2/2 PASS**, TypeScript/lint/build PASS.
- `remaining_scoped_implementation=0`, `necessary_unmerged_prs=0` for this specifically named source defect.

**Independent gates remain open:** parent SA-EXT-16 and all SA-EXT-01…20 are still OPEN. The installed Sites SHA, live D1 consent/migration ledger and backup/write-freeze, real-browser and Windows/NVDA validation, email/SMTP and final production release are NOT_VERIFIED. Production [issue #689](https://github.com/Oleksii-debug/scripture-archive/issues/689) and coordination [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297) remain open. No deployment was performed or authorized by this technical change. Do not redo the scoped source work without a new concrete reproduced failure.
