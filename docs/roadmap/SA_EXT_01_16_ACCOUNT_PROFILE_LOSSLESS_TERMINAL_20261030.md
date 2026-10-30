# Scripture Archive — SA-EXT-01 / SA-EXT-16 account profile and consent lossless terminal receipt (2026-10-30)

## Final disposition
- Scope: existing canonical private account profile / sensitive-consent fields only.
- Status: **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** for this fixed defect.
- `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0`.
- **Parent SA-EXT-01…20 remain OPEN.** No SITE_RELEASED, WEB_PASS, WINDOWS_PASS, NVDA_PASS or multi-language release claim.
- Changed integrated source PR: [#644](https://github.com/Oleksii-debug/scripture-archive/pull/644), squash MERGED.
- Exact integrated main: `829852b7ab4fb15f7b8fa8900fc1f27b64359354`.
- Source `app/api/account/route.ts` blob `0fa931d594cfceac70153ef036a457fcc413fbc8`.
- Tests `tests/account-profile-lossless.test.mjs` blob `c2b4d17175609af837baddede926a4a8afb7104e`.

## Actual behavior delivered
The canonical route rejects overlong user-authored `firstName`, `lastName`, `ageRange`, `tradition`, `maritalStatus`, `gender`, `church` and `locale` in profile update, and rejects overlong `tradition`, `denomination`, `church` in consent update, **before** D1 writes and with private 400. Previously `clean()` could silently truncate them and acknowledge a different saved value. Existing trim, field maxima, consent semantics, authentication, same-origin and D1 authorities are unchanged. Exact-limit Unicode values are permitted.

## Actual executed qualification
- Initial exact PR run [#41043431768](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41043431768) found 1 invalid test expectation: supplied `ageRange` fixture was 10 characters, exactly the permitted maximum. This was fixed, not hidden.
- Final exact PR head `0899a81f50b9c525eacda9e7e4d0b33cecad7d6f`: [CI #41043710457](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41043710457) native Node **1548 PASS / 0 FAIL / 1 SKIP**; TypeScript, lint, build **PASS**; Python **2 PASS**. Includes 11 negative/no-D1-write and two successful boundary cases in new test.
- Disposable Worker/D1 **21/22 PASS** and overall run **FAIL** on unrelated existing `POST /api/material-review` proxy restart `Your worker restarted mid-request` / HTTP 503. Tracked independently in [#618](https://github.com/Oleksii-debug/scripture-archive/issues/618). Do not misstate full CI green.
- After squash merge, GitHub exact `refs/heads/main`, PR merged state, two file blobs and merge SHA compare all read back identical.

## Separate pending outcomes
No real-browser, installed Cloudflare Sites SHA, production D1, email/DNS, Windows/WebView2, physical NVDA, full 82 languages, or whole SA-EXT-01/16 acceptance performed here. Deployment not authorized by this receipt. New optional enhancements and other parent subtasks are outside scoped closure.

Central coordination: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297#issuecomment-6520934854), approved plan [#295](https://github.com/Oleksii-debug/scripture-archive/issues/295).
