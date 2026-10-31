# SA-EXT-02 — MALFORMED_MISSION_TASK_RETRY / CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

Date: 2026-10-31. This receipt closes the **specific source-renderer defect** in the canonical mission current/finalize response path. It does NOT close parent SA-EXT-02, content authoring, broader missions, production release or accessibility sign-off.

## Exact accepted behavior

- The canonical `public/app.js::renderMission` verifies a successful HTTP-200 response envelope before rendering, finalizing, or granting a playable answer form.
- For an active task, it verifies actual `single`/`multi` type, bounded safe integer `index/total`, a nonempty bounded question, and a dense bounded options array of meaningful strings. The check runs **inside** the existing request catch and triggers the localized accessible retry UI for malformed responses; it no longer dereferences a null task or maps a non-array outside the catch.
- Existing valid missions, native keyboard answer forms, server-only grading, principal/route epoch guards, retry after temporary errors, and completed attempt readback remain unchanged. No fake result or synthetic user data.
- Regression executes actual canonical renderer source in a V8 harness, checks 18 malformed successful `current` response variants and a malformed `finalize` result, preserves form submission for correct tasks, and verifies no grade leakage.

## Reproducible GitHub evidence

- Functional PR: https://github.com/Oleksii-debug/scripture-archive/pull/1027 — merged via squash into `main@ce0127de8140af8a7a3647b0c431eeb74ce26c10`.
- Production blob: `public/app.js@9ee9e1a4f56ffeebd261a673d7f835ac69b6e079`.
- Regression blob: `tests/mission-page-principal-race.test.mjs@ae9d8431339a39751ecd383376449dcaa789d7c7`.
- Exact PR head: `7a485733ed81b17229cdc85627067532d1497250`.
- Exact-head [GitHub Actions #41240578088](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41240578088) **COMPLETED SUCCESS**: native Node regression suite, TypeScript contracts, ESLint, source build, disposable local Worker/D1 end-to-end and canonical Python validators.
- Postmerge `main` was re-read at the above SHA; PR `merged=true`; both production and test blobs were verified on `main`.
- Tests ran on actual GitHub runner, not within this chat's local full checkout. Live Sites/current deployed SHA, production D1, keyboard browser session, physical NVDA and Windows package were **NOT_VERIFIED**.

## Closure boundary

`remaining_scoped_implementation=0`; `required_unmerged_scoped_PRs=0`; **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** only for malformed-task-HTTP-200 retry validation.

Parent SA-EXT-02 **OPEN**: wider authored missions/levels, rights/source review, real-user/production acceptance and full release. Parent SA-EXT-03/04 accepted source TERMINAL unchanged. Coordinator #297, release/cutover #689 remain OPEN. No production deployment, data modification, migration, email, payment or community automation. Do not redo this repair without a new concrete defect.
