# SA-EXT-16 / R0 — HISTORICAL_SITES_V8_TO_V14_UPGRADE_TEST — scoped terminal (2026-10-31)

**ЗАКРИТО ДЛЯ РОЗРОБКИ ТІЛЬКИ ЦЮ ОКРЕМУ ПЕРЕВІРКУ / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.**

A regression in the existing real-SQL `tests/historical-release-upgrade.test.mjs` previously stopped at migration 0012 while `main` already shipped 0013/0014. The test now applies the actual migration files 0000–0014 to a synthetic historical Sites-v8 fixture, retaining its earlier account, session, group, mission, reading, editor, support and usage data assertions. It verifies the **real** two 0013 consent triggers, rejects the old-writer church visibility re-publication without current explicit consent, supports valid confirmed v1 consent, rejects withdrawal that leaves visibility public, and verifies the presence/foreign-key of 0014 editorial takedowns. It does not inspect or alter production D1.

- **Implementation:** [PR #854](https://github.com/Oleksii-debug/scripture-archive/pull/854) **SQUASH MERGED** at exact `main@cb3e5afcfb200235805818cdf0dc2e79cc7324fe`.
- **Test source blob:** `tests/historical-release-upgrade.test.mjs` `dff25f9aaccd5ceabdd4e6d98e1d560f11d9c1e9`; canonical migrations left unchanged.
- **Exact head:** `262c571d2af97310437bf695a07c2a05741039d7`, [GitHub Actions #41170147488](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41170147488) **COMPLETED SUCCESS**, native Node, TypeScript/lint/build, disposable Worker/D1 and Python tests.
- **Post-merge proof:** PR merged, source read back from exact `main`.

`remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0` only for this history-upgrade test extension. No need to repeat the same source work without a reproducible regression.

**R0 RELEASE BLOCKER [#689](https://github.com/Oleksii-debug/scripture-archive/issues/689) REMAINS OPEN:** exact installed historical Worker, D1 migration ledger, old-writer write pause, tested backup/rollback, snapshot and live post-cutover checks are not verified. The test is not proof that historical production data were migrated safely. **All complete SA-EXT-16 parent development remains OPEN**; site/Sites SHA, SMTP, Chrome and Windows/NVDA NOT_VERIFIED. No migration, deployment, payments, email or new background jobs were executed.
