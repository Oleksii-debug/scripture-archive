# SA-EXT-01 — case-insensitive reader verse focus: scoped terminal receipt (2026-11-01)

**Status:** CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL **only for** `READER_CASE_INSENSITIVE_ALIAS_VERSE_FOCUS`. The parent SA-EXT-01 remains OPEN.

## Reproduced defect and repair

The canonical reader already accepted `/reader/jhn/3` and `/reader/JhN/3` as John chapter 3, but the verse-focus coordinate check required byte-identical `parts[1] === meta.code`. Consequently, `?verse=16` did not focus the selected verse on lowercase/mixed-case links. Original exact source `public/app.js@2e8ad9bcf19332c979c389a3831b033d3b4550a0` returned true for `JHN`, false for `jhn` and `JhN`.

The canonical `renderReader` now requires a string book path segment and compares its case-normalized value to the **already resolved** catalog code, preserving exact chapter equality. The original `readerVerseFromUrl` still checks the verse range and ambiguous query parameters. The existing deep-link test was updated to source-execute the production guard: 3 valid aliases and 11 wrong-book, wrong-chapter or wrong-type negatives PASS in isolated V8. This is source/UI correctness, not actual physical NVDA acceptance.

## Exact integration evidence

- Functional [PR #1108](https://github.com/Oleksii-debug/scripture-archive/pull/1108): **SQUASH MERGED** `main@950b3d3152a338105acd0c36e3eb274be8a470cd`.
- `public/app.js` source blob `684f6d10131532ed6b1fc86b03bbfc3a2c81fc87`.
- `tests/reader-deeplink-validation.test.mjs` regression blob `f5cbff26d875027aa27fc2d42a6aae61aab6146e`.
- Exact PR-head [Actions #41266838341](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41266838341) **COMPLETED SUCCESS** on `b1d2f9d762b780e9c0e59711dece0d7717b29d2b`: native Node 4033 PASS / 1 SKIP / 0 FAIL, disposable Worker/D1 37 PASS, Python 2 PASS, TypeScript/lint/build PASS (13 lint warnings, 0 errors).

## Remaining work

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0` **only for this focus boundary**. The broader SA-EXT-01/02/05/06/07 parents remain OPEN; 03/04 source-terminal. Publisher-rights and editorial review, actual Chrome/Windows/physical NVDA, deployed Sites/D1/backup and release #689 remain NOT_VERIFIED. Historical draft #325 remains divergent and unmergeable, without any rewrite of its broader lineage. No production deploy, migration, 82-language launch, payments, synthetic users, bulk mail or dating.
