# SA-EXT-02 — FOREIGN_MISSION_GRADING_AND_INVALIDATION — scoped terminal (2026-10-31)

**РОЗДІЛ SA-EXT-02 / підфункція FOREIGN_MISSION_GRADING_AND_INVALIDATION — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ / CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.**

## Original specific lifecycle defect

Separate from earlier finished completion/grade repair #1051, the canonical authenticated `GET /api/attempts?action=current` still returned `grading:true` for an owned but corrupt persisted row whose `mission_id` belonged to a different mission. `POST /api/attempts?action=invalidate` could also change the status of that unrelated active row. The existing canonical source now rejects these two distinct foreign-mission lifecycle actions with `409 attempt_state_invalid`, preserving successful canonical progress readback and the same owner/auth/D1 boundary.

This models a corrupt/legacy persisted row, not an observed live production attack. No new mission engine, API endpoint, schema or user-facing alternate implementation.

## Integration proof

- [Feature PR #1053](https://github.com/Oleksii-debug/scripture-archive/pull/1053) **SQUASH MERGED**, exact feature `main@1f26af1ad9f85e6e109a83e7021c1443a2c7323d`.
- Canonical source `app/api/attempts/route.ts` SHA blob `209b3d90324d5e8dedee0486f5b0257845692801`.
- Extended real route-executed `tests/attempt-foreign-mission-provenance.test.mjs` blob `e64f05987b6bbec754817c85110851c182d59faf`: three new tests (two negative boundaries, one valid grading compatibility) alongside seven previous cases.
- Exact PR-head [Actions run #41243828129](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41243828129) on `9e81f5c17512336db85ae6cc746e2b65c77a9e7e` **COMPLETED SUCCESS**. Native Node, TypeScript, lint, source build, disposable Worker/D1 and canonical Python validators ALL reported successful steps.
- Feature merged to GitHub main and read back at the SHA above. The later main-push CI is an independent stage not claimed here.

## Final scope / remaining work

For `FOREIGN_MISSION_GRADING_AND_INVALIDATION` only: `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0`, `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. Existing #1051 closure remains intact.

**Parent SA-EXT-02 and all other unfinished parent scopes remain OPEN; release/cutover #689 OPEN**. Live installed Sites/D1 SHA, rights/editorial review, real browser/Windows/physical NVDA and full product delivery NOT_VERIFIED. No production deploy, migration, payment or user email performed; do not restart this scoped work absent a new demonstrated defect or changed requirement.
