# SA-EXT-05 — FILTERED_DOSSIER_COMPARISON_GET_CONTINUITY — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Date:** 2026-10-31. **Status applies only to this bounded subfunction, not to parent SA-EXT-05 or the full product.**

## Implemented, canonical and connected

The existing public `/dossiers` GET form in `public/scripture-dossiers.js::dossierMarkup` now preserves the active, bounded, escaped `q` search when comparing published Bible dossier source ranges. The same form continues to submit `id` and `compare`; no filter is transmitted in the unfiltered legacy view. The comparison remains on the actual canonical workspace route and uses the already validated source catalogue; it adds no second server, data source, generated biblical quotations or unverified historical assertions.

## Integration evidence

- Functional PR [#933](https://github.com/Oleksii-debug/scripture-archive/pull/933): **SQUASH MERGED**.
- Exact feature integration: `main@88d630663097e939673103cc3ada4c498503d22f`.
- Source `public/scripture-dossiers.js` blob `93de63ac417d1ec8361fabd5b559284a355cf4a2`.
- Regression `tests/dossier-filtered-comparison.test.mjs` blob `7a7f0259f17c783d7ffe0e3c5721d40104195d77`.
- Reproduced by executing both source versions against the actual approved catalogue in isolated V8: original 1/6 PASS (five filtered comparisons lose `q`), corrected 6/6 PASS.
- Exact PR-head Actions [#41190160528](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41190160528): **SUCCESS**. Native Node **3073 PASS / 0 FAIL / 1 SKIP**; disposable Worker/D1 **22 PASS / 0 FAIL**; Python **2 PASS**; TypeScript, lint and build **PASS**.
- Initial regression-file escaping error was detected in failing run [#41190028326](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41190028326), corrected before the successful run and feature merge. Do not represent the failed run as passing.

## Closure contract

**РОЗДІЛ SA-EXT-05 / підфункція FILTERED_DOSSIER_COMPARISON_GET_CONTINUITY — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ.**

- `remaining_scoped_implementation=0`.
- `necessary_unmerged_scoped_feature_PRs=0`.
- Original source authority and keyboard-native GET route remain unchanged.
- Do not reimplement without a new requirement or independently reproduced defect.

**Parent SA-EXT-05 remains OPEN.** Complete source-verified dossier/graph catalogue, external rights and approved broader research obligations remain outstanding. This technical receipt does not verify the public Sites deployment SHA, physical Windows/NVDA, browser acceptance, real production D1 or publication. **No deployment or release update was performed.** Separate Accessible Chess PGN/CBH concerns do not belong to this Scripture Archive subfunction.
