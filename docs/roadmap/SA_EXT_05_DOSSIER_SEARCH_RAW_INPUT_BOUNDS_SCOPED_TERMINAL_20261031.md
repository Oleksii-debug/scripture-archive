# SA-EXT-05 — DOSSIER_SEARCH_RAW_INPUT_BOUNDS — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

Date: 2026-10-31. Scope: **only** the exact raw GET search length-bound repair, **not** parent SA-EXT-05 or SA-EXT-06.

## Completed production functionality
The canonical public dossier search function `searchScriptureDossiers()` now rejects any raw `q` longer than 120 UTF-16 units **before** NFC normalization and whitespace trimming. The existing `dossierMarkup()` applies the same original-length policy as the integrated `dossierAtlasMarkup()`, and reports a localized accessible `role="alert"` instead of showing a truncated/false matching page. Existing exact book, chapter, verse/range search, native dossier/atlas links and uk/ru/en content are unchanged. Source `public/scripture-dossiers.js`; committed regressions `tests/dossier-search-raw-length-boundary.test.mjs`. No parallel service, migration, dataset, external images or deployment.

## Proven baseline
Old canonical source blob `fa1c62fac9255286907cd9e3d3c4e0e5f2be1974`: executed in isolated V8 with 156-character padded `joseph` and 157-character padded `EXO 1:6`, both incorrectly returned Joseph despite 120-unit input cap. Bounded source `GEN 17:15` returned Abraham/Sarah. This is a source-level input-policy bypass, **not a proven production exploit**.

## Integrated code and verification
- Source PR [#1009](https://github.com/Oleksii-debug/scripture-archive/pull/1009) SQUASH MERGED, feature `main@1062114cf5b0d6c7d28211e8d00599aed0c370e7`. Exact PR head `fabeb185cd396190c1e048d41d1d1924f0cb2b4c`; production source blob before merger `10036abce8d3a67cd060f1e4fede1a47043c86ad`.
- Exact-head Actions [#41237877271](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41237877271) completed **SUCCESS**, with native Node **3,546 PASS, 0 FAIL**, disposable Worker/D1 **24 PASS, 0 FAIL**, Python **2 PASS**, TypeScript, lint (warnings only), build all successful. These are source/disposable tests, not live acceptance.
- Independent isolated V8 actual patched source + canonical public catalog: **97/97 PASS, 0 FAIL** covering 3 locales, 120-length boundary, oversized space padding, positive canonical citations, malformed ranges and atlas semantics. V8 is **not** Chrome, physical NVDA, or native Node.
- `remaining_scoped_implementation=0`; `necessary_unmerged_scoped_feature_PRs=0`; **РОЗДІЛ №SA-EXT-05 / DOSSIER_SEARCH_RAW_INPUT_BOUNDS — ЗАКРИТО (SCOPED) / CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**. Repeat development of this narrow functionality is prohibited absent a new requirement or a concrete reproduced regression.

## Explicit outstanding broader obligations
**SA-EXT-05 parent OPEN**; also SA-EXT-01/02/06/07 parents OPEN. SA-EXT-03/04 source TERMINAL. Required rights/editorial/scientific review, full parent scope, deployed Cloudflare Sites current SHA and production D1, authenticated browser/keyboard, Windows and physical NVDA, backup/restore and independent full-release acceptance are **NOT_VERIFIED**. This document neither deploys code nor closes an entire parent section. Related controls [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297), [#78](https://github.com/Oleksii-debug/scripture-archive/issues/78), release [#689](https://github.com/Oleksii-debug/scripture-archive/issues/689).
