# SA-EXT-16 — two narrowly scoped authentication-abuse repairs — TERMINAL (source only)

**Date:** 2026-10-31  
**Authoritative feature main readback:** `a68a5f8b03ed51e993bec58cdeee6e7e90042acf`  
**Scope:** These are TWO post-development source fixes only. Parent `SA-EXT-16` and the other unfinished `SA-EXT` sections remain **OPEN**. Neither source fix changes the deployed Sites release.

## SA-EXT-16 / TRUSTED_EDGE_ADDRESS_RATE_LIMIT — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

- Demonstrated pre-fix path: `lib/auth.ts::requestAddress` chose `X-Forwarded-For` when `CF-Connecting-IP` was absent, allowing client-controlled rate-bucket churn at an untrusted proxy boundary.
- Canonical code: `lib/auth.ts`, actual main Git blob `57d37524dfbb519aa901007e334e085f37362fc5`. Now uses only a bounded valid Cloudflare connecting IP, canonicalizes IPv6, and uses shared `unknown` otherwise; existing D1 rate limiter and user auth routing are reused.
- Native Node regression: `tests/auth-request-address-trust.test.mjs`, actual main blob `0eb16aa5c137dc336fed6e53a2d39272e755cae6`; 46 named spoofing, positive IPv4/IPv6, malformed and fallback cases.
- Source [PR #885](https://github.com/Oleksii-debug/scripture-archive/pull/885) **SQUASH MERGED** exact `main@313a15bf092dbb913e25af8deba821e1dfdadeb0`; actual [Actions #41177621085](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41177621085) **COMPLETED SUCCESS**, with Node, TypeScript, ESLint, source build, disposable Worker/D1 and Python validators all executed successfully.
- `remaining_scoped_implementation=0`; `necessary_unmerged_feature_PRs=0`; subsequent changes require an evidenced regression or new approved requirement.

## SA-EXT-16 / LOGIN_PASSWORD_INPUT_BOUND — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

- Demonstrated pre-fix path: `POST /api/auth?action=login` checked only that `password` was a string before either an actual password check or expensive unknown-user dummy PBKDF2. Registration, change, and reset already used a maximum length of 128.
- Canonical code: `app/api/auth/route.ts`, actual main blob `064a011cfdce6832983cc01557e4eca93d1d9161`; >128-character login passwords now receive existing generic 401 before account lookup/hash, preserving valid historic shorter passwords and dummy-hash behavior for admissible input.
- Native Node regression: `tests/auth-login-password-bound.test.mjs`, actual main blob `17edebc7e2325184a79e2d564fe2277a2fe923e8`; 35 production-route invalid/positive/boundary/fallback cases.
- Source [PR #886](https://github.com/Oleksii-debug/scripture-archive/pull/886) **SQUASH MERGED** exact `main@a68a5f8b03ed51e993bec58cdeee6e7e90042acf`; actual [Actions #41177763897](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41177763897) **COMPLETED SUCCESS**, with Node, TypeScript, ESLint, source build, disposable Worker/D1 and Python validators all executed successfully.
- `remaining_scoped_implementation=0`; `necessary_unmerged_feature_PRs=0`; subsequent changes require an evidenced regression or new approved requirement.

## Boundaries and acceptance truth

- **81 new regression scenarios** across the two repairs. The complete exact-head CI workflows succeeded, but this is **not** evidence of physical keyboard/NVDA or installed website acceptance.
- `SA-EXT-16` (whole parent): **OPEN**. Parent SA-EXT-03 and 04 preserve their separate accepted terminal records; the other 18 parents remain open.
- Public Sites installed SHA, full browser journeys, physical Windows/NVDA, SMTP, and migration/release cutover: **NOT_VERIFIED**. No deployment authorized/performed here.
- `scripture-archive` and `Accessible-Chess` are distinct products. Chess PGN/CBH requirements are governed by the separate chess repository.
