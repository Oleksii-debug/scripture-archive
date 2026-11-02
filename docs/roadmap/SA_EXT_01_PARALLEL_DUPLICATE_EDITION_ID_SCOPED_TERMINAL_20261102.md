# SA-EXT-01 — PARALLEL_DUPLICATE_EDITION_IDENTITY — scoped development terminal (2026-11-02)

## Exact source scope

Only the canonical parallel-reader's **duplicate edition ID ambiguity** is closed for development, **not SA-EXT-01 as a parent**. A comparison selector formerly displayed two different edition titles with the same HTML option value, while submission used the first matching ID. Imported local publisher/content identities could therefore diverge from the user's visible choice. A changed manifest without a DOM `change` event could leave previously licensed text visible until a later submit.

The existing `public/parallel-reader.js` now counts **only own-data edition IDs** in the bounded edition list; duplicate IDs are excluded from the selector and refused before chapter guards or `getBook`. Empty IDs are refused as well. An invalid programmatic selection uses the existing accessible failure status and retires stale verse/citation content. Unique, valid own-data and null-prototype records continue to work. No second reader, service, API, database, migration or content rewrite was introduced.

## Exact integration and evidence

- [PR #1177](https://github.com/Oleksii-debug/scripture-archive/pull/1177): **SQUASH MERGED** to `main@854b3b2f78f5a2d23a152b31352ff59975966c81`. Qualified PR HEAD: `c5af9139ad2ef6f7d6e6fcca26da8a67b9698b01`.
- Exact main source blob `public/parallel-reader.js`: `c2c9b4b2f7d8558a251082f972d5c3f5905ff14d`.
- Exact main regression blob `tests/parallel-reader-duplicate-identity.test.mjs`: `e68099eb9856e1061b0c445b1c6bc55f642c4617`.
- [Exact-head GitHub Actions #41369127756](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41369127756): **COMPLETED SUCCESS**, 4349 native Node PASS / 1 SKIP / 0 FAIL; 37/37 disposable Worker/D1 PASS; 2/2 canonical Python PASS; TypeScript, lint and source build PASS. Lint warnings are nonfatal. Six new regression groups cover uk/ru/en, duplicate order, nonlocal duplicate, stale-result retirement, valid unique/null-prototype recovery, blank IDs and accessor non-execution.
- Earlier test-only run [#41369096759](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41369096759) was **CANCELLED** after the head changed; it is **not** represented as a reproduced RED CI run.
- Post-merge source and test blobs were read back from `main`; the post-merge CI and the documentation PR have their own separate gates.

## Remaining work and exclusions

`remaining_scoped_implementation=0` and `necessary_unmerged_scoped_PRs=0` apply **only** to `PARALLEL_DUPLICATE_EDITION_IDENTITY`. SA-EXT-01, 02, 05, 06, 07 parent sections remain **OPEN**; SA-EXT-03/04 are source-terminal. The older conflicting draft [PR #325](https://github.com/Oleksii-debug/scripture-archive/pull/325) was not modified.

Rights and editorial acceptance for additional editions, full reader/search/mission coverage, real keyboard/Chrome/Windows/NVDA acceptance, live Sites/D1 and backup/release qualification are **NOT VERIFIED** by this source-only repair. No new release, production migration, 82-language launch, payments, synthetic users, bulk mail, dating or secret publication was performed.
