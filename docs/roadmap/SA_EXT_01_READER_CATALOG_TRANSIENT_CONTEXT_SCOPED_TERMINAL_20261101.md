# SA-EXT-01 / CATALOG_PENDING_TRANSIENT_READER_LEASE — scoped source terminal (2026-11-01)

## Scope and reproduced source defect

The canonical primary Bible reader previously retained the preceding `state.currentReader` transient lease while awaiting `getCatalog()`. A pending or rejected catalogue request could therefore leave a stale chapter context available to cross-tab attempt invalidation even while the outer router was handling the loading/error state. This is a source-level lifecycle finding, **not a verified production incident**.

The minimal repair reuses `public/app.js::renderReader`: retire only the previous transient `state.currentReader` immediately before the catalogue await, after malformed-route validation. The last verified `state.reader` / `sa.reader` bookmark is not modified. A new chapter context is still established through the existing catalogue/attempt/book/rights flow; no second reader, API, D1 table or service is introduced.

## Exact integration and evidence

- Functional [PR #1149](https://github.com/Oleksii-debug/scripture-archive/pull/1149) **SQUASH MERGED** at `main@313eed6faaead2e728797e7e14280de207474071`, exact tested feature head `4d261f8f844995335d483d3fbe21b450f965ab64`.
- Read-back merged blobs: `public/app.js@062d4df2695a14c894c196cfb33825c37eeaad9e`; `tests/reader-catalog-transient-context.test.mjs@b14bcbe7ceb3b6a34bcbddb91642f83add8afa1a`; `tests/reader-hash-query-route-boundary.test.mjs@d86cbd37da417ecc0f6810314b564d76373cac3c`.
- Test-first branch commit `25e2e2a571a4e90b48028d61a240cfd020961696` added 13 source-executing Node cases: pending/rejected catalogue, stale route, changed principal across Ukrainian/Russian/English, and malformed URL with accessible `role="alert"`. Its hosted baseline run was **cancelled** after subsequent commits; **no baseline RED CI claim**.
- Initial repaired [CI #41318022507](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41318022507) **FAILURE**: 4261 Node PASS / 1 FAIL / 1 SKIP, because the pre-existing legacy-hash test expected the old transient lease to survive a valid new reader URL. Its URL/alert assertions remained valid. The test expectation was updated to assert the stronger lease-retirement invariant, without removing route coverage.
- Exact-head [CI #41318145607](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41318145607) **COMPLETED SUCCESS**: 4262 native Node PASS / 0 FAIL / 1 SKIP; TypeScript, lint and build PASS; 37/37 disposable local Worker/D1 PASS; 2/2 existing Python validators PASS.
- `main` source/test readback after merge confirms the above blobs and merge SHA. No local full native checkout, physical browser/NVDA or live Sites/D1 acceptance is inferred from CI.

## Closure boundary

**`CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` for `CATALOG_PENDING_TRANSIENT_READER_LEASE` only.** `remaining_scoped_implementation=0`; `necessary_unmerged_scoped_PRs=0`.

Parent **SA-EXT-01, 02, 05, 06, 07 remain OPEN**. SA-EXT-03/04 remain source-terminal. Parent SA-EXT-01 still needs verified publication rights and editorial acceptance, actual Windows/Chrome/NVDA keyboard testing, installed Sites/D1 and backup evidence, full end-to-end acceptance and release authorization. No production deploy/migration, 82-language rollout, payments, synthetic users, mass email or dating launch was performed.
