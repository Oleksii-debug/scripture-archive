# SA-EXT-07 — ACADEMY_RESET_WEBLOCK_SINGLE_FLIGHT — scoped source terminal (2026-11-02)

**Status: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL for this one reset-concurrency defect only. SA-EXT-07 parent remains OPEN.** SA-EXT-01/02/05/06 also remain OPEN; SA-EXT-03/04 are source-terminal.

## Source defect and canonical repair

The existing account-scoped Academy clear-markers action disabled its button while waiting for an exclusive Web Lock, but lacked a handler-level pending guard. Repeated queued/programmatic activations could schedule more than one reset callback for one confirmed user intent; a delayed callback could remove progress written after the first reset. This is a source-level race, **not** evidence of a live data-loss incident.

The existing `public/scripture-academy.js` reset handler now uses a per-view `resetPending` guard, set before requesting the existing `sa-academy-progress:<principal>` Web Lock and cleared on synchronous, successful, rejected, or throwing completion. It reuses the already-approved single-flight/focus-restoration approach from lesson updates. No additional storage authority, route, service, database, migration, or release.

## Evidence

- [Functional PR #1242](https://github.com/Oleksii-debug/scripture-archive/pull/1242): **SQUASH MERGED** into `main@6e010d8db2c388126ef8e60621d745cbc483c1d9`; exact tested PR head `e4f080909f7eac13b7e24539e2f89b4492ca71b8`.
- [Exact-head CI #41539838856](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41539838856): **COMPLETED SUCCESS**. Native Node 4539 PASS / 1 SKIP / 0 FAIL; TypeScript, lint (13 warnings, 0 errors), build PASS; disposable Worker/D1 37/37 PASS; Python validators 2/2 PASS.
- Two focused tests in `tests/academy-local-recovery.test.mjs`: duplicate reset while lock is queued admits only one request and does not erase subsequently saved markers; rejected lock permits an explicit retry. Existing account isolation, confirmation, stale view, storage uncertainty and recovery tests remain in the suite.
- Post-merge readback: `public/scripture-academy.js` blob `13804223711d12077c4cf5a830e83c74a9db1f13`; `tests/academy-local-recovery.test.mjs` blob `5bc4dfa42c9afd3c5bdac02fa402fb1df11af825`.

## Closure boundary and remaining work

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **only for ACADEMY_RESET_WEBLOCK_SINGLE_FLIGHT**. The full Academy still requires approved courses/media/transcripts/author-review and separate end-to-end acceptance. Publisher rights, editorial review, physical Windows/Chrome/NVDA, live Sites/D1, backup and deployed SHA are **NOT_VERIFIED**. No full native local checkout was available; the cited green results are from GitHub Actions, not a claimed local run.

No new release, production migration, 82-language rollout, payments, synthetic users, mass email, dating service or secret publication was performed.
