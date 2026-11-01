# SA-EXT-01 — PARALLEL_CHAPTER_CONTAINER_OWN_DATA — scoped acceptance (2026-11-01)

**Status:** CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL **only for this chapter-container and chapter-index admission boundary**. Parent SA-EXT-01 is **OPEN**; SA-EXT-02/05/06/07 OPEN; SA-EXT-03/04 source-terminal.

## Defect and bounded repair

The canonical `public/parallel-reader.js` read `data.chapters[chapter-1]` after the two attempt guards. An own getter for `chapters` or a chapter index could execute arbitrary code or return a forged/unstable chapter; an inherited array slot could be accepted as edition Scripture even though the previously merged verse-slot guard (#1155) only validates the selected verse array. This is a **source-level defect**, not evidence of a production compromise.

Reuse the existing `mountParallelReader`, `getBook`, attempt checks, edition rights validation, accessible failure and retry. Read `chapters` and the selected chapter through own data descriptors without executing accessors. Reject dynamic containers/slots; missing chapters remain unavailable. No alternate service, API, database, schema or publication.

## Exact integration evidence

- Functional [PR #1167](https://github.com/Oleksii-debug/scripture-archive/pull/1167): **SQUASH MERGED** into `main@940caf93bb4c243fc2eb6523ea020f21bd767e3d`. Exact qualified PR head `225e2c430a63c6ffb77aa59b1617f39636550276`, original base `357a409f38661cf42da4971ca0e0fc786f475cc8`.
- Source blob `public/parallel-reader.js@a0ce2f574eabf1a3dda0f919322eb6d454d609e8`; new test blob `tests/parallel-reader-chapter-descriptors.test.mjs@420c2c6e0ccff7c75e0ad9739416cdb0c2fb04a7`. Only these two paths changed.
- [exact-head CI #41348461287](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41348461287): **COMPLETED SUCCESS** on the exact PR head: **4308 native Node PASS / 1 SKIP / 0 FAIL** (six new test groups), TypeScript PASS, ESLint **0 errors / 13 warnings**, source build PASS, **37/37 disposable Worker/D1 PASS**, **2/2 existing Python validators PASS**.
- New tests exercise own/inherited getter-backed chapter containers and slots (no getter execution), uk/ru/en, positive JSON-like and null-prototype records, retry and recovery. Isolated Node 22 descriptor reproduction passed four predicate assertions; **it is not** an independent whole-repository test.
- Source and test blobs read back from merged `main`. The full native checkout was not available locally; the executed GitHub Actions suite is the native test evidence.

## Remaining work and restrictions

`remaining_scoped_implementation=0`; `necessary_unmerged_scoped_PRs=0` **only for this exact source boundary**. Parent SA-EXT-01 and other open parents require separately evidenced acceptance. Independent publisher rights/editorial review, real Windows/Chrome/NVDA keyboard acceptance, installed Sites/D1 and backup/restore, and release qualification are **NOT_VERIFIED**.

No 82-language rollout, new release, production migration, payment, synthetic user, mass email, dating service, or secret publication was performed. The overlapping stale draft #325 was not modified.
