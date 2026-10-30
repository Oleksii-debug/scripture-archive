# SA-EXT-04 — exact group identifier boundary: scoped terminal receipt (2026-10-30)

**Status:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. This receipt closes only the bounded identifier-alias defect in canonical Home Groups; **SA-EXT-04 and all 20 SA-EXT parent sections remain OPEN**. `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0` for this defect only.

## Reproduced source-level defect

In canonical `app/api/groups/route.ts`, user-supplied group IDs on GET and POST used the general-purpose `clean(value,80)` helper, which trims and truncates arbitrary text. An overlong identifier such as `"g" + " ".repeat(80)` could be normalized into the existing `g`, causing an authenticated caller's action to target a different stored identifier than the supplied input. This is an integrity/target-identity defect, **not** a reported authentication bypass.

## Integrated correction

- Existing API now uses `boundedIdentifier` for group and target-user IDs, rejecting overlong raw values instead of silently aliasing another record. GET on overlong group selector returns HTTP 400. Existing permission, owner, D1 transactional, and session logic is unchanged.
- Four new native Node/SQLite-backed regression cases in `tests/groups-numeric-input-boundary.test.mjs`: three malformed-ID mutation attempts (`session`, `rotate-invite`, `delete`) cause no D1 write; one valid short-ID case creates a real meeting.
- Functional [PR #758](https://github.com/Oleksii-debug/scripture-archive/pull/758) squash **MERGED into canonical main**, exact integration SHA `a394c0506bb7da7ccf8ab34c33be4b1758d3d294`; canonical source file blob after merge `0df34045ade4bed8b707daf120c1d2e5b6bbbe14`. Its merge was independently read back as current `main` with `boundedIdentifier` and the GET guard.
- [Exact-head Actions run #41066922814](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41066922814) **SUCCESS** on PR head `ebc50dbb59076078de69412145820e47ba820c54`: Node **2162 PASS, 0 FAIL, 1 SKIP**; disposable Worker/D1 **22 PASS, 0 FAIL**; TypeScript, ESLint, build and Python 2/2 PASS. GitHub job log and workflow status verified.

## Release and scope separation

No standalone implementation, schema migration, production D1 operation, site deployment, email/cron change, Windows package or physical NVDA claim was made. GitHub source integration is **not** evidence of current Cloudflare Sites release SHA or browser/NVDA acceptance. Any further work on this exact defect requires a new demonstrated regression. Do not mark the whole SA-EXT-04 section CLOSED.

**Next:** continue approved SA-EXT-01…20 backlog, exact-SHA production/site, privacy, SMTP, real-browser and owner acceptance under [coordination #297](https://github.com/Oleksii-debug/scripture-archive/issues/297) and [source plan](SCRIPTURE_ARCHIVE_EXPANSION_SECTION_PLAN_2026-10-28.md).
