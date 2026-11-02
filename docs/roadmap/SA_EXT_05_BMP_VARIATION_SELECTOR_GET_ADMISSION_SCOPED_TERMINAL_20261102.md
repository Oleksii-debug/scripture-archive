# SA-EXT-05 — BMP_VARIATION_SELECTOR_GET_ADMISSION — scoped source acceptance (2026-11-02)

## Decision
**CLOSED_FOR_DEVELOPMENT_SCOPED / source terminal only** for the native GET query admission mismatch. **SA-EXT-05 parent OPEN**, along with SA-EXT-01/02/06/07; SA-EXT-03/04 source-terminal. No full product or live deployment acceptance.

## Reproduced mismatch
The canonical `public/scripture-dossiers.js::validDossierSearchQuery` rejected supplementary Unicode variation selectors U+E0100–U+E01EF but omitted BMP U+FE00–U+FE0F, even though the source graph's `safeVisibleText` rejected both. An invisible selector in `q` could be admitted and echoed into a GET search control instead of failing closed. An isolated Node predicate check showed old admission of 16/16 BMP selectors and new rejection of 16/16; this is **not** a whole-product or production test.

## Reused implementation
One existing GET admission regex was repaired. Both the existing dossier and atlas routes now return localized `role="alert"` without form, dossier or reader links for invalid `q`. No new service, API, D1 schema, publisher claims or Bible content. A new native test covers 16 selectors × uk/ru/en and positive/recovery for `GEN 12` and blank search.

## Exact evidence
- [PR #1227](https://github.com/Oleksii-debug/scripture-archive/pull/1227) **SQUASH MERGED**, exact qualified head `161124a9dbd0710ded555990e7de26d8e75b99d7`, functional main merge `aa585400ce42b5cfbc8ecccbb3b154c3fead006c`.
- [Exact-head GitHub Actions #41494540928](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41494540928) **COMPLETED SUCCESS**: 4499 native Node PASS / 1 SKIP / 0 FAIL; 37/37 disposable Worker/D1 PASS; 2/2 Python PASS; TypeScript/lint/build PASS (13 lint warnings, 0 errors).
- Test-only commit `9645514ee585d33b9483a522b053263639576392` Actions #41494387921 was **CANCELLED** by later push, not a completed RED run.
- Changed files: `public/scripture-dossiers.js` and `tests/dossier-search-bmp-variation-selectors.test.mjs`; exact merge verified by readback.

## Scope and remaining work
`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **only for this BMP GET admission defect**. Parent SA-EXT-05 remains OPEN for approved dossiers, editorial rights, real browser/NVDA, external verification, and live Sites/D1/release evidence. SA-EXT-01/02/06/07 also OPEN; 03/04 source-terminal. Independent rights-holder approval, editorial acceptance, physical Windows/Chrome/NVDA, deployed SHA, backup/restore and production Sites/D1 **NOT_VERIFIED**. No 82-language expansion, production migration, new release, payments, synthetic users, bulk email, dating or secret disclosure.
