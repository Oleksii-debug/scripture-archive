# R0 / SA-EXT-16 — consent snapshot symlink boundary: scoped terminal

**Decision (2026-10-30): CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.**
Only the stable-path symlink admission defect of the offline SQLite release
preflight is closed. **Parent SA-EXT-16 and all SA-EXT-01…20 remain OPEN.**

## Source functionality
The operator-supplied private consent snapshot must be an actual regular file,
not a symlink pointing to a different, possibly live, database. Existing
read-only SQLite opening, aggregate privacy reporting and exact migration 0013
guard verification remain the only canonical implementation.

- Functional PR: https://github.com/Oleksii-debug/scripture-archive/pull/781
- Merged exact `main` SHA: `bb8a0af98cdfca93464ebbc5fbe548460415dd97`
- Source blob: `scripts/verify-sensitive-consent-cutover.mjs@93e0893451d65b015259b9f0992ab6777135079d`
- Regression blob: `tests/consent-preflight-symlink-boundary.test.mjs@8519d06f0be58422be473389b560628d37dbacff`
- Exact-head GitHub Actions: https://github.com/Oleksii-debug/scripture-archive/actions/runs/41071493589 — **COMPLETED SUCCESS**: native Node suite (including real disposable SQLite alias regression), TypeScript, lint, source build, disposable Worker/D1 tests, existing Python validators. PR merged only after this run succeeded and exact head matched.
- Independent post-merge main readback: both blobs present; feature SHA equals main HEAD at verification.

`remaining_scoped_implementation=0`; `necessary_unmerged_prs_for_this_fix=0`.
Do not redesign this path absent new approved requirements or a reproduced defect.

## Not certified
Production consent migration/cutover #689, actual installed Sites SHA,
private D1 snapshot, live DNS/SMTP, Web browser and Windows/NVDA acceptance are
**NOT_VERIFIED**. The stable symlink check does not claim to prevent hostile
concurrent path replacement or hardlink aliasing. This local preflight never
authorizes a deployment or mutates production records.
