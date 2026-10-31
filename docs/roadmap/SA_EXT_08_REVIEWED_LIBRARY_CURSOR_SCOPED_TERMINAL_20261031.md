# SA-EXT-08 — reviewed-library repeated-cursor guard — scoped terminal receipt

**2026-10-31: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** for the existing canonical `/library` pagination integrity defect **only**. Full parent SA-EXT-08 remains OPEN.

## Reproduced defect and actual product path

The canonical `public/workspace.js::renderWorkspace('library')` mounts `public/material-review.js::renderReviewedLibrary` and uses the current `/api/material-review` library-search endpoint. A malformed continuation response could return the same `nextCursor` or cycle back to an earlier `(id, submittedAt)` pair. The old UI accepted that response, appending duplicate batches and preserving a repeated “Show more” path. This is an input-integrity source-level defect; no production exploitation or user-data impact is claimed.

## Completed integration

- Preserve a search-local `seenCursors` set of opaque `[id, submittedAt]` pairs, rejecting repeated immediate and multi-page cyclical continuations through the existing `validCursor` fail-closed validation.
- Reset the set on every new form submission, retaining normal independent searches. Preserve already approved material, current retry cursor and the existing accessible status/error message when a continuation is invalid.
- Two actual mounted-workspace Node tests cover repeat A→A, multi-page cycle A→B→A, retained approved results, failed continuation, successful retry and no duplicate display. Existing API authority, keyboard/focus behavior, source/rights and language boundaries remain unchanged.

**Implementation PR [#1012](https://github.com/Oleksii-debug/scripture-archive/pull/1012)**, exact tested PR head `b287a5fe26df4fe12ca8ea90b253f15e9edec212`, **SQUASH MERGED** to `main@71455c48732e31c3d5dd6476467b1bc93a6d6160`. Verified GitHub readback: PR `merged=true`, branch `main` exactly that SHA and `compare(feature,main)=identical` at integration. Production source blob `public/material-review.js@b1b3441979d23c445b283b62fb6ffaae9f087413`, regression blob `tests/library-reviewed-route.test.mjs@7da7bd0d211fdb8aa551fc97eedfc0bdd3c50727`.

**Exact-head [GitHub Actions #41238291123](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41238291123)**: COMPLETED SUCCESS, source-and-disposable-integration job all steps SUCCESS. Native Node tests: 3548 PASS / 0 FAIL / 1 SKIP (3549 total); disposable Worker/D1 HTTP checks: 24 PASS / 0 FAIL; Python pytest: 2 PASS; TypeScript, lint and non-deploying source build completed successfully. Those are observed CI logs, not an assertion of physical NVDA, Windows, real-site browser or production D1 tests.

## Exact closure boundary

- `scope_status=CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`
- `remaining_scoped_implementation=0`
- `necessary_unmerged_scoped_feature_PRs=0`
- `parent_SA_EXT_08=OPEN`: the wider copyright-cleared library corpus, licensed media/book coverage, rights/takedown operations, browser/physical NVDA, production Sites/D1 deployment and final release are not accepted by this fix.
- No Cloudflare Sites publish, D1 migration, registration, emails, scheduled tasks, money, language expansion, artificial users or production records changed.
- Reopen this completed narrow slice only on an independently reproduced regression or explicitly approved new requirement. Do not restart the parent section or duplicate its existing implementation merely to repeat this repair.

Coordination: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297); master planned scope [#295](https://github.com/Oleksii-debug/scripture-archive/issues/295).
