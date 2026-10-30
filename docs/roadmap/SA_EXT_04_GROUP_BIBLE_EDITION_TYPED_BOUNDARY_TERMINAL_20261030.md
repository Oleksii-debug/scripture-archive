# SA-EXT-04 — group Bible edition typed input / source-terminal receipt

**Date:** 2026-10-30. **Scope:** one narrow source defect, not parent SA-EXT-04 closure.

**Status:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0`.

**Original behavior:** `POST /api/groups?action=create` called `clean(body.bibleEdition,40)||"uk-ohiienko"`, silently discarding explicit JSON nonstring values and returning HTTP 201 for a different selected edition. This could misrepresent the source used by a group.

**Accepted behavior:** explicit JSON array, boolean, number and object `bibleEdition` are rejected as `400 invalid_edition` before any D1 group/owner/cohort write. Omitted, null and blank HTML-style inputs preserve Ukrainian default; a valid trimmed edition persists exactly. Unchanged canonical group permissions, privacy, source allowlist and marathon.

**Merged PR:** https://github.com/Oleksii-debug/scripture-archive/pull/646; exact feature `main@b163f5e637d71b0908ca05459127c982e37016da`; source `app/api/groups/route.ts` blob `d99dd08ddf02d037e9d1b53aa900cba8e1baac35`, test `tests/groups-numeric-input-boundary.test.mjs` blob `28ff59fc81c67311d7ea93ce6119bb0bc3c454fc`.

**Actually run:** exact PR-head GitHub Actions 41044060725, head `874805f0117a538ea30510e5da98e9fe25a71b8b`: native Node 1559/1559 PASS, including 9 new actual transpiled route + SQLite/D1 regression cases; TS/lint/source-build/Python validation steps PASS. **Overall CI FAIL** because independent disposable Worker/D1 suite `tests/api-flow.test.mjs` returned 503 `Your worker restarted mid-request`; 21/22 PASS, known issue #618. No live Sites deployment, full browser E2E, Windows or physical NVDA acceptance was executed or claimed.

**Governance:** all 20 SA-EXT parent Sections remain OPEN. There is no new feature roadmap, new Bible license, user-data migration, release approval, or automatic publication from this receipt. Narrow repair must not be rebuilt without concrete regression. Existing #297 owns continued work; #618 owns Worker/D1 reliability and production acceptance remains separate.
