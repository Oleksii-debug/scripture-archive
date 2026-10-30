# SA-EXT-03 — PUBLIC_MATERIAL_LATEST_RENDER_WINS — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Date:** 2026-10-30  
**Scope:** one confirmed same-principal, same-panel public reviewed-material GET ordering defect. **This is NOT full SA-EXT-03 closure.**

## Canonical implementation and exact GitHub integration
- [Feature PR #720](https://github.com/Oleksii-debug/scripture-archive/pull/720), **squash merged**.
- Exact feature merge commit in canonical `main`: `411fbf41984a89b9e4b9cb9386ab3ff76750ac7b`. Immediate post-merge `refs/heads/main` readback was identical; GitHub compare feature SHA→main was `identical`, `ahead_by=0`, `behind_by=0`.
- Production source: `public/material-review.js`, blob `a5da2871509bc26e889e0a67a1c76ad92bf5f851`.
- Regression: `tests/public-material-latest-request-wins.test.mjs`, blob `af11f939557932fa82db0077bba82a2269c158fc`, **5 new automated test cases**.

## Actual defect and change
The original canonical `renderPublicMaterials` only fenced another principal, detached DOM, or route epoch via caller `isCurrent`; two same-principal GETs sharing the same root remained concurrently authoritative. When the earlier request settled later, its success or failure could replace the newer view, expose wrong retry controls, or keep old answer handlers usable.

A `WeakMap` request generation is now bound to the existing mounted root. Each started render retires all previous renders for that root. Only the latest may publish success, error/retry markup or answer handlers. Pending answer handlers from a superseded render must not POST. Successful retry continues to work and restores keyboard focus only while its new generation remains current. Existing authorization, server endpoint, grading and storage authorities were **not changed**.

## Execution evidence
- [Exact feature-head GitHub Actions #41059721965](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41059721965) at PR head `ee27c1aac2f6a1b87c9a871d8ef0cb6a5aa4d979`: `status=completed`, `conclusion=success`.
- `source-and-disposable-integration` job `124076127177`: `status=completed`, `conclusion=success`; GitHub returned **16 actual completed steps**. Native Node regression suite (including the 5 new tests), TypeScript, ESLint, build, disposable local Worker+D1 end-to-end and existing Python validators all concluded success.
- Exact merged `main` source and regression blobs were independently re-read after merge. This confirms source integration, **not** that the current public site executes that commit.

## Terminal disposition — narrow scope only
- **STATUS: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**.
- `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0` for this exact defect.
- Further work on this narrow feature only for a new reproducible regression/owner requirement.
- **Parent SA-EXT-03 and all SA-EXT-01…20: OPEN** for full approved scope.
- Cloudflare Sites deployed source SHA, DNS/email, browser keyboard, Windows/NVDA, production/private-data acceptance: **NOT VERIFIED**. No deployment, private state write, scheduled tasks, payments or new dating service were activated.
- Coordination: existing [issue #297](https://github.com/Oleksii-debug/scripture-archive/issues/297) and [issue #78](https://github.com/Oleksii-debug/scripture-archive/issues/78).
