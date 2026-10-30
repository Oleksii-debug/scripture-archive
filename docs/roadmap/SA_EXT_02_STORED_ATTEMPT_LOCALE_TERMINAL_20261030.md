# SA-EXT-02 / STORED_ATTEMPT_LOCALE_FAILCLOSED — terminal scoped closure

Дата: 2026-10-30. **Це лише конкретний defect closure, НЕ весь батьківський SA-EXT-02.**

**РІШЕННЯ: SA-EXT-02 / STORED_ATTEMPT_LOCALE_FAILCLOSED — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ / CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.**
`remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`.

- Functional PR: https://github.com/Oleksii-debug/scripture-archive/pull/676 — SQUASH MERGED.
- Exact integrated main SHA: `f83954934c8b53f6664fa48a57b51c27600c3d9f`; actual source blob `app/api/attempts/route.ts@ef5decdffe2e710818a19a10d4166ac836bee637`; test blob `tests/attempt-status-failclosed.test.mjs@042d373a950a8fb9817255609379a7addc9c0b41`.
- Bug: although new POST start now validates JSON locales, a legacy or damaged persisted D1 `mission_attempts.locale` could carry `null`, unsupported language or array/object; GET current responded 200 with missing question/options; answering or grading accessed missing localized option arrays.
- Canonical repair: one `storedLocale` runtime guard protecting GET current, POST answer and grading/finalizer. Invalid stored locale -> private HTTP 409 `attempt_state_invalid`, zero task disclosure and zero assessment writes. The existing completed historical result replay is unchanged; valid `uk`/`ru`/`en` remain available.
- Test coverage: **48 newly added route-executing checks** in the existing lifecycle test file: 15 malformed locales × 3 independent operations (GET, answer, finalize), plus 3 valid persisted locales. Test fixture uses actual transpiled production route with D1/auth boundary; no fake second server.
- Exact PR-head CI https://github.com/Oleksii-debug/scripture-archive/actions/runs/41054194991 **SUCCESS**: Node **1738 PASS / 0 FAIL / 1 SKIP** (1739 total); disposable Worker/D1 **22 PASS / 0 FAIL**; TypeScript, ESLint, source build PASS; Python **2 PASS**. Job `124057465296`.
- Post-merge GitHub readback: merge `f83954934c8b53f6664fa48a57b51c27600c3d9f` equals main at time of verification; compare identical; source/test blob readback confirms changes.
- **Parent SA-EXT-02 and ALL SA-EXT-01…20 OPEN** pending full previously approved scope, real site/Sites SHA, physical Chrome/NVDA, SMTP and release controls. No release/deploy, extra languages, autoagents or duplicate boards. Reopen the scoped repair only for a new reproduced regression.
- Tracking: #297 canonical coordination, #295 owner expansion, #78 governance.
