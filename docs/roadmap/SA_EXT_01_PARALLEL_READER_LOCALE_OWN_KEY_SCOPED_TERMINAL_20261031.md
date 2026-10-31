# SA-EXT-01 / PARALLEL_READER_LOCALE_OWN_KEY — scoped source closure

**Date:** 2026-10-31  
**Scope status:** **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**  
**Parent section SA-EXT-01:** **OPEN** — licensed biblical edition coverage and provenance remain outstanding. This is not a 20-section or product release receipt.

## Actual completed implementation
- Reused the existing canonical `public/parallel-reader.js` and its actual form/live-status mount. No duplicate reader or new state authority.
- Both control rendering and mounted event announcements now use a type-aware, own-key check, with `uk` fallback for unsupported, non-string, and inherited object property names such as `__proto__`, `constructor`, `toString`.
- Original `uk`, `ru`, `en` translations, escaped edition labels and existing chapter/rights gates are preserved.
- Committed **15 native Node regression scenarios** in `tests/parallel-reader-locale-own-key.test.mjs`.

## Exact integration/readback
- Production PR: [#890](https://github.com/Oleksii-debug/scripture-archive/pull/890) — **SQUASH MERGED**.
- Integrated feature `main`: `f1da62ad911d00fd72f93b8e27060888e4c22044`.
- PR exact tested head: `0d5b9934a82725719a970b24fd0ddf51362699ca`.
- Production file: `public/parallel-reader.js`; Git blob `565e28d3d80b31a57c3b7f2d68c90c886680bd4e`.
- Regression file: `tests/parallel-reader-locale-own-key.test.mjs`; Git blob `0ee0fa00831d9ea3c0b104be6bc1743a71a9fe89`.
- Independent GitHub readback after merge: `main == f1da62ad911d00fd72f93b8e27060888e4c22044` and both exact blobs matched.

## Real execution evidence
- [Exact-head GitHub Actions run #41178190377](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41178190377): **COMPLETED SUCCESS**.
- Native Node suite: **2832 passed / 0 failed / 1 skipped**, including 15 new locale cases.
- Disposable Worker/D1: **22 passed / 0 failed**.
- Python pytest adapter: **2 passed**; its existing validators are not counted as an additional duplicate suite.
- TypeScript, lint and source build completed successfully. Lint emitted pre-existing warnings; no claim of warning-free lint.

## Remaining and release truth
- `remaining_scoped_implementation=0`; `necessary_unmerged_feature_PRs=0` for **this narrow fix only**.
- Source feature is integrated in `main`. **Site deployment, actual installed SHA, Windows, physical NVDA, SMTP and hosted browser end-to-end acceptance remain NOT_VERIFIED**. No production deployment was performed.
- Reopen this scoped work only for a new approved requirement or a concrete reproduced regression. Do not mistake it for parent SA-EXT-01 closure.
