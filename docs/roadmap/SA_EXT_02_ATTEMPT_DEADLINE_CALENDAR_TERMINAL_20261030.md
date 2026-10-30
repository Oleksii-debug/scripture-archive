# SA-EXT-02 — CANONICAL_ASSESSMENT_DEADLINE_CALENDAR_INTEGRITY — scoped source terminal

**Date:** 2026-10-30. **State:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` ONLY for the strict calendar/clock validation of saved active-assessment deadlines. The full SA-EXT-02 and the other 19 approved parent sections remain **OPEN**. This is not evidence of deployment.

## Implemented in the existing assessment authority

- Canonical `app/api/attempts/route.ts::attemptDeadline` now validates exact Gregorian UTC year, month, day and second-level clock before returning a deadline.
- Rejects normalized impossible dates including 2099-02-30 and non-leap 2100-02-29, invalid hours/minutes/seconds, timezone offset/ambiguous short text and malformed/typed storage.
- Preserves real D1 `YYYY-MM-DD HH:MM:SS`, legitimate historical `YYYY-MM-DD` and explicit `YYYY-MM-DDTHH:MM:SSZ` records, including 2096 leap day. The canonical database itself stores deadlines with `datetime('now','+2 hours')`.
- Prevents corrupt deadlines from disclosing task content or authorizing an answer, without changing other group-personal isolation, D1 transaction receipt or authentication logic. No new server.

## GitHub integration evidence

- Functional PR https://github.com/Oleksii-debug/scripture-archive/pull/746 — **squash MERGED** into the canonical `main@16926cca4bd81e6d267f635c597be110fada3823`.
- Exact PR head `c49605e2d87890502fa40db8552077dcf72a09b6`; exact-head https://github.com/Oleksii-debug/scripture-archive/actions/runs/41064837337 — **SUCCESS** (completed `source-and-disposable-integration` check), native Node / TypeScript / lint / build / disposable Worker-D1 / Python checked in this workflow.
- New regression cases added to the existing actual-route harness `tests/attempt-expiry-failclosed.test.mjs`: positive D1/ISO UTC/leap-day and 37 negative typed/date/clock/offset scenarios across task GET and answering; source-scope isolated check 44/44, not substituted for CI.
- Post-merge `PR.merged=true`, `compare(merge SHA,main)=identical` at acceptance; main production route blob `9560f683902086c3f310a902bf9cb704fb9b84a7`.
- `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` for only this specific source integrity boundary.

## Outside closure

Full SA-EXT-02 curriculum/memory/real logged-in end-to-end, actual Sites deployed SHA, production D1 migration status, email/password reset, Windows/NVDA and independently licensed/textual QA are **NOT_VERIFIED**. Do not claim whole section completion, live release, or work on the already terminal narrow guard again absent a demonstrated regression.

Coordination: https://github.com/Oleksii-debug/scripture-archive/issues/297
