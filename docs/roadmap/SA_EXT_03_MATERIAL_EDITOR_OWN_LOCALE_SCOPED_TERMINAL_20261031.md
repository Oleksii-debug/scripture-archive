# SA-EXT-03 / MATERIAL_EDITOR_OWN_LOCALE_COPY — scoped terminal repair

**Date:** 2026-10-31  
**Status:** CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL  
**Parent:** SA-EXT-03 remains independently CLOSED_FOR_DEVELOPMENT / TERMINAL for its approved complete source scope. This entry closes only a newly reproduced, post-terminal browser-copy regression.

## Proven defect and single canonical fix

The existing editor/public material module used inherited-language dictionary lookups for its review text, takedown search, permission grant/revoke text and status messages. Values such as `__proto__`, `constructor` and `toString` returned inherited objects/functions instead of a valid UI copy, producing missing or incorrect accessible labels.

One shared `ownLocaleCopy` helper in the actual `public/material-review.js` now requires a **string own key** and otherwise selects complete Ukrainian copy. Existing `uk`, `ru`, `en` are unchanged. No new editor authority, endpoint, schema, role privilege, parallel app or synthetic UI was introduced.

- Canonical implementation: `public/material-review.js` blob `62351aa31ae271bc4b7ac16512c42c6bf7b5eacc`.
- Executable production-module regressions: `tests/material-review-locale-ownkey.test.mjs` blob `ec16c098ee3a6537bbeb4c0150d45c70aa7ebca0`; 13 inherited, invalid, non-string and null-prototype inputs across 3 public/editor entry points, plus intact 3-language copy.
- Code PR [#902](https://github.com/Oleksii-debug/scripture-archive/pull/902), **SQUASH MERGED**; exact code integration main SHA `38730af787c8622cbeae0efa51e4b030a1d48d59`. Both files verified through direct GitHub `main` blob reads after merge; merge ancestry `identical` at readback.

## Real executed quality gate

PR-head [GitHub Actions #41179283533](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41179283533), exact head `b4331675841dca321fac903222ce4202df194e4f`, **COMPLETED SUCCESS**, 16/16 workflow steps, 0 failed:
- Native Node `2896 PASS / 0 FAIL / 1 SKIP` (2897 total).
- Disposable Worker/D1 `22 PASS / 0 FAIL / 0 SKIP`.
- Existing Python validators `2 PASS`.
- TypeScript contracts, ESLint and production-source build all PASS.

This is genuine checked-out GitHub CI, **not** a claimed physical NVDA run, Chrome authenticated E2E, Windows package, SMTP delivery, source ownership/licensing approval, or deployed Sites SHA.

## Final development boundary

For this exact defect: `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0`, `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. Parent SA-EXT-03 retains its prior TERMINAL; SA-EXT-01/02/05..20 remain independently OPEN for their approved full scope. No website publication, personal-data mutation, payment, sending, or new language roll-out is authorized or claimed. Reopen this narrow item only for a newly reproducible defect or changed owner requirement.

Canonical coordination: [#78](https://github.com/Oleksii-debug/scripture-archive/issues/78), [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).
