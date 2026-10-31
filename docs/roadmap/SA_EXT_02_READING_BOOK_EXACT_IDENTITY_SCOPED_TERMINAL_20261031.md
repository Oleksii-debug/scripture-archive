# SA-EXT-02 — exact book key in private reading receipts: scoped source-terminal

**31 October 2026. Status: `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` for this single source defect only.** The full parent SA-EXT-02 remains **OPEN** for the broader approved mission, memory, difficulty, editorial content, and release scope.

## Actual canonical behavior now

- Before the repair, `PUT /api/account?action=reading` normalized untrusted `r.book` using `clean(r.book,4)` before validating it. Noncanonical input `" GEN "`, `"GEN\n"`, or `"1CO "` silently mapped to existing stored catalog identifiers, potentially acknowledging the wrong reading receipt.
- The existing canonical `app/api/account/route.ts` now rejects these aliases and overlong/blank book keys before any D1 write. The existing code continues to validate catalog membership and chapter bounds against authentic local edition data. Intentional user-authored title trimming is preserved. No alternative reader, account authority or data store was introduced.
- The real transpiled account-route regression `tests/account-reading-canonical-chapters.test.mjs` now includes negative malformed mixed batches (HTTP 400, zero D1 writes) and positive `GEN`, `1CO`, `JOL` examples (HTTP 200, one D1 write).

## Exact completed integration

- Feature [PR #870](https://github.com/Oleksii-debug/scripture-archive/pull/870) **SQUASH MERGED** into GitHub `main@75e453a13beb27a2b89c3725b24feff46db52bc8`.
- Exact PR HEAD `ae167c3ba741c5199528cc223fe44341fa722425`. Verified merged main source blob `c703b5f52df6b583db33c21ef5c650ccbf34342f`; test blob `edcef3a25d9527cf08823d275ffd8676de134e98`.
- [Exact-head executed GitHub Actions #41174459535](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41174459535) **completed SUCCESS**: native Node **2677 pass, 0 fail, 1 skipped** out of 2678; TypeScript `tsc --noEmit`, lint, build succeeded; disposable real local Worker/D1 **22 pass, 0 fail**; canonical Python validation **2 passed**. Job `124459017494` shows actual completed steps, not queued or synthetic CI.
- `remaining_scoped_implementation=0`; `necessary_unmerged_feature_PRs_for_this_defect=0`.
- **No production deployment** or live Sites SHA/browser/NVDA/Windows verification is asserted. These obligations do not undo this narrow source-terminal repair. All other approved parent-section work stays independently OPEN.

This exact feature requires no further repeated development without a newly reproduced concrete defect or a newly approved requirement.
