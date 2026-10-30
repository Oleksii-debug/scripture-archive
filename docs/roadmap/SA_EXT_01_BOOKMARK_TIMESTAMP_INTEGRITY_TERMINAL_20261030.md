# SA-EXT-01 — BOOKMARK_CREATED_AT_CANONICAL_INTEGRITY — scoped source terminal

**Date:** 2026-10-30. **State:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` for this exact post-existing-reader improvement only. **Full SA-EXT-01 and all SA-EXT-02…20 parent sections: OPEN.**

## Source and integration proof
- Canonical existing private route: `app/api/bookmarks/route.ts`.
- User-facing destination: existing Scripture Archive Bible reader saved bookmarks and pre-existing explicit corrupt-bookmark recovery controls. No detached/demo application.
- Old risk: `usableBookmark` treated any nonblank saved `created_at` as valid, including nonexistent Gregorian dates and random text, advertising corrupt bookmark metadata as healthy.
- Repair: validate year/month/day, leap-year Gregorian dates and hours/minutes/seconds; accept canonical existing date-only, D1 UTC and ISO UTC representations; quarantine invalid legacy rows into existing warning/recovery state. Existing authenticated owner-scoped GET and explicit delete contracts remain unchanged; GET never writes.
- Feature PR: https://github.com/Oleksii-debug/scripture-archive/pull/737 — squash merged `dce3ef081f4e3fd7a8e8cf30a77d3f19c842d054` into `main`, verified via GitHub readback and identical ancestry.
- Exact production-source blob: `a9bbc84d3d35741ca81a748ed6b6eb96c4209993`.
- Exact new native-route test blob: `6c93b7da089a30fbba64ab36291c45b06b9a9348`.

## Executed verification, including negative regression
- Initial head Actions #41063336039: **FAIL**. A double-escaped new regex prevented valid timestamps from matching; the failure was diagnosed from the actual Node job logs rather than dismissed or relabeled.
- Corrected exact-head workflow https://github.com/Oleksii-debug/scripture-archive/actions/runs/41063500627: **SUCCESS**; actual executed steps: native Node 2092 PASS / 0 FAIL; disposable Worker/D1 22/22 PASS; TypeScript, ESLint, source build, Python 2/2 PASS.
- Exact corrected TS helper independently executed in isolated JavaScript: 9 legitimate + 35 malformed timestamp cases = **44/44 PASS**. This is helper-level evidence, not a second complete Worker suite.
- No code remains only in an unmerged PR for this subfeature, `remaining_scoped_implementation=0` and `necessary_unmerged_prs=0` for this scope.

## Not asserted
Not a complete SA-EXT-01 or all-platform terminal; no verified live Sites deployed SHA, Chrome/NVDA physical acceptance, independently licensed editions or editorial linguistic review, email/SMTP, production D1 cutover or final release. No site deployment; keep other workers' active PRs untouched. A new demonstrated regression can receive a narrowly scoped repair without reopening settled source wholesale.

**Coordination:** https://github.com/Oleksii-debug/scripture-archive/issues/297
