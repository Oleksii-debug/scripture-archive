# SA-EXT-05 / DOSSIER_FILTERED_RESULT_LINK_ROUNDTRIP — terminal source receipt

**Date:** 2026-10-30  
**Decision:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` for this exact scope only.  
**Parent SA-EXT-05 and all SA-EXT-01…20 remain OPEN.**

## Canonical user-facing feature
The existing accessible dossier GET search indexes the source-validated Scripture graph. Previously, a filtered `/dossiers?q=Moses` result linked to `/dossiers?id=moses`, silently dropping the active search filter and result count on navigation. The canonical `public/scripture-dossiers.js` now generates URL-encoded `id+q` links, HTML-escapes the URL query delimiter and preserves the original no-filter deep link. UK/RU/EN, Cyrillic search, text-first keyboard GET form, original cited witnesses, source-vs-interpretation labels, stable IDs, graph validation and fail-closed unknown/mismatched dossiers remain in the existing product.

## Exact execution and integration proof
- Actual source/test PR [#706](https://github.com/Oleksii-debug/scripture-archive/pull/706) **squash merged** into `main@9696a0fb75b0d92678a5cb1a2add96387d4a4bdf`.
- Exact qualified PR HEAD: `732fd2f323b973cfd9c6ccb6603c7041cd89a092`.
- Main production module blob: `public/scripture-dossiers.js@4e00606d4dd07f5bb86d12eadb741a31a888eb3e`.
- Main source-executing tests blob: `tests/dossier-search.test.mjs@bf0b82077168b1ea3a91fa2fa7d6d17b9c0f67c1`.
- [GitHub Actions #41058258952](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41058258952): **SUCCESS**, Node **1,830 passed / 0 failed / 1 skipped**, disposable Worker/D1 **22/22 passed**, TypeScript/lint/source build passed, Python **2 passed**. Latest PR and both blobs read back from merged `main`.
- New negative/positive regression checks preserve `q` across the actual GET navigation, encode Cyrillic safely, keep `&amp;` escaped for HTML, retain selected dossier `aria-current` and maintain original direct links with no query.

## Terminal limit
`remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` only for `DOSSIER_FILTERED_RESULT_LINK_ROUNDTRIP`. Do not implement this completed functionality anew without a demonstrated regression/new requirement. The full SA-EXT-05 dossier scope and other 19 parent sections are **not** certified. Actual production Sites installed SHA, browser/Windows/physical NVDA and live acceptance remain NOT_VERIFIED; no deploy, migrations, personal-data writes or translation-rights changes. Central issue [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).
