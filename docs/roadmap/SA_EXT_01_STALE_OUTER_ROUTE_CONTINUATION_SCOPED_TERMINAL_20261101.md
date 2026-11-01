# SA-EXT-01 — STALE_OUTER_ROUTE_CONTINUATION — scoped terminal receipt (2026-11-01)

**Status: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL for this exact outer-router continuation only. SA-EXT-01 parent remains OPEN.** This is a source/CI integration receipt, not production, release, browser or physical NVDA acceptance.

## Real defect and minimal repair

The existing `public/app.js` `route()` awaited an older reader navigation and could then apply stale metadata, focus/scroll and analytics to a newer page. If the obsolete reader request rejected, its catch could replace the newer page with an unrelated retry error. The existing `renderReader` invocation fence protected the inner reader but did not protect the outer route's post-await continuation.

[Functional PR #1120](https://github.com/Oleksii-debug/scripture-archive/pull/1120) **SQUASH MERGED** at exact `main@58e4c1675bfae09949b5b842ed014dfe26494718`. The canonical router now uses a transient, non-enumerable navigation token and checks it before post-render side effects and error UI. The current route still exposes the existing accessible `role=alert` and native retry; no second router, API or database.

**Exact merged blobs (read back from main):**
- `public/app.js@0a33e42ca89b3ea04ea468773fb19f1687c9bbfb`
- `tests/reader-route-stale-continuation.test.mjs@03f9746be99324ebd6716f5f8f6c2f490f1fe868`
- `tests/reader-cache.test.mjs@a2f0939e7901b1f45d55b86c8cf7d971f535b71b`

## Verification

[Exact-head GitHub Actions #41282589015](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41282589015): **COMPLETED SUCCESS** on `1423b1f64267319811859a58f30cee40bfa5539f`. Native Node: **4110 PASS / 1 SKIP / 0 FAIL**, including nine actual-source route tests across Ukrainian, Russian and English (late rejected old request, late successful old request, current failure/retry). TypeScript, lint (13 warnings, 0 errors), build: PASS. Disposable Worker/D1: **37 PASS / 0 FAIL**. Existing Python validators: **2 PASS**.

The initial candidate CI [#41282480600](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41282480600) **FAILED**: 4101 Node PASS / 1 FAIL / 1 SKIP because the existing `reader-cache.test.mjs` extracted the catch body with a regex requiring `console.error` to be the first statement. The test was updated to admit the new stale-route guard while continuing to test the unchanged current-error recovery UI; all nine new route tests had already passed. The final exact-head CI is green. No local full native checkout or independent physical NVDA test is claimed.

## Remaining work and exclusions

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **only for STALE_OUTER_ROUTE_CONTINUATION**. SA-EXT-01, 02, 05, 06, 07 parents **OPEN**; 03/04 already source-terminal. The draft convergence [#325](https://github.com/Oleksii-debug/scripture-archive/pull/325) was inspected and not rewritten or merged. Rights and editorial acceptance, real Chrome/Windows/NVDA, installed Sites/D1/backup and release #689 remain **NOT_VERIFIED**.

No production deploy or migration, 82-language expansion, payments, synthetic users, bulk mail, dating product or secrets changed.
