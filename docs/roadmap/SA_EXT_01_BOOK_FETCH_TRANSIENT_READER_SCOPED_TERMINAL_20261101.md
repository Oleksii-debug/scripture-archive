# SA-EXT-01 — failed Bible fetch transient reader context (scoped acceptance, 2026-11-01)

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL for this exact source defect only.** SA-EXT-01/02/05/06/07 parent sections remain **OPEN**; 03/04 source-terminal.

## Verified source defect and repair

The canonical `renderReader` already preserved the last readable `state.reader` and `sa.reader` on a failed `getBook` and ignored stale requests. However, when the current chapter fetch failed, the catch rethrew without retiring `state.currentReader`. A failed chapter could therefore remain the transient identity observed by cross-tab attempt invalidation even after the outer route displayed its accessible error. This is a source-level defect, **not** a confirmed production incident.

Reused the existing `getBook` catch in `public/app.js`: only after `readerStillCurrent()` confirms the failing request still owns the reader, clear `state.currentReader` and rethrow the original error. A stale failure cannot clear a newer context. No parallel reader/service, API, D1 schema, data migration or release.

## Exact merged evidence

- [Functional PR #1146](https://github.com/Oleksii-debug/scripture-archive/pull/1146) **SQUASH MERGED**, PR head `f9f180b01c1a170e31071e4fce45dee76e3c16ea`, integrated `main@143d63e29fcff9b1b4f235c0c1d1dda6be494c3a`, read back.
- Merged source blob `public/app.js@a3eb75b6fc54d98dfee5c2dccf5412bfa43e8af9`; test blob `tests/reader-deeplink.test.mjs@527f27b09e03d52b1cdf180898690ddece76758e`.
- [Exact PR-head Actions #41313441739](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41313441739): **COMPLETED SUCCESS** — native Node **4229 PASS / 0 FAIL / 1 SKIP**, disposable Worker/D1 **37 PASS / 0 FAIL**, canonical Python **2 PASS**, TypeScript/lint/build **SUCCESS**.
- Existing actual-source uk/ru/en deep-link regression now verifies failed fetch retires transient reader without touching last bookmark/storage, and a successful retry owns a fresh reader and saves the requested chapter. This is CI execution of the native repository, not a claim of local full checkout or physical NVDA.

## Remaining work and non-claims

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **only for this failed-fetch transient lease defect**. SA-EXT-01 still requires corpus/edition rights, editorial acceptance, real browser/Windows/NVDA, installed Sites/D1/backup and release evidence; SA-EXT-02/05/06/07 retain separate open requirements. No parent TERMINAL, production deployment, 82-language rollout, payments, synthetic users, mass mail or dating service.
