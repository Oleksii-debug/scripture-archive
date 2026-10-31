# SA-EXT-02 — chapter-open mission isolation / scoped terminal receipt (2026-10-31)

**Status:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` for the **specific** chapter-open cross-mission invalidation defect only. **Parent SA-EXT-02 remains OPEN**. SA-EXT-01/05/06/07 remain OPEN; SA-EXT-03/04 are source-terminal. This is not a live release certificate.

## User-visible invariant

An authenticated user opening a Bible chapter in the existing canonical `POST /api/attempts?action=chapter` must invalidate only active attempts of the canonical `OT-AB-01` mission for that actor/book/chapter, across personal and group contexts. It must not invalidate a separate mission that happens to use the same actor and passage. Existing receipt consumption and the atomic D1 batch confirmation remain unchanged.

## Proven implementation and integration

- Existing canonical route: `app/api/attempts/route.ts`; no new service, schema, route, migration or parallel state.
- Exact functional [PR #1058](https://github.com/Oleksii-debug/scripture-archive/pull/1058) **SQUASH MERGED** at `main@8488c748a5ec9d6fdc89489721466fc7dab093f1`; expected reviewed head `0a07a804ad1785848616e5e1150c6155baad32ff`. Canonical route source blob after merge `1e417e91705cb082098121db11675d8f9c69a572`.
- SQL mutation now adds `AND mission_id=?` with trusted server `MISSION_ID`; all previous actor, book, chapter, status, expiry predicates remain.
- Existing regression files `tests/attempt-scope-receipts.test.mjs` and `tests/attempt-receipt-race.test.mjs` were updated. PR contains SQLite execution of extracted production SQL for canonical personal and group attempts, foreign mission attempts, unrelated actor/book/chapter, completed/expired rows, receipt consumption and ordering/recovery.

## Actual verification

[Exact PR-head GitHub Actions #41244571866](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41244571866): `completed/success` for `0a07a804ad1785848616e5e1150c6155baad32ff`. The `source-and-disposable-integration` job reports **SUCCESS** for native Node regressions, TypeScript contracts, lint, source build, disposable Worker/D1 integration and canonical Python validators. Job-step results were read directly from GitHub; this is hosted CI, not a local full checkout. Before integration the active `main` had advanced only in three documentation paths, disjoint from the PR's route/test files; PR was `mergeable=true`. Merge used expected-head SHA to avoid a moving-head integration.

The original defect was reproduced by the PR owner on disposable SQLite. This receipt does not claim that a live production user was affected. Local `git ls-remote` still fails with DNS resolution exit 128; no additional native checkout, Chrome, Windows, NVDA or live D1 test is claimed here.

## Remaining acceptance / exclusions

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0` for **this** defect only. Parent SA-EXT-02 and release #689 remain OPEN. Live Sites SHA, production D1/backup, publisher/source rights, physical keyboard/NVDA, cross-browser and independent release acceptance are **NOT_VERIFIED**. No production deploy, migration, user data mutation, mail, payments, new languages or dating service.
