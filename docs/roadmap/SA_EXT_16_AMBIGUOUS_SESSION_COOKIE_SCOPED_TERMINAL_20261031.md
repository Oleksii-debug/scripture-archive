# SA-EXT-16 — AMBIGUOUS_SESSION_COOKIE_IDENTITY — SCOPED TERMINAL (2026-10-31)

- **Status:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. **The whole parent SA-EXT-16 is OPEN.**
- **Exact merged feature SHA:** `61085c99289ed056a9021887fe1b00154588ef63`, [PR #875](https://github.com/Oleksii-debug/scripture-archive/pull/875) SQUASH MERGED; zero necessary unmerged PRs for this narrow fix.
- **Canonical code:** `lib/auth.ts`, Git blob `021b646f3cbe0d3c312e84a2f697fa7c9b5e90d8`; no second cookie or authentication authority.
- **Regression suite:** `tests/auth-duplicate-cookie-ambiguity.test.mjs`, Git blob `2b5cb3233e82eb8deecf8f71672210c83b44dc9d`. Exactly 10 new tests. Existing `npm test` glob includes it.
- **PR-head CI:** [GitHub Actions #41175980190](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41175980190), `completed/success` for exact candidate `88866aab77cd79684d0c26e23c1204971a51f569`. Independently observed SUCCESS steps: native Node regression suite, TypeScript contracts, ESLint, build, disposable local Worker + D1 integration and canonical Python validators.
- **Postmerge exact-main readback:** code and test blob SHAs above verified; identity ambiguity guard is actually present. All source changes already in main.
- **Residual scoped implementation:** `0`. Reopen only for a newly reproduced regression or owner-approved new requirement.

## Defect and resolution

The original `parseCookies` constructed a `Map` from the complete Cookie header. Duplicate names (e.g., same `sa_session` sent from two cookie Path scopes) silently selected the last credential. More critically, an ambiguous logout could claim a revocation although the browser may hold multiple plausible cookies.

The existing `lib/auth.ts` now parses the header through a single shared `readCookies()` helper. Any repeated cookie key, including duplicates with malformed percent encoding, is withheld from the public `parseCookies()` Map. `revokeCurrentSession()` uses the same evidence and refuses ambiguous `sa_session` before a false success. Correct unique session tokens retain URL-decoded `=`, ordinary cookies stay independent, anonymous logout stays idempotent. Auth and other user domains continue through their existing canonical APIs/UI.

## Precise release boundary

This is a **narrow source-development closure** only. `scripture-archive.com` deployed SHA, live auth/D1 migration state, real browser handling of duplicate Path cookies, Windows package and physical NVDA **NOT_VERIFIED**. No Sites deployment, mail dispatch, real users, secrets or production database writes. #689 historical migration/cutover hazard, #297 coordination, #705 delayed-response cookie gate, source rights and other SA-EXT-16 acceptance remain separate.

**Official disposition:** `SA-EXT-16 / AMBIGUOUS_SESSION_COOKIE_IDENTITY — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; do not reopen without a specific defect.
