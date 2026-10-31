# SA-EXT-16 — logout and password change response truth (two scoped terminals)

**Date:** 2026-10-31  
**Decision:** `LOGOUT_RECEIPT_TRUTH` and `PASSWORD_CHANGE_RECEIPT_TRUTH`: **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**. These are two small parts of **SA-EXT-16, whose parent remains OPEN**.

## Actual integrated application behavior

In the canonical `/account` page (`public/app.js`), logout and password rotation no longer call `finishAccountExit()` merely because a network response returned HTTP success. Each requires the existing `POST /api/auth?action=logout|change-password` response to contain the exact boolean `ok === true`. The canonical auth server only returns this envelope after the respective durable session revocation or acknowledged two-operation password-change D1 batch. Malformed HTTP-2xx receipts (missing body, null, empty object, `ok:false`, numeric `ok`, error envelope, array) instead preserve the principal and private local progress and show the existing localized error. A stale response cannot clear another signed-in principal. The ordinary confirmed success path is unchanged.

No additional identity store, independent endpoint, background worker, notification, migration or UI shell was introduced. This is the real current account dashboard, not a standalone demo.

## Exact evidence

- Implementation + regression [PR #931](https://github.com/Oleksii-debug/scripture-archive/pull/931) SQUASH MERGED to `main@752dc18d008e877dc54b16fdc0b22115054c9735`; merge status, final main source and test blobs independently read back after merge.
- Source `public/app.js@8887a0b7062e84f3bba3bff956e2ea443726bce5`; extended existing tests `tests/account-destructive-response-fence.test.mjs@eb0f9c7356de785b8b8f3643ccf3c332fb4a5792`.
- Exact-head GitHub Actions [#41189968502](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41189968502) **COMPLETED SUCCESS**. Native Node tests **3030 PASS, 0 FAIL, 1 SKIP**; disposable local Worker/D1 **22 PASS, 0 FAIL**; Python **2 PASS**; TypeScript, lint, source build all PASS.
- Before committing, exact-source isolated CodeMode/V8 controller checks reproduced **12** wrong local exits from malformed HTTP 200. Amended source passed **16/16** checks across true success, six malformed forms and a changed-principal case per action. The V8 harness is not Chrome, production D1 or physical NVDA.

## Final bounded development closure

`LOGOUT_RECEIPT_TRUTH.remaining_scoped_implementation=0`  
`PASSWORD_CHANGE_RECEIPT_TRUTH.remaining_scoped_implementation=0`  
`necessary_unmerged_scoped_feature_PRs=0`  
`CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`

**The full SA-EXT-16 parent remains OPEN**, including live Sites SHA, backup/retention and delivered-email obligations, production D1 migrations/cutover, physical NVDA/Windows and real end-to-end release acceptance. `PRODUCTION_DEPLOYED=NO`; `SITES_INSTALLED_SHA=NOT_VERIFIED`; `NVDA=NOT_VERIFIED`. Do not reimplement these two scoped behaviors without a concrete regression or new approved requirement.
