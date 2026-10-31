# SA-EXT-05 / PUBLISHED_RANGE_READER_BOUNDARY — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

Date: 2026-10-31. This closes **only** the canonical dossier search range-limit defect; it does not close parent SA-EXT-05 or the entire Scripture Archive release.

## Requirement and verified implementation

The existing `public/scripture-dossiers.js::searchScriptureDossiers` can locate published references by pasted verse range. Its former overlap predicate accepted `GEN 12:1-257` and `GEN 17:15-999` even though the canonical Bible reader rejects ranges beyond 256 verses per chapter. The fix rejects requested chapters over 200 and first/last verses over 256 before matching the same canonical source graph. Reversed ranges already failed closed and remain unchanged. No second corpus, route, grade authority, unsafe fallback, external references or fabricated text was added.

- Source: `public/scripture-dossiers.js`; merged blob `f826679962599b9bd7b1eafa016066f5eb6e16e0`.
- Test: `tests/dossier-range-reader-limit.test.mjs`; merged blob `d1eec9d6be0806f9fb60020d3d26a5974f5147bc`.
- Regressions: 36 negative uk/ru/en source-range inputs; 12 positive valid/canonical-range inputs; two GET UI/reader-navigation assertions (50 total tests).
- Integration: [PR #948](https://github.com/Oleksii-debug/scripture-archive/pull/948) SQUASH MERGED as `6f4d07d6e8f6538591b5c70f9462b2b4c1c16245`, independently read back from `main` with matching production/test blobs.

## Executed evidence and truthful boundaries

- [GitHub Actions run #41194389898](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41194389898), exact PR head `59cfded91031227ff84ea1cd91988c301f9ef5c8`: completed **SUCCESS**, all 16 job steps succeeded.
- Native Node: **3236 PASS, 0 FAIL, 1 SKIP** (3237 tests); TypeScript, ESLint, build: PASS.
- Disposable Worker/D1: **22 PASS, 0 FAIL**; Python validators: PASS (2 tests).
- PR `merged=true`, feature SHA present in `main` as read back after merge; no remaining required unmerged source PR **for this exact defect**.
- Did **not** claim production Sites SHA/current code, physical NVDA, Windows package, external edition rights clearance, 20-section completion or a release. No site deployment was triggered.

## Final scope decision

`SA-EXT-05/PUBLISHED_RANGE_READER_BOUNDARY = CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.

`remaining_scoped_implementation=0`; `necessary_unmerged_scoped_feature_PRs=0`.

`SA-EXT-05 parent = OPEN`; future source/rights/provenance and whole-product E2E remain separate. Reopen only for a newly reproducible defect or an explicitly approved new scope.
