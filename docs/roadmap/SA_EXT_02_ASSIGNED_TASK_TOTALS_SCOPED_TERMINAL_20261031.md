# SA-EXT-02 / ASSIGNED_TASK_TOTALS — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

Date 2026-10-31. **Only the proven historic attempted-score integrity defect is terminal; whole SA-EXT-02 stays OPEN.**

## Functional defect and bounded repair
Previously the authenticated canonical `GET /api/attempts?action=history` accepted `score = total = 900000` as valid if both were safe integers. A corrupted persisted completed assessment could therefore appear as a genuine perfect score in private mission history/review UI although no such assignment exists.

Existing `app/api/attempts/route.ts` now reads persisted `task_limit` in the **private D1 query only**, requires `task_limit===total` and verifies it is supported by the canonical `tasksFor(book,chapter)` inventory. Client JSON projection still emits only `id,book,chapter,mode,score,total,completedAt`. No new persistence/server/route; no invented score repair, no mutation on GET.

In `tests/attempt-recovery-history.test.mjs`, actual production route runs against migrated SQLite and verifies 503 fail-closed for inflated perfect score, mismatched total, impossible mission inventory, zero/negative task count, nonexistent chapter; D1 row stays unchanged and genuine historical score remains readable after restoration.

## Evidence
- Source PR: https://github.com/Oleksii-debug/scripture-archive/pull/956 **squash MERGED**.
- Exact feature merged main `c0eb0407ab6eadaf891bba6e2bb2cf2f47fdf401`, independently read back as `refs/heads/main`.
- Production route blob `09213464684c82744c648742c6f51d1ed4891abf`; execution regression blob `d568bae9a57c443dd168a6a324acd00e2a9e024f`.
- Final PR-head SHA `66c9fed599fb072cc5143e2bb352555f11acd22b`.
- Exact GitHub Actions https://github.com/Oleksii-debug/scripture-archive/actions/runs/41201794542 **SUCCESS**. Native Node **3295 PASS/0 FAIL/1 SKIP**; disposable Worker/D1 **24 PASS/0 FAIL**, Python **2 PASS**, TypeScript/lint/build PASS.

`remaining_scoped_implementation=0`; `necessary_unmerged_scoped_feature_PRs=0`; **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**. Reopen only for concrete new proven defect or approved requirement. **Parent SA-EXT-02 not closed.**

Unverified and unchanged: production site deployed SHA, full release, Windows/NVDA physical browser E2E, independent mission content audit and other parents. No live D1/hosting/users/emails/payments changed.