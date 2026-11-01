# SA-EXT-01 — PARALLEL_VERSE_OWN_DATA_SNAPSHOT — scoped source terminal (2026-11-01)

**Status: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL only for this one verified source-level defect. Parent SA-EXT-01 remains OPEN.** This does not certify the whole approved reader/editions/rights/NVDA acceptance.

## Defect and bounded repair

The canonical `public/parallel-reader.js::mountParallelReader` validated each `verses[i]` but re-read the same mutable/imported array when creating HTML and a citation snapshot. An own JavaScript getter could supply an approved-looking string during admission and a different string at display; a sparse array with a prototype-provided verse index could display text not owned by the imported chapter. This is source-level input-integrity evidence, **not a proven production incident**. It is distinct from publisher-rights accessors fixed in PR #1152.

The canonical reader now inspects `Object.getOwnPropertyDescriptor(verses,String(i))` for every index, requires an **own data descriptor** with a nonblank bounded string, rejects accessors/inherited/sparse records without invoking them, and builds one verified string snapshot. Both the displayed verses and clipboard citation use that snapshot. Existing chapter size/character bounds, two attempt guards, publisher-rights checks, accessible failure/retry, locale and navigation remain unchanged. No new service, API or DB authority was created.

## Exact GitHub integration and test evidence

- Baseline `main@40fd3f3380f60ad5a0412655cfe516dbcf536a88`.
- Test-first negative/positive commit `70a0eaf7e7fdb690d45f2920a1b0453002ca7d7b` (no native baseline CI claimed). Isolated Node 22 reproduction showed old loop accepting getter/inherited verse records; separate isolated descriptor predicate passed 8 negative cases and 1 stable snapshot case. These are **not** whole-product qualification.
- Functional [PR #1155](https://github.com/Oleksii-debug/scripture-archive/pull/1155), tested head `282b75162d1ec58ce59c29316117f80adcd12123`, **SQUASH MERGED** `main@f9909f664a72f88505896c517b2a46b00ca51062`.
- Source blob `public/parallel-reader.js@a6eef07521a550d0c1d193a13c86a377f87ce644`; regression blob `tests/parallel-reader.test.mjs@3fd35ae1623cbd46291eb2c9667f1d8c0ae60970`; exact main readback confirmed both.
- [Exact-head GitHub Actions #41327911606](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41327911606): **COMPLETED SUCCESS**. Native Node: **4274 PASS, 1 SKIP, 0 FAIL**. TypeScript contracts PASS; lint **0 errors, 13 warnings**; source build PASS; disposable Worker/D1 **37 PASS, 0 FAIL**; Python **2 PASS**. This is source/disposable integration, not production/physical accessibility evidence.
- Regression includes getter invocation count 0, inherited-index rejection, no verse HTML or clipboard disclosure on refusal, retry enabled, both existing chapter guards, and a positive stable citation after the source array is mutated.

## Remaining work and boundaries

`remaining_scoped_implementation=0` and `necessary_unmerged_scoped_PRs=0` **only for PARALLEL_VERSE_OWN_DATA_SNAPSHOT**. Parent SA-EXT-01, SA-EXT-02, SA-EXT-05, SA-EXT-06, SA-EXT-07 remain **OPEN**; SA-EXT-03/04 are source-terminal. Editorial approval, actual rights to publish texts, physical Windows/Chrome/NVDA, live Sites/D1/backup and release readiness remain **NOT_VERIFIED**. Broad stale draft PR #325 overlaps file names but is not an authority for this scoped fix and was not modified.

No production release, production migrations, 82-language expansion, payments, synthetic users, mass email, dating, or secrets publication.
