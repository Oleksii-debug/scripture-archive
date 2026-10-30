# SA-EXT-16 — LATE_AUTH_RESPONSE_COOKIE_CLOBBER — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Date:** 2026-10-30  
**Canonical issue:** [#705](https://github.com/Oleksii-debug/scripture-archive/issues/705)  
**Coordination:** [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297)  
**Implementation:** [PR #731](https://github.com/Oleksii-debug/scripture-archive/pull/731), **SQUASH MERGED**  
**Exact merged feature SHA:** `4668cd6cb594ecdd532b455fa5cf3682e0aab1a4`  
**Exact original patch HEAD:** `e02c5c7b864f2afde1d3141103ccc8a14620dc3e`

## Scope sealed for source development

The existing canonical `app/api/auth/route.ts` now refuses to send a shared `sa_session` cookie deletion in the successful responses for `logout`, `change-password`, `reset-password` and `delete-account`. The HTTP client/browser may receive an older request's response *after* another login installs a newer cookie. An old Set-Cookie deletion must not invalidate that newer browser session. The existing durable D1 revocation and account session-version invalidation remain authoritative, including confirmed receipts; successful login continues setting the HttpOnly cookie. No new authentication authority, privilege override, D1 migration, browser session storage or deployment has been introduced.

**Merged exact source blobs:**
- `app/api/auth/route.ts` — `a2014b49ab836b25b647ae41f34500ccb9b7a05c`
- `tests/session-durable-receipts.test.mjs` — `4a728b94e354cedad8e8e07fedfc57639f188dd4`
- `tests/auth-late-cookie-response.test.mjs` — `95dd1d796485521c55661c8bee8adef5381c1162`

## Qualification and exact-source readback

[GitHub Actions run #41061728225](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41061728225) **COMPLETED/SUCCESS** at `e02c5c7b864f2afde1d3141103ccc8a14620dc3e` on 2026-10-30:
- Native Node regression suite — PASS.
- TypeScript contracts, ESLint, source-only production build — PASS.
- Disposable local Worker/D1 integration — PASS.
- Existing Python validators — PASS.
- Canonical route and new regression test retrieved from merged `main@4668cd6cb594ecdd532b455fa5cf3682e0aab1a4`, matching above blob identities.

The native route regression exercises 4 ordered stale-response/new-login scenarios, 4 denied D1 transition scenarios, and 1 new-login preservation scenario, with test fixture cookie application. The pre-fix failure on the first PR head was a test regex omitting valid `DELETE FROM auth_sessions`; corrected in the final exact-head PASS. No false claim of physical browser execution or test rerun on the merged SHA.

## Final scoped source status

`remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0`; `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` for this **single source defect**. Reimplementation requires a newly evidenced defect or approved change.

**Explicit non-claims / follow-up outside this scoped source terminal:** real browser ordered HTTP cookie acceptance, true hosted Sites SHA, production cutover, SMTP, actual Windows/NVDA and account/privacy acceptance are **NOT_VERIFIED**. Issue #705 may remain OPEN as a browser-qualification checklist even though its source correction is merged. Parent section **SA-EXT-16** and every full **SA-EXT-01…20** remain **OPEN**; no host deployment or automatic publication was performed.
