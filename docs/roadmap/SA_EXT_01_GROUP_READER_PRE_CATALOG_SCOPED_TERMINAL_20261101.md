# SA-EXT-01 — GROUP_READER_PRE_CATALOG_FAILCLOSED — scoped source terminal (2026-11-01)

**Only this malformed group-reader route boundary is closed for source development. Parent SA-EXT-01 is OPEN.**

## Reproduced defect

On exact baseline `main@d3497a37f8cb511686ead50a1e806af1247c5331`, the canonical `renderReader` rejected malformed group suffixes only after `await getCatalog()`. Source-executed V8 probes of the real reader entry with `/reader/GEN/3/group` and a failing catalogue request reproduced **3/3** (uk/ru/en): one unnecessary catalogue call, no route-specific accessible `role="alert"`, and the previous `state.currentReader` remained in memory when the catalogue rejected. This is a source-level defect, **not** a proven production incident or a full pre-fix native CI RED.

## Canonical repair and readback

[Functional PR #1133](https://github.com/Oleksii-debug/scripture-archive/pull/1133) **SQUASH MERGED** at exact `main@d31eed5acd992f7b06cbd2fa5f36bfdebd565e74`, head `d22f3f7d346184a7878ebc8f7a95c66b2774c62c`, original base `d3497a37f8cb511686ead50a1e806af1247c5331`.

The existing group-route shape guard was **moved**, not duplicated, before the catalogue request in `public/app.js`. Invalid explicit group links now clear stale transient reader context and show the existing localized error/recovery UI without catalogue/attempt IO; saved reading progress is unchanged. Valid personal, group, pathname and legacy hash links still proceed through the same catalogue, attempt API, and reader. No new server, API, DB schema or publication.

Exact post-merge blobs:
- `public/app.js@abbd9c2a6220fa285d6c3c001a118d52b63d6b92`
- `tests/reader-group-pre-catalog.test.mjs@dc8a9b8e1ee84543dff816e6df35680507f3a8b7`
- `tests/reader-hash-query-route-boundary.test.mjs@570cf19cbef7a57de2b6469d6c1db991a5d1d928`

## Test evidence

[Exact-head GitHub Actions #41299335426](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41299335426) **COMPLETED SUCCESS** on `d22f3f7d346184a7878ebc8f7a95c66b2774c62c`: **4185 native Node PASS / 1 SKIP / 0 FAIL**, **37/37 disposable Worker/D1 PASS**, **2/2 Python PASS**, TypeScript, lint (**0 errors, 13 warnings**) and source build PASS. The new source-executed Node regression covers 30 malformed group cases and 12 valid personal/group cases across uk/ru/en and pathname/legacy hash, plus guard ordering. Independent candidate source-executed V8: **42/42** route cases PASS; separate hash/malformed-path probes **7/7** PASS. Neither isolated check is counted as a full native checkout.

## Remaining scope and safety

`remaining_scoped_implementation=0`; `necessary_unmerged_scoped_PRs=0` **only for GROUP_READER_PRE_CATALOG_FAILCLOSED**. SA-EXT-01, 02, 05, 06, 07 parent sections **OPEN**; SA-EXT-03/04 source-terminal. Draft [#325](https://github.com/Oleksii-debug/scripture-archive/pull/325) remains separate, diverged and unmerged (ahead 37, behind 792 at review); no ownership or branch overwrite.

Rights/editorial acceptance, real Chrome/Windows/physical NVDA, live Sites/D1/backup, installed SHA and release #689 remain **NOT_VERIFIED**. No production deployment/migration, 82-language rollout, payments, synthetic users, mass mailing or dating.
