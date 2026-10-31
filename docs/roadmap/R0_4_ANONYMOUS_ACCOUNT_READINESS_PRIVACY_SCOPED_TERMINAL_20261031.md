# R0.4 — ANONYMOUS_ACCOUNT_READINESS_PRIVACY / CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

Date: 2026-10-31. **The named release-readiness source defect only is terminal.** This is not R0.4 parent completion, live deployment acceptance, or an authorization to start community scheduling.

## Corrected canonical behavior

- Existing `lib/community-smoke.mjs::communityDeploymentReady` makes exactly six GET-only probes; the existing account route stays canonical and is not replaced.
- An HTTP-200 anonymous `/api/account?action=me` response now qualifies only when it contains a JSON object with own `user: null` and an actual comma-delimited, case-insensitive `Cache-Control: no-store` directive.
- Authenticated user objects, false/string user values, absent or cacheable headers, and impostor `no-store-extra` are denied. Valid `no-store, private` is retained, and a later healthy read can recover.
- No POST, community wave, email, real user data, D1 migration, or production deployment was performed.

## Exact reproducible evidence

- Feature [PR #1035](https://github.com/Oleksii-debug/scripture-archive/pull/1035): **merged=true**, **state=closed**; feature head `4ca8d5f0d72ace2bbd7b3030956fa8a1f19de521`.
- Exact code integration: `main@fdb0cda2bc6a72256ff4303e9108f205e1491a65` (squash).
- Production code blob at merge: `lib/community-smoke.mjs@69078e48a48f3077af2006611563ffe56d822829`.
- Regression blob at merge: `tests/community-smoke.test.mjs@8147790cc4361473084d95b9cf4aa96e9e23b18f`. Includes eight private/cache negative inputs, normal anonymous response, and denied-to-healthy recovery with GET-only assertions.
- [Exact-head GitHub Actions run 41241377501](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41241377501): `completed/success`, one `source-and-disposable-integration` job `completed/success`. Real completed steps: checkout, frozen Node dependencies, native Node regressions, TypeScript, lint, source build, disposable Worker/D1, Python dependency installation and canonical validators. This is hosted CI at the feature head, **not** a physical browser/NVDA or production-site check.
- Readback after merge: `main` exactly equals the squash SHA; changed code and test blobs exist; PR is merged and closed.

## Closure limits and handoff

`remaining_scoped_implementation=0`  
`required_unmerged_scoped_PRs=0`  
`CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` — **ANONYMOUS_ACCOUNT_READINESS_PRIVACY only**.

**Parent R0.4, SA-EXT-10/16 and release #689 remain OPEN.** Actual deployed source/Sites SHA, real D1 migration ledger, protected backup and rollback, user-journey testing, real emails, owner control, physical Windows/NVDA and live community readiness are **NOT_VERIFIED**. No deployment claim. Do not reimplement this accepted source fix without a new demonstrated regression.
