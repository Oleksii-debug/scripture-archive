# Scripture Archive — R0.4 / VISIBLE_SSR_ANCHORS — scoped terminal receipt

**Date:** 2026-10-31. **Status:** CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.

## Actual integrated user-facing protection
The canonical read-only `communityDeploymentReady` used before community activation now verifies elements belonging to actual `body` markup instead of matching shell-shaped text inside inert HTML content or attributes. It preserves all six GET-only readiness probes and the earlier HTML comment filter repair #1065, and requires the real navigation destination as well as the `data-route` identity. This does not prove JavaScript ran, physical NVDA acceptance, production origin or a deployed SHA.

## Exact integration and evidence
- Functional [PR #1068](https://github.com/Oleksii-debug/scripture-archive/pull/1068) **squash merged** to `main@85fc3735ba838ecdd3643658a080d3d8179f9de2`.
- Canonical code: `lib/community-smoke.mjs`, Git blob `94ffe189eb3796d8117a0428aa4c8dd4be9cd0ae`.
- Committed negative/positive/recovery tests: `tests/community-shell-visible-markup.test.mjs`, Git blob `7206dd4c6b532171f33b8b33f0f8393db91c101e`.
- Exact PR head `ebd9771a1d81294a6f7afba47311a0e3c5105caa`; [workflow #41245426232](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41245426232) **completed success**: Node regression suite, TypeScript contracts, lint, source build, disposable Worker and D1, Python validators all truly executed and passed.
- Independently reproduced negative HTML comment/script/template/attribute lookalikes in isolated Node 22.16 tests. Original pre-#1065 parser was 1/10 PASS, corrected parser 10/10 PASS; locally reconstructed #1065 baseline 3/10 PASS. These local fixtures are supplemental and do not replace the exact-head workflow.
- `remaining_scoped_implementation=0`; `necessary_unmerged_scoped_PRs=0`.

## Boundaries and next action
**Do not mark all of R0.4 / SA-EXT-01–20 / final product DONE.** Source-terminal SA-EXT-03/04 remain terminal. Parent SA-EXT-01/02/05–20, release [#689](https://github.com/Oleksii-debug/scripture-archive/issues/689), exact live Sites/production D1/backup and Windows/Chrome/physical NVDA require separate evidence. No live deployment, database write/migration, email, payout, or community automation was performed. New feature requests or concrete defects must use new work rather than reopening this completed scoped fix.
