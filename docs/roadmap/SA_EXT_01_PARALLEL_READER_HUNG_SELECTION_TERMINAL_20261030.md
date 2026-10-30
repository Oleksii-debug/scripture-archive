# SA-EXT-01 — PARALLEL_READER_HUNG_REQUEST_SELECTION_RECOVERY — TERMINAL (scoped)

**2026-10-30. CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.** Only this narrow post-integration defect is closed; the full parent SA-EXT-01 and all twenty SA-EXT-01–20 parents remain **OPEN**.

## Reproduction and repair

- Baseline canonical production module `public/parallel-reader.js`, original blob `93138ac651166c0ebd80167713d720a4289f656a`: an edition A `getBook` that never settles kept submit disabled even after native selection to edition B. Actual-source isolated V8 observed calls `["a"]`, unable to load B (RED).
- Real code reused the canonical reader, not a second reader. Edition selection retires the previous request UI lease and old citation metadata; current request generation guards async initial/final authorization, reading, retry copy, busy button and keyboard focus. Stale requests cannot overwrite B or unlock an in-flight B. Preserve existing licensed per-verse citations from a concurrent worker and original provenance/rights.
- Feature PR [#698](https://github.com/Oleksii-debug/scripture-archive/pull/698) **SQUASH MERGED** exact `main@ae57e4d0f8a56e0fc3cedb8ee8827309a235b98c`.
- Independently fetched merged-main blobs: `public/parallel-reader.js@9f999bcdad9069e4073bce4495b8e59c828b48be`; `tests/parallel-reader-hung-selection-recovery.test.mjs@e1efe3f5b9f15b2b2af96fc230f514e2b0ea975c`.
- Existing selection/rights/focus/citation tests preserved. Targeted scenarios cover stuck A/B retry, late success/failure, A→B→A, concurrent B, delayed authentication guards, unsignalled selection, three locales, licence rejection, stale focus.
- **Exact source-head GitHub Actions [#41057817607](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41057817607) SUCCESS**, head `c11476b40fa243f349dce52d9eee5e53cb78a375`: native Node **1824 PASS, 0 FAIL, 1 SKIP**; TS, ESLint and source build PASS; disposable Worker/D1 **22/22 PASS**; canonical Python validators **2/2 PASS**. Earlier red runs #41057123551 and #41057408523 were addressed before the successful final run; do not count them as green.
- Verified postmerge GitHub readback: PR merged=true and its exact merge SHA equals the then-current main; code and test blob SHAs match as above.

## Final bounded disposition

`section_id=SA-EXT-01`; `subfeature=PARALLEL_READER_HUNG_REQUEST_SELECTION_RECOVERY`; `status=CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0`.

**Not claimed:** full parent SA-EXT-01 closure, other 19 parent closures, live https://scripture-archive.com installed SHA, production D1/Cloudflare, licensed translation matrix, physical Windows/NVDA, actual Chrome keyboard acceptance, release deployment. No customer data, host settings, emails, payment or production were changed. Reopen this narrow repair only on a new reproducible defect or explicitly approved requirement. Coordination [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297) and [#78](https://github.com/Oleksii-debug/scripture-archive/issues/78).
