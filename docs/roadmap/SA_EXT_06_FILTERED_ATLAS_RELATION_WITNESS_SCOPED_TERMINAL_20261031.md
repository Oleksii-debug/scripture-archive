# SA-EXT-06 — filtered atlas relation-only witness continuity — scoped source terminal (2026-10-31)

**Status:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` **only for this reproduced source bug**. The full parent **SA-EXT-06 remains OPEN**, as do SA-EXT-01/02/05/07. SA-EXT-03/04 remain source TERMINAL. No production release.

## Source defect and narrow repair

The canonical `searchScriptureDossiers()` correctly matched a dossier by its *related-edge Bible citation*, even when the related target dossier did not match the GET filter. But `dossierAtlasMarkup()` then hid that published relation witness because it required both source and target to be inside the filtered result set. Examples from the actual published catalogue: `EXO 1:6` → Joseph (related target Exodus); `ACT 2:14` → Peter (Jerusalem); `RUT 1:19` → Ruth (Bethlehem). The filter displayed a valid result without its decisive relation source.

Reuse the canonical `public/scripture-dossiers.js`: show each approved relationship citation of the visible source dossier. An out-of-filter related target remains *plain accessible text*, not a cross-filter dossier link, preserving the existing strict result-link boundary. Source reader citations remain native links. No additional source, date, map, provenance, database, server or translation was introduced.

## Reproduction and verification

- Exact pre-fix `main@00156fed0cd46cb71e58cafc32604e74a09162e2` with real `public/data/catalog.json`: isolated source-executed V8 with a narrow URLSearchParams shim showed missing relation section for **9/9** cases (three relation-only citations × uk/ru/en). This is a **RED reproduction**, not native Node/Chromium/Worker.
- Patched source: same **9/9 GREEN**, existing filtered-link safety spot checks **3/3 PASS**, unfiltered atlas **3/3 byte-identical** in V8. The initially proposed out-of-filter target link was rejected during review and changed to plain text before integration, preserving existing regression expectations.
- New `tests/atlas-filtered-edge-witnesses.test.mjs`: nine native Node cases plus negative/no-match, corrupted catalogue, unfiltered recovery and keyboard-native link assertions.
- [Feature PR #1005](https://github.com/Oleksii-debug/scripture-archive/pull/1005) **SQUASH MERGED** to exact `main@acf25561d2eb72c821fc94e4a3ca6c07a1313934`.
- Exact final PR head `c1e27c378cbbce19d059fe0aee5e04daf058368d`; [GitHub Actions #41236089156](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41236089156) **COMPLETED SUCCESS**, native Node, TypeScript, lint, build, disposable Worker/D1, Python validators all successful.
- Exact merged source blob `public/scripture-dossiers.js@fa1c62fac9255286907cd9e3d3c4e0e5f2be1974`; regression blob `tests/atlas-filtered-edge-witnesses.test.mjs@98e5c70e51678cd4ed10844756340983b67d3710`. `remaining_scoped_implementation=0`; `necessary_unmerged_scoped_feature_PRs=0` for this repair only.

## Outstanding parent and release gates

SA-EXT-06 still requires rights-qualified geographic/map sources, scholarly/editorial acceptance, fully accessible map alternatives, real browser/keyboard/physical NVDA checks, verified installed Cloudflare Sites SHA/D1, independent backup/restore and release approval. SA-EXT-01/02/05/07 remain OPEN for their broader approved requirements. No production migration, deployment, user-data change, 82-language rollout, payment, synthetic users, mass mail or dating service. Source/disposable CI is **not** live release acceptance.
