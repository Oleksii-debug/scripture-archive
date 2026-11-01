# SA-EXT-01 — READER_BOOKMARK_AFTER_PROVENANCE — scoped source terminal (2026-11-01)

## Finding

The canonical `renderReader` fetched and checked chapter text but wrote `state.reader` and `localStorage["sa.reader"]` **before** validating the selected edition's publisher/licence with `localEditionMetadata` and `editionDetails`. If the edition attribution was missing or invalid, the reader could fail to display the new chapter while silently replacing the last readable bookmark. This is a source-level integrity finding, **not a confirmed production incident**.

## Minimal repair and integration

[PR #1141](https://github.com/Oleksii-debug/scripture-archive/pull/1141) **SQUASH MERGED** to `main@06783acdcf663cc96e68ccd38bba50c031b5b4f3`, exact feature head `4b250286503421af497239c2efd548cb31bb2c35`. Reordered the **existing** metadata admission before bookmark mutation; no new service, API, DB, edition, translation or source text. Exactly three changed paths:
- `public/app.js` blob `74fa131307eac6f580a4f37798225a2509e211d4`.
- `tests/reader-bookmark-provenance-order.test.mjs` blob `44b653fee37bbd86305e27ae4e6fc83a4b3e1bd1`: source-executed negative missing rights/details for uk/ru/en, positive authorized save and verse focus, storage-denied in-memory recovery.
- `tests/reader-deeplink.test.mjs` blob `6f6163c0d0f48c1c5233f62b69c7af0b7e533ce4`: preserve existing real reader deep-link/save checks after the new ordering by supplying explicit test-only publisher metadata stubs.

## Native verification

Initial exact-head [CI #41308240693](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41308240693) **FAILED** with 2 old extracted-harness regressions (`localEditionMetadata` undefined; old test sliced the reader before the moved save). The production code was not weakened; both test harnesses were adapted to exercise the actual new boundary. Repaired exact-head [CI #41308355856](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41308355856) **COMPLETED SUCCESS**: 4221 native Node PASS / 1 SKIP / 0 FAIL, 37/37 disposable Worker/D1 PASS, 2/2 Python PASS; TypeScript/lint/build PASS (13 lint warnings, 0 errors). Exact merged source/test blobs and main SHA were read back.

`remaining_scoped_implementation=0` and `necessary_unmerged_scoped_PRs=0` **only for READER_BOOKMARK_AFTER_PROVENANCE**. Parent SA-EXT-01/02/05/06/07 **OPEN**, 03/04 source-terminal. Rights/editorial, actual Chrome/Windows/physical NVDA, installed Sites/D1/backup and release #689 **NOT_VERIFIED**. Draft #325 not rewritten. No new release, 82-language rollout, production migration, payments, synthetic users, mass email or dating.
