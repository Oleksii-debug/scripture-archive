# SA-EXT-07 / ACADEMY_LESSON_WEBLOCK_SINGLE_FLIGHT — scoped source acceptance (2026-11-02)

**Scope:** One existing Academy lesson-marker interaction, not the SA-EXT-07 parent. This does not certify any course, publisher rights, Windows/NVDA session, or deployed site.

## Reproduced defect

The canonical `attachAcademy` lesson button did not disable itself or reject another activation while the browser Web Lock was pending. Two queued callbacks could execute serially: the first marked a lesson and updated `aria-pressed`, while the second read the newly changed state and immediately unmarked the same lesson. The visible user action could therefore be silently reversed. No new service or database authority was introduced.

- **Test-first RED:** [Actions #41522496510](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41522496510), test-only head `d7cc061fdf1b09c3cceb40f4d399e89b46a57de9`, completed **FAILURE**: 4522 native Node PASS / 1 expected FAIL / 1 SKIP. The failure was `focused action is disabled during the pending lock: false !== true` in the real `attachAcademy` event path; no claim of a whole-product RED acceptance.
- **Repair:** [PR #1236](https://github.com/Oleksii-debug/scripture-archive/pull/1236), **SQUASH MERGED** `main@533a17a19120c9e2802cd426d94f7e481fe21738`, exact qualified head `e8bd6ebea7a28a802aff4bfd076f7eee4fd96abe`. The existing lesson handler now has a per-button in-flight guard, disables the pending button, releases it after Web Lock success/failure, and restores keyboard focus only for the still-current view when focus has not moved. Reuses the already-present import/reset focus helper and lock namespace.
- **Exact-head GREEN:** [Actions #41522807785](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41522807785), completed **SUCCESS**: 4523 native Node PASS / 1 SKIP / 0 FAIL, 37/37 disposable Worker/D1 PASS, 2/2 Python PASS; TypeScript, lint (13 warnings / 0 errors), and source build PASS. Four focused regressions cover duplicate activation, rejected-lock retry, stale-view refusal, and focus non-theft.
- **Readback:** `public/scripture-academy.js` blob `75b837718fb8a1b22a5a8eda2b23eb4424dea941`; `tests/academy-lesson-single-flight.test.mjs` blob `3936e112cb60036643894d216dce143ddfc21e15` confirmed in merged `main`.

## Closure boundary

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **only for ACADEMY_LESSON_WEBLOCK_SINGLE_FLIGHT**. **SA-EXT-01/02/05/06/07 parents remain OPEN; SA-EXT-03/04 source-terminal.** Broader courses, media/transcripts, author/editor review, independent publisher rights, physical Windows/Chrome/NVDA, live Sites/D1/backup and release acceptance are **NOT_VERIFIED**. Full local native checkout was unavailable; test evidence comes from exact-head GitHub Actions, not a local PASS.

No 82-language rollout, new release, production migration, payment, synthetic users, mass email, dating product or secret publication.
