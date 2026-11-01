# SA-EXT-01 — MALFORMED_CHAPTER_PRE_CATALOG — scoped source closure (2026-11-01)

**Status: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL for this one route-ordering defect only.** Parent SA-EXT-01 remains **OPEN**, as do SA-EXT-02/05/06/07; SA-EXT-03/04 are already source-terminal. No claim of release, rights, production, browser, or physical NVDA acceptance.

## Source defect and correction

The canonical `public/app.js::renderReader` already rejected explicit malformed chapter coordinates (for example `/reader/GEN/abc`, `/reader/GEN/0`, `/reader/GEN/01`, `/reader/GEN/1e2`), but the guard ran **after** `await getCatalog()`. A catalogue outage therefore masked the deterministic invalid-route error, and the earlier transient reader could survive until outer-route failure handling. This was independent of catalogue data and did not require another API or service.

Moved the **existing** guard before `getCatalog()`, preserving its exact positive-integer/safe-integer validation, the existing accessible `role="alert"` with recovery link, valid chapters, legacy hash links, saved-reader recovery, and high-chapter clamping. Malformed routes retire only `state.currentReader`; saved `state.reader` is untouched. No API, D1 schema, user data, or production changes.

## Exact source and CI evidence

- Functional [PR #1136](https://github.com/Oleksii-debug/scripture-archive/pull/1136) **SQUASH MERGED** into `main@c4626a8cc247ba5a61e04c83bda78c7428ea1978`. PR head `1f15594e59d72fc2def6b8afaa7dc953fd2f73a0`.
- [Exact-head GitHub Actions #41303325090](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41303325090) **COMPLETED SUCCESS**: native Node **4206 PASS / 1 SKIP / 0 FAIL**; disposable Worker/D1 **37/37 PASS**; Python **2/2 PASS**; TypeScript, lint, and build PASS. The job log and GitHub PR SHA were read back. These are CI results, **not** local full-checkout or physical NVDA claims.
- `tests/reader-chapter-pre-catalog.test.mjs` exercises the actual canonical reader entry in Ukrainian, Russian, and English, for pathname and legacy-hash routes, including malformed chapter with unavailable catalogue, no catalogue calls, accessible alert, unchanged persisted reading, valid chapter, high-chapter clamping, and saved-reader recovery. The source-order assertion requires chapter guard before catalogue and chapter-attempt IO.
- Existing `tests/reader-explicit-malformed-chapter.test.mjs` remains in the native regression suite.

## Remaining work and governance

`remaining_scoped_implementation=0` and `necessary_unmerged_scoped_PRs=0` **only for MALFORMED_CHAPTER_PRE_CATALOG**. Broader SA-EXT-01 still requires verified licensed editions/provenance, reader/parallel comparison acceptance, full keyboard/Chrome/Windows/NVDA and human source review. Other SA-EXT parents remain OPEN. Exact installed Sites SHA, live D1/backup, release #689, rights and editorial acceptance are **NOT_VERIFIED**. No 82-language rollout, release, production migration, payments, synthetic users, mass email or dating activation.
