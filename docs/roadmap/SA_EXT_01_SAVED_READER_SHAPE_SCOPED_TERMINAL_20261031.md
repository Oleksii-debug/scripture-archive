# SA-EXT-01 — DAMAGED_SAVED_READER_STATE_RECOVERY — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL (2026-10-31)

## Scope and exact final evidence

**РОЗДІЛ SA-EXT-01 / ПІДФУНКЦІЯ DAMAGED_SAVED_READER_STATE_RECOVERY — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ.** Це **не** закриття всього батьківського SA-EXT-01 і **не** дозвіл на реліз.

- **Actual baseline defect:** pre-fix `public/app.js` blob `37e5bca73517ccba107666bbdd808932138955f4`. Persisted local `sa.reader` JSON records `{"book":42,"chapter":7}`, `{"book":{},"chapter":7}`, or null can make canonical `renderReader(["reader"])` throw `TypeError` on `.toUpperCase()` or `.chapter`. A browser can reach the real reader route but cannot recover without manual data cleanup. No production incident is asserted.
- **Canonical fix:** `public/app.js` blob `69b3aa9d79dfa4273170a6117f2960be76562cca`. Typed saved-book admission defaults only damaged saved history to `GEN`; optional saved-chapter access; explicit valid URL is preserved and unknown explicit URLs remain fail-closed. No second UI, backend, database, account writes or preemptive local-storage modification.
- **Regression:** `tests/reader-stored-record-recovery.test.mjs` blob `12160eae4bc82519f781ec2b8822d34104213348`; existing exact-source assertions adjusted in `tests/reader-cache.test.mjs` and `tests/reader-deeplink-validation.test.mjs` without weakening chapter validation. Actual-source V8: old **9/18** scenario expectations matched (9 TypeErrors), candidate **18/18 PASS** across uk/ru/en. Twelve new Node subtests cover malformed saved records, recovery, healthy saved/explicit routes and unknown-book rejection.
- **Integration:** [PR #1091](https://github.com/Oleksii-debug/scripture-archive/pull/1091) **SQUASH MERGED**, feature `main@276594a942356011c74572f1b72d94dbd16dd151`; readback of both canonical source and test blobs verified from `main` after merge.
- **Exact-head qualification:** [GitHub Actions run #41247592699](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41247592699), head `1368773b5207a13f91c3d56a9e2624f0886d79da`, **COMPLETED SUCCESS**; native Node **3,970 PASS / 0 FAIL / 1 SKIP** of 3,971, disposable Worker/D1 **37 PASS**, Python **2 PASS**, TypeScript, lint (13 nonblocking warnings), and source build successful. Earlier exact-head #41247491537 genuinely failed on two outdated source-literal assertions; both fixed before final green run and merge.

## Final closure boundary

`remaining_scoped_implementation=0`; `necessary_unmerged_scoped_PRs=0`; status **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** only for broken saved-reader shape recovery. Reopen only on a new reproduced defect or newly approved requirement.

**SA-EXT-01 parent OPEN:** publisher permissions/licences, all approved edition coverage, independent rights/editorial acceptance remain. Other first parent scopes SA-EXT-02/05/06/07 OPEN; SA-EXT-03/04 already source-terminal. Live Cloudflare Sites installed SHA, production D1/privacy migration #689, browser E2E, physical Windows/NVDA, rights acceptance and full release **NOT_VERIFIED**. No production deployment, user-data mutation, language expansion, emails, payments or automation was performed by this fix.
