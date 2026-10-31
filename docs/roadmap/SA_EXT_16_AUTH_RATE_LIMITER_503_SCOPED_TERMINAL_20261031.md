# SA-EXT-16 / AUTH_RATE_LIMITER_UNAVAILABLE — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Date:** 2026-10-31. **Canonical source:** `Oleksii-debug/scripture-archive`.

## Exact accepted scope

Four `POST /api/auth` actions previously awaited `rateLimit` outside their failure handlers: `register`, `resend-verification`, `forgot-password`, `reset-password`. An unavailable D1-backed rate-limit counter could reject the Promise and escape as an unhandled route error. This was a concrete production-source reliability defect, not a request to redesign authentication.

## Final behavior

- `register`: limiter outage -> HTTP 503 `registration_unavailable`.
- `resend-verification`: limiter outage -> HTTP 503 `verification_unavailable`.
- `forgot-password` and `reset-password`: limiter outage -> HTTP 503 `password_reset_unavailable`.
- A confirmed rejected quota still yields HTTP 429 `too_many_requests` for all four actions.
- On limiter failure, no account identity read, D1 write, verification/reset token, email dispatch or session cookie occurs.
- Authorized, nonenumerating recovery/verification request responses and invalid reset tokens are preserved. No second auth implementation or schema migration.

## Source, integration, test evidence

- **Implementation PR:** [#882](https://github.com/Oleksii-debug/scripture-archive/pull/882), squash merged.
- **Exact feature `main` SHA:** `07e070639d5f6f14b25bc34d2bd0559888f20f28`.
- **Source blob:** `app/api/auth/route.ts@501f29adcb160d48b748220f4fcb9960a34f86cb`.
- **Regression blob:** `tests/auth-rate-limiter-unavailable.test.mjs@295c61b40d1afa6157fec8578a157ed594623bc4`.
- **New regression scenarios:** 11, using TypeScript compilation plus actual production `POST` handler in Node VM; four unavailable/503, four confirmed quota/429, two nonenumerating allowed controls, one invalid reset token.
- **Actual Actions run:** [41176856521](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41176856521), exact source PR head `f7022022d6397216488970ed64d0c3b03211a923`, `completed/success`. Executed job `source-and-disposable-integration` passed native Node regression suite, TypeScript, ESLint, production source build, disposable local Worker/D1 E2E, canonical Python validators (and supporting setup/teardown). This is real executed CI, not an empty/queued workflow.
- **Post-merge readback:** GitHub `main` exactly `07e070639d5f6f14b25bc34d2bd0559888f20f28`; both new content blobs read from default branch; #882 merged; source commit ancestry status `identical`.
- **Required unmerged feature PRs for this *exact defect*:** 0.
- **Remaining approved implementation for this *exact defect*:** 0.

### Terminal decision

**SA-EXT-16 / AUTH_RATE_LIMITER_UNAVAILABLE — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** No duplicate implementation is needed. Reopen this scope only for a specifically reproduced defect or a newly approved requirement.

**Not claimed:** whole parent SA-EXT-16 or any other open SA-EXT parent is not closed here. Live Sites deployed SHA, SMTP delivery in production, real browser, Windows package and physical NVDA remain `NOT_VERIFIED`. No production release or user-data changes occurred.

**Coordination:** [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297), [#78](https://github.com/Oleksii-debug/scripture-archive/issues/78), roadmap `SCRIPTURE_ARCHIVE_EXPANSION_SECTION_PLAN_2026-10-28.md`. Related independent origin/cookie/rate-limit QA must keep its own evidence, and this receipt is not a blanket closure of those tracks.
