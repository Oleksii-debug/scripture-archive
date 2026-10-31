# SA-EXT-16 — account deletion response receipt truth (scoped terminal)

**Date:** 2026-10-31  
**Decision:** **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** for the *client-side confirmation of completed account deletion only*. Parent **SA-EXT-16 remains OPEN**.

## Integrated functionality

The real `/account` deletion form in canonical `public/app.js` now accepts the account deletion as completed only when the existing `POST /api/auth?action=delete-account` returns a parsed response with `ok === true`. That is the canonical server's success envelope **after** its 20-statement D1 batch has been acknowledged. HTTP 200 with an empty, missing, null, false, numeric or error envelope must **not** clear the current principal's local state/progress or silently imply an erased account; the existing localised error is exposed in the form's live status. Valid success, account changes during the request, route replacement and other non-destructive handlers retain their existing behavior. No new account API, state store, identity authority or production deployment.

## Exact GitHub evidence

- Implemented + tested in [PR #929](https://github.com/Oleksii-debug/scripture-archive/pull/929), **SQUASH MERGED** into `main@83883a5e7c6ac21c7db45acad4054012c5212c83`. Merge status and exact new source/test blobs independently read back from `main`.
- Source: `public/app.js@1e17420f238f092b6c3789227d80bd146ff0d4b2`.
- Existing test suite extended: `tests/account-destructive-response-fence.test.mjs@8f2d9cf1a34a8f6d67b241b64550853603edd2b6`; seven malformed-success bodies and one late cross-principal result, in addition to existing confirmed-success, detached-control and session tests.
- [Exact PR-head Actions #41189568243](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41189568243) **COMPLETED SUCCESS**: Node **3014 PASS / 0 FAIL / 1 SKIP**, disposable Worker/D1 **22 PASS / 0 FAIL**, Python **2 PASS**, TypeScript, lint and build **PASS**. Job and every named step inspected after completion.
- Pre-patch standalone V8 execution against the exact `public/app.js` source reproduced six false deletions on malformed 2xx receipts; amended source passed **9/9** isolated controller checks, including valid `{ok:true}` and replaced principal. Isolated V8 tests are *not* Chrome or physical NVDA verification.

## Final scoped development decision and limits

`remaining_scoped_implementation=0`  
`necessary_unmerged_scoped_feature_PRs=0`  
`CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`

Do not reimplement this narrow behavior absent a new approved requirement or reproducible defect. **SA-EXT-16 remains OPEN** for full privacy/data-retention policy, backup and delivered-email treatment, hosted Site/production D1 qualification, account-deletion end-to-end live acceptance and physical Windows/NVDA. `SITES_INSTALLED_SHA=NOT_VERIFIED`; `WINDOWS_NVDA=NOT_VERIFIED`; `PRODUCTION_DEPLOYED=NO`. No real user account was deleted in these checks.
