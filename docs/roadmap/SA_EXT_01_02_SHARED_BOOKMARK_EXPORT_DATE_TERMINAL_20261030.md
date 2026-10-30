# SA-EXT-01/02 — SHARED_BOOKMARK_EXPORT_DATE_INTEGRITY — canonical source scoped terminal (2026-10-30)

**Status:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` for the **specific inconsistency** between private bookmark navigation and owner reading-data export date validation. `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` for this bounded feature. **All 20 complete SA-EXT-01…20 parent sections remain OPEN**; no whole-platform completion or deployed product claims.

## Real code path and user behavior

Previously, `GET /api/bookmarks` (fixed in #737) quarantined impossible `created_at` records such as `2026-02-30`, but `GET /api/reading-export` returned such records in a supposedly restorable owner export on a mere nonblank-text check. The export did not have the same canonical protection.

The real routes now both import one shared pure Gregorian validator `lib/bookmark-timestamp.js` (blob `4bbb6af3b098428ab7c2b0f9dd539705ba791dec`). This is extracted byte-for-byte in behavior from the already approved reader: valid historical date-only, D1 `YYYY-MM-DD HH:MM:SS`, and ISO UTC including milliseconds remain accepted; impossible days, timestamps, offsets, blank and malformed legacy rows fail closed.

- Canonical `app/api/bookmarks/route.ts` unchanged in behavior, now references the common helper. Still exposes explicit damaged-row warning/recovery and never deletes on GET.
- Canonical authenticated `app/api/reading-export/route.ts` (merged blob `bd67ebb5227a299de7072a1af3a4ab3584189c8b`) rejects damaged timestamp rows with `503 export_unavailable` **without attachment**, rather than falsely claim successful recoverable JSON. D1 is **not** mutated. Existing #748 progress dedup, 2000 limit, access rules, metadata, real data and successful exports retained.
- Existing route-source VM test harnesses (8 files) use the true imported helper instead of a fake implementation. `tests/reading-export-batch-ack.test.mjs` (merged blob `2cc3f5188f07466702f841f6db7bd00b9d756892`) adds 6 malformed timestamps and 5 valid timestamps at actual GET/export boundary, including zero attachments for invalid cases.

## Precise integration and executed validation

- [Functional PR #760](https://github.com/Oleksii-debug/scripture-archive/pull/760), **SQUASH MERGED** into `main@cee442ed79d08b7913be0c555eb74e8168c92c68`; checked native merged PR and exact main ref, `compare(merge SHA, main)=identical` immediately after merge. It modified exactly 11 paths: two canonical routes, one shared helper, eight existing tests.
- Exact accepted source PR head: `64d62936cfccdb10da2f2964f5cb736fb4ca25bb`.
- [GitHub Actions #41067071110](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41067071110), on **that exact head**, completed **SUCCESS**: Node native suite, TypeScript, ESLint, build, disposable Worker/D1 integration, and Python validator steps all **SUCCESS**. Initial merge hit GitHub 405 (concurrent base-ref movement), not a source test failure; refreshed actual main/ref/overlap and successfully merged with unchanged head SHA and green CI.

## Strict limits

The private export does not automatically repair or delete corrupt saved data; explicit UI recovery remains with the account owner. No production D1 or Cloudflare Sites mutation, owner data, public scheduler or domain configuration was made. No live Cloudflare installed SHA, real browser, Windows/NVDA or external email/SMTP proven by this source merge. The full SA-EXT-01 and SA-EXT-02 parent sections remain OPEN.

**Central coordination and handoff:** https://github.com/Oleksii-debug/scripture-archive/issues/297
