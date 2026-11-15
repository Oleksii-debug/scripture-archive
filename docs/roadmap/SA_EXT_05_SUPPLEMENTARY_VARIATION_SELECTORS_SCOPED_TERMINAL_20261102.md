# SA-EXT-05 — supplementary variation-selector source labels (scoped source acceptance, 2026-11-02)

## Exact boundary and defect
The canonical dossier/atlas validator rejected BMP variation selectors U+FE00–U+FE0F, but accepted supplementary variation selectors U+E0100–U+E01EF (Unicode Mn). An invisible modifier could therefore enter a publisher book title, authored dossier name/summary/prompt or native GET search query, causing ambiguous visible or NVDA source labels. Isolated Node 22 reproduced acceptance of U+E0100 in the original source regex. This is a source-level defect, not a claim of a live exploit.

## Repair and native evidence
- Reused `public/scripture-dossiers.js` and its existing `safeVisibleText` and `validDossierSearchQuery` guards; added the supplementary range in both, without new server, DB, routes, translation catalogue or rights authority.
- Expanded `tests/dossier-provenance-unicode-controls.test.mjs` to test U+E0100 and U+E01EF in three languages, book titles and authored dossier fields, both dossier and atlas UIs, and native GET search. Negative paths show localized `role="alert"` and no source links; the canonical catalogue remains accepted.
- Functional [PR #1222](https://github.com/Oleksii-debug/scripture-archive/pull/1222) **SQUASH MERGED** into `main@77f0be6903fbd5e723e688fe559cbcc5c8bb84f0`; exact PR head `42352eeb824012910e8b73f04f9cbbb17331d9c2`.
- [Exact-head Actions #41475148169](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41475148169) **COMPLETED SUCCESS**: 4487 native Node PASS / 1 SKIP / 0 FAIL; 37/37 disposable Worker/D1 PASS; 2/2 Python PASS; TypeScript, lint and source build PASS (13 lint warnings, 0 errors). Full local checkout was unavailable; these native results are GitHub Actions results, not local or physical NVDA results.
- Exact post-merge `main` readback: source blob `bea9892270ec50f6ca0e4ebd6817d73e0e5c54a8`, test blob `588ff5643f2a0366c94b104a076568bf5886326d`.

## Scope / remaining work
`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **only for supplementary variation-selector admission**. Parent **SA-EXT-01/02/05/06/07 remain OPEN**; SA-EXT-03/04 remain source-terminal. Full rights and editorial approval, physical Windows/Chrome/NVDA, live Sites/D1, backup and release acceptance remain **NOT_VERIFIED**. No 82-language rollout, new release, production migration, payments, synthetic users, mass mail, dating service or secrets were deployed.
