# SA-EXT-05/06/07 — Witness link accessible names — scoped terminal receipt

Date: 2026-10-31. **Status: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** for the two precise linked accessibility defects only. The full approved SA-EXT-05, SA-EXT-06, SA-EXT-07 remain OPEN.

## Defect and implementation

The existing canonical /academy and /dossiers + /atlas displayed narrative/interpretive source provenance in adjacent static text after each /reader anchor. Their explicit aria-label omitted the evidence kind. For a screen reader's links list, the link accessible name therefore lost that distinction. The approved source kind itself and the visible text were correct and have not been rewritten.

1. **Academy (#915):** source PR [#915](https://github.com/Oleksii-debug/scripture-archive/pull/915) SQUASH MERGED as c1e52bdf104b145eb54973f6f19d2a79e6667f46 from tested head eb672acbd75c4bb34e2416666ae04e8c827396f5. Existing public/scripture-academy.js blob 5f409933fcfac05f902463bc30fd72818c94316b; regression tests/academy-source-kind-classification.test.mjs blob 0d3a18085c2869d15084b39ede03068b96dedf7e. The exact source.kind classification is now in every reader link aria-label across all 13 existing lessons, uk/ru/en; routes, visible content, account-scoped progress and read-only state are preserved.

2. **Dossiers and Atlas (#916):** source PR [#916](https://github.com/Oleksii-debug/scripture-archive/pull/916) SQUASH MERGED as f6e521b8007bcb77d7cd72a47d6308ad1c4f6489 from tested head e107b65049a1763510bd03bd9436b959793fdb84. Existing public/scripture-dossiers.js blob e76f04aca7782941259325733748c3c892575286; new tests/dossier-witness-link-accessible-names.test.mjs blob 9d2fed260cb6ca484f76ff26fa0c90e3d98656bc. Exact canonical kind wording is in the link aria-label for every dossier and text-atlas citation. Regression enumerates 17 canonical dossiers and 17 relation witnesses in uk/ru/en plus total atlas source count, malformed catalogue refusal, unsupported-language fallback.

## Actual exact-head CI

- [#915 GitHub Actions #41185252266](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41185252266): completed/success, actual job 124490760758, 16 successful steps. Native Node 2978 PASS / 0 FAIL / 1 SKIP; disposable Worker/D1 22 PASS; Python 2 PASS; TS contracts, lint and source build PASS.
- [#916 GitHub Actions #41185337198](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41185337198): completed/success, job 124491009916. Native Node 2981 PASS / 0 FAIL / 1 SKIP; Worker/D1 22 PASS; Python 2 PASS; TS, lint and source build PASS.
- Both feature PRs were independently re-read as merged=true/closed. Exact final feature main at evidence collection: f6e521b8007bcb77d7cd72a47d6308ad1c4f6489.

## Final scope boundary

remaining_scoped_implementation=0; necessary_unmerged_feature_PRs=0. Do not redevelop these accepted patches without a new concrete regression or owner requirement. **Full parents 05/06/07 remain OPEN**: research evidence/source rights, geography, licensed independent sources, expanded academic curriculum and actual physical NVDA acceptance are not done. Other parent statuses: SA-EXT-03/04 TERMINAL; 01/02/08–20 OPEN.

No production deployment, site update, Windows package, user data mutation, email, payments or scheduled community operation took place. Current installed Sites version/production D1 privacy cutover (issue #689) and real Chrome/Windows/NVDA verification remain NOT_VERIFIED; no fabricated acceptance. Coordination #297/#78.
