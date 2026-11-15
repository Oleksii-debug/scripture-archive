# SA-EXT-07 — Academy stale queued reset record — scoped source acceptance

Date: 2026-11-03 (Europe/Bratislava). Scope: **one bounded source-level race only**. Parent SA-EXT-07 remains OPEN.

## Defect and repair

The Academy reset used a principal-scoped Web Lock and an exact post-delete readback, but a reset queued behind that lock could erase progress created or updated in another tab **after** the reset was confirmed. This is a source-level destructive race, not evidence of a production incident.

Reuse the existing `public/scripture-academy.js` reset, key, confirmation, exclusive Web Lock, readback, error announcement, single-flight guard, and focus restoration. At click, capture the raw persisted record. Inside the acquired lock, compare the raw record to that snapshot before `removeItem`. If changed or initially unreadable, refuse the deletion, retain confirmation and display the existing localized uncertainty status. No new API, D1 schema, service or storage authority.

## Evidence

- Code/test PR: https://github.com/Oleksii-debug/scripture-archive/pull/1245 — **SQUASH MERGED**, main SHA `01a24dbc51ac9e9ecd73a8075da7e13d09fd9c26`; tested head `8b9861f6197e03f126081bd9b375ccc5aa1b5448`.
- Exact-head GitHub Actions: https://github.com/Oleksii-debug/scripture-archive/actions/runs/41548270079 — **COMPLETED SUCCESS**, 4553 native Node PASS, 1 SKIP, 0 FAIL; 37/37 disposable Worker/D1 PASS; 2/2 canonical Python PASS; TS/lint/build PASS (13 pre-existing lint warnings, 0 errors).
- Regression: queued reset must not delete a newer existing record or a record created after an initially empty snapshot; initial denied storage read must not queue a lock. Existing successful reset, principal isolation, rejected-lock retry, readback failure and accessible statuses remain in the native suite.
- Changed files: `public/scripture-academy.js`, `tests/academy-local-recovery.test.mjs`. Open draft #325 and #1199 do not touch either path.

## Limits / remaining work

`remaining_scoped_implementation=0` only for this race. **SA-EXT-01, 02, 05, 06, 07 OPEN; 03/04 source-terminal.** The full Academy course/media/transcript/editorial scope, independent publication rights, physical Windows/Chrome/NVDA, live Sites/D1/backup and final release remain NOT_VERIFIED. Full native local checkout unavailable; tests ran on the exact PR head in GitHub Actions. No production migration, release, 82-language rollout, payments, synthetic users, bulk mail, dating or secrets.
