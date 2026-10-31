# SA-EXT-07 — ACADEMY_CROSS_TAB_UNREADABLE_PROGRESS_REDACTION

**Date:** 2026-10-31  
**Scope:** precise post-implementation privacy/integrity defect in the existing canonical Academy progress UI; **not the entire SA-EXT-07 parent**.  
**Final scoped status:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.

## Observed defect

In the existing `public/scripture-academy.js`, a `storage` event for the active account whose new local marker record was corrupt/unreadable wrote an error message but left previously rendered `aria-pressed=true` markers, a non-zero progress meter, and even the completed badge visible. These became unverified representations of a private account's progress. The action buttons also remained apparently editable.

## Completed canonical fix

[PR #997](https://github.com/Oleksii-debug/scripture-archive/pull/997) was **SQUASH MERGED** into verified `main@0fed52491a1da282e70d6af22559ffbb315bef6f`.

- Production source `public/scripture-academy.js` exact blob `cffbe651c72159b9413e6782df44f4d246319969`.
- Regression tests `tests/academy-storage-events.test.mjs` exact blob `ac9e22e23b6de3d7b13bb9380d711149ae18e4d9`.
- The active account's unverified readback now clears old completion/checked markers and badges, disables personal marker buttons, and announces the **unknown** state, without claiming a cross-tab mutation never happened.
- A valid, principal-scoped later readback alone re-enables controls and reconstructs the correct foundation/place progress. Neither storage contents nor Biblical source links are overwritten.

## Executed checks (exact PR head)

Exact tested PR head `42237d6662ab107445250d7dec754ea770cca9c6`. GitHub Actions [source quality run #41225768705](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41225768705) **COMPLETED SUCCESS**: native Node **3495 PASS / 0 FAIL / 1 SKIP** of 3496; disposable Worker/D1 **24 PASS / 0 FAIL**; Python validators **2 PASS**; TypeScript, lint and source build **SUCCESS**. New regressions include corrupt/duplicate data, unreadable storage, completion badges for both lesson tracks, recovery and non-destructive storage behavior. The earlier run #41225531639 failed one test because the test expected incorrect English wording; the expectation and source status semantics were repaired before the successful exact-head run. Superseded intermediate runs were cancelled and are not counted as test successes.

Actual merged-main code and test blobs were read back independently after merge; this is **source integration**, not proof of physical Windows/NVDA or live Cloudflare Sites/D1 deployment.

## Terminal scoped closure

`remaining_scoped_implementation=0`; `necessary_unmerged_scoped_feature_PRs=0`; no disconnected production entry point. Reopen **this exact scope** only for a reproduced defect or newly approved requirement.

**SA-EXT-07 parent remains OPEN** for the approved broader courses (church history, family, ministry, music), reviewed audio/video/transcripts, licensed sources, author review and physical accessibility/production acceptance. SA-EXT-01/02/05/06 and other incomplete parent sections also remain OPEN. Previously accepted SA-EXT-03/04 parent terminal statuses are unchanged. No deployment, production migration, language roll-out, payments or outreach occurred.
