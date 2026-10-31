# R0.4 — SIGNED_DISPATCH_CACHE_READINESS / CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

Date: 2026-10-31. **Only the reproducible scheduler-readiness cache-evidence defect is closed**; R0.4 and all deployment/automation acceptance remain open.

## Concrete integrated behavior

The existing canonical read-only `lib/community-smoke.mjs::communityDeploymentReady` probes the real `GET /api/community/dispatch` for HTTP 204, exact `X-Scripture-Runner-Protocol: github-oidc-v1`, and now a real comma-delimited case-insensitive `Cache-Control: no-store` directive. A missing or cacheable 204 no longer counts as live signed-runner capability. The same exact directive parser is reused for the anonymous account probe previously fixed in #1035. No second endpoint, scheduler, API, or deployment control was added.

The actual canonical `app/api/community/dispatch/route.ts::GET` already emits `Cache-Control: no-store`. The new source-side gate checks that existing response invariant; it is not a new permission for `POST`, automatic START or production modifications.

## Exact evidence and integration

- Existing source on `main@a2d4f4e40fe1a420e764b0fdfcd03460612b7e56` returned **true** in local Node 22 for missing header, `public,max-age=3600`, `no-cache`, and impostor `no-store-extra`, all with otherwise valid 204/protocol GET. A valid `private, NO-STORE` also returned true. This is local source-level evidence, not a deployed-site exploitation finding.
- [Functional PR #1037](https://github.com/Oleksii-debug/scripture-archive/pull/1037) **merged=true/closed**. Exact feature head: `751487812b3aa1491f71fd81308544673d6902bc`. Exact squash integration SHA: `main@0f6edac2e2067de1285b6466680111ea5d14a714`.
- Post-merge production code blob: `lib/community-smoke.mjs@f098b30ff0e8807f22f296e390ac717df4db05b2`. Native regression blob: `tests/community-smoke.test.mjs@ebf9146dd234cd1ac91106116805d74573a37797`.
- New native Node regression includes seven bad Cache-Control cases, valid uppercase `NO-STORE` with failed→healthy recovery, exact GET-only assertion on all six probes.
- Local source-transformed Node v22: `node --check` exit 0, bad caches false and valid no-store true.
- [Exact-head GitHub Actions #41241876304](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41241876304): `COMPLETED SUCCESS`, native Node, TypeScript, lint, build, disposable Worker/D1 integration and canonical Python validators all completed with success on exact feature head. CI is not actual Sites/D1/Windows/browser/NVDA acceptance.

## Final strictly scoped decision

`remaining_scoped_implementation=0`  
`necessary_unmerged_scoped_PRs=0`  
**`CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`** — **SIGNED_DISPATCH_CACHE_READINESS only**.

Parent R0.4, SA-EXT-10/16, release cutover #689, deploy, live owner Stop/Continue, actual scheduler credentials/operation, real mail, current site/source/D1 SHA, backup and rollback, Chrome/Windows/physical NVDA and whole platform remain **OPEN / NOT_VERIFIED**. No deployment, migration or production data action took place. Do not reimplement absent a new concrete regression.
