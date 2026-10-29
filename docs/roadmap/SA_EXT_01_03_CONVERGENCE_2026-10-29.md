# Scripture Archive — SA-EXT-01/02/03 source convergence checkpoint

- Authority refreshed 2026-10-29: original main `e7d0a8c275776f7d8b185c561c94b6a24920ec32`, accepted source candidate #321 `9d8e2703ed34469a9fd344f5c53af9e754bd8328`.
- This branch is **not** a release, terminal section closure, or evidence of current Cloudflare Sites deployment.
- Reuses the existing approved-work lineage #316 → #317 → #318 → #319 → #320 → #321. No second reader, grading, editorial or identity authority.
- 28 functional/document/test paths from the source branch. Exactly two shared paths were reconciled with subsequent main change #323: `app/api/auth/route.ts` and `tests/account-deletion-privacy.test.mjs`.
- Account deletion now retains #323 shared-session anonymization and #321 editor-role cleanup in the same transaction. Cross-user regression keeps both sets of assertions. Failure injection moves from step 9 to step 11 because two new SQL statements precede the shared-session redaction.
- Independent test **still required on this exact converged commit**: `node --test tests/account-deletion-privacy.test.mjs tests/editor-role-audit.test.mjs tests/material-review.test.mjs tests/parallel-reader.test.mjs`; `npm test`; `npx tsc --noEmit`; `npm run build`; disposable D1 migrations 0000–0012 and Worker API integration, browser/keyboard/NVDA.
- Existing #321 worker reported source-head Node 238 passed/1 skipped and disposable D1/Worker 22/22 PASS; those are **earlier-head evidence only**, not tests of this reconciliation. It also reported one transient 503; root cause was not established.
- SA-EXT-01, SA-EXT-02, SA-EXT-03: `INTEGRATION_CANDIDATE / NOT_TERMINAL`. Rights/provenance acceptance, independent security review, current release and physical NVDA checks are separate.
- Avoid production deployment until the owner's release hold is lifted.
