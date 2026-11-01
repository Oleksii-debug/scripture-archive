# SA-EXT-01 — LEGACY_HASH_QUERY_READER_PATH — scoped acceptance (2026-11-01)

**Status:** CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL **only for this input-boundary defect**. Parent SA-EXT-01 remains OPEN; SA-EXT-02/05/06/07 OPEN; SA-EXT-03/04 already source-terminal. This is not a product release or whole-section acceptance.

## Actual source defect and repair

The canonical `routeSourceFromLocation` removed the query from legacy `#/reader/BOOK/CHAPTER?...` coordinates, but `renderReader` independently inspected the unstripped hash for `//`. A valid legacy reader link with an otherwise ignored URL-valued query, e.g. `/#/reader/GEN/3?verse=16&source=https://example.invalid/a/b`, was incorrectly rejected as if the path contained an empty coordinate. This is a source-level reproducible navigation error, **not** a claimed production incident.

[PR #1126](https://github.com/Oleksii-debug/scripture-archive/pull/1126) **SQUASH MERGED** `main@c140f064c032b8ffb126ef0bd476df9a6423f765`. Canonical `public/app.js` source blob `6afc336f57ce2ce3809410014dcc540d7c0cbaa8` now strips the legacy query before checking actual empty path segments, consistent with the existing route resolver. Regression `tests/reader-hash-query-route-boundary.test.mjs` blob `a2b338f6906f8516ed81914881194f77918931d2` checks ordinary/legacy links, URL-valued query strings, real empty book/chapter/group segments, accessible `role=alert`, and non-mutation of the previous in-memory reader on valid input.

## Verification and recovery

- First candidate `36ca28b38ab281e0d850a4621c4d7a31d37caeb2`: [Actions #41290566872](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41290566872) **FAIL**. Extracted legacy test harnesses did not provide the newly referenced imported helper. The failure was not misreported as PASS.
- Repaired exact PR head `90f49f7ad7a79d07fe7a5d8787f2d342f1628b2d`: [Actions #41290663525](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41290663525) **COMPLETED SUCCESS** — 4146 native Node PASS / 1 SKIP / 0 FAIL, TypeScript, lint, source build, 37/37 disposable Worker/D1 PASS, 2/2 canonical Python PASS.
- After squash merge, exact `main` SHA, production source blob and regression blob were independently read back from GitHub. No full native local checkout, live Sites/D1 or physical Windows/NVDA was claimed.

**Remaining approved parent work:** rights and provenance for actual editions; broader licensed Bible translations and parallel-reader acceptance; search/bookmark and full keyboard/NVDA/browser verification; editorial/source review; live deployment, backups, and release qualification. `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` apply **only** to the fixed query/path boundary.

**Excluded:** no 82-language rollout, release publication, production migration, payment, synthetic users, mass mail, dating service, or secrets.
