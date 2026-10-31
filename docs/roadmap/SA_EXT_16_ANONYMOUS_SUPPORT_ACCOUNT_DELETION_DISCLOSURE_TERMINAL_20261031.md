# SA-EXT-16 — anonymous support retention disclosure (scoped terminal receipt)

**Date:** 2026-10-31

**Status of this one approved privacy disclosure:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.

**The full SA-EXT-16 parent is OPEN.** Issue [#303](https://github.com/Oleksii-debug/scripture-archive/issues/303) remains OPEN; this receipt does not assert production erasure or completion of the account-deletion retention policy.

## Integrated behavior

In the actual authenticated password-account deletion interface, `public/app.js` now clearly explains in the already supported Ukrainian, Russian and English locales that an anonymous Help request not linked to the account is **not automatically deleted**. It directs the person to support to request removal. The pre-existing notices regarding de-identified group sessions, local Academy markers, delivered emails and backups remain intact. There is **no** new identity lookup, anonymous-record auto-deletion, data migration, email operation, or production deployment.

This is a direct correction of a confirmed user-facing disclosure gap recorded in issue #303, not a new policy or promise to delete records beyond the current server's reach.

## Exact integration and tests

- [Code and test PR #993](https://github.com/Oleksii-debug/scripture-archive/pull/993): **SQUASH MERGED**; exact source `main@18e0792a275e2b1b2cfc5ee3a2add181eed69eee`.
- Main readback after merge:
  - `public/app.js` blob `ec1cd46eeac504644915e6104d55d6d2b15c2048`.
  - `tests/account-deletion-anonymous-support-disclosure.test.mjs` blob `59f5e7d30668aecf897fb334e7fef362f0e7c2c1`.
- [Exact PR-head CI #41221672505](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41221672505), head `285c377bd5c185d16e89c2a521dc4c6abb770fbf`: **completed/success**; native Node (three real-rendered locale regressions), TypeScript, lint, source build, disposable Worker/D1 and Python all PASS.
- [Merged-main CI #41221839342](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41221839342), exact `18e0792a275e2b1b2cfc5ee3a2add181eed69eee`: **completed/success**, the same six quality lanes all PASS.
- Central record: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297#issuecomment-6546363238); issue-specific record: [#303](https://github.com/Oleksii-debug/scripture-archive/issues/303#issuecomment-6546362773).

`remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0`. Do not reimplement this already merged UI disclosure without a specific reproduced defect or newly approved requirement.

## Deliberately still open / not implied

The project still needs a verified lawful retention/deletion lifecycle for **anonymous** support requests and externally delivered email, backups and recovery; independent user-accessible handling of requests, production/deployed Sites SHA, actual D1 backup/cutover, real browser/keyboard and physical NVDA acceptance. These remain with #303, #297, #689 and the R0 release owner as appropriate. This scoped source receipt authorizes none of those actions and does not turn SA-EXT-16 into `TERMINAL`.
