# SA-EXT-07 — ACADEMY_PERSISTED_ENVELOPE_INTEGRITY — scoped source acceptance (2026-11-02)

## Boundary and defect
The canonical Academy's local progress writer emits `{version:1,completed:[...]}`. Its importer already enforces an exact envelope, but `readAcademyProgress` previously accepted extra JSON properties (including `accountId`, `accessToken`, `updatedAt`, `__proto__` and import-only `format`) as if the private progress record had been verified. This is a source-level data-integrity mismatch, **not** a confirmed production leak or compromise.

## Reuse → repair → convergence
- Existing `public/scripture-academy.js::readAcademyProgress` now requires the exact own JSON keys `completed,version`; malformed local bytes are not overwritten or deleted.
- The existing Academy unavailable/read-only UI is reused: private progress controls/badges are withheld, a localized `role="alert"` is displayed, and source-validated public Bible reader links remain available.
- The other principal's saved markers and legitimate guest/account v1 records remain usable.
- Only `public/scripture-academy.js` and `tests/academy-progress-envelope.test.mjs` changed. No new server, DB, account, API, storage version, or migration.

## Exact GitHub evidence
- [Functional PR #1230](https://github.com/Oleksii-debug/scripture-archive/pull/1230) **SQUASH MERGED** to `main@97180ce88535800cae36870a74bbdbe36a7ff8c3`, qualified PR head `29b25df110794a821ae39eba2cdea90f4e1d8d9b`.
- Test-only commit `be9e3038d52edd919a189f7ea88a2766218dd423`; [CI #41503907856](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41503907856) **CANCELLED** by subsequent candidate push, **not** claimed as a completed RED test.
- [Exact-head CI #41503945400](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41503945400) **COMPLETED SUCCESS**: 4506 native Node PASS / 1 SKIP / 0 FAIL; 37/37 disposable Worker/D1 PASS; 2/2 Python validators PASS; TypeScript, lint and source build PASS. No local full-checkout PASS claimed.
- Functional source blob `ccc11bd174eee1dc9b4a320cba89f23bdc8b4b84`; test blob `20f08eb7d17ddfd248a31ea0e84c15bc916ffe0b`.

## Closure boundary and remaining work
`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **only for ACADEMY_PERSISTED_ENVELOPE_INTEGRITY**. Parent SA-EXT-01/02/05/06/07 remain **OPEN**, SA-EXT-03/04 source-terminal. SA-EXT-07 still needs the approved wider courses/media/transcripts/author-review, rights/editorial acceptance, actual browser/keyboard/physical NVDA validation, and release/live Sites/D1 evidence. These are **NOT_VERIFIED**.

No new release, production migration, 82-language expansion, payment, synthetic users, mass email, dating, secrets or real-user mutation.
