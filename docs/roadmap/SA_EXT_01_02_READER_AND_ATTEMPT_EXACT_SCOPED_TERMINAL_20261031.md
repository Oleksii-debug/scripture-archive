# Scripture Archive — scoped source terminal receipts, 2026-10-31

Canonical source repository: `Oleksii-debug/scripture-archive`. These are **two bounded accepted repairs**, not full parent-section closure, Windows/NVDA testing, website deployment or release approval. No replacement or duplicated implementation was created.

## SA-EXT-01 / READER_CATALOG_EXACT_CODE_CHAPTER_LIMIT — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

- Proven source defect: `public/app.js::validBibleCatalog` accepted any nonempty `book.code` and any positive integer chapter count, enabling a malformed catalog to pass the gate before browser reader URL/DOM/fetch construction.
- Canonical fix: require `^[A-Z0-9]{3}$` (same code envelope as the existing canonical build-manifest tests) and `Number.isSafeInteger(chapters)`, range 1–200. Applied to all 66 canonical books in three locales and to additional edition book lists.
- Exact production and regression: `public/app.js` blob `652c56c7b6143b956e60605a9f843da91b3f9cb6`, `tests/reader-catalog-runtime-boundary.test.mjs` blob `6d88101330ee7a67cf385ce1a6893d7f5758cec5`.
- GitHub source PR [#866](https://github.com/Oleksii-debug/scripture-archive/pull/866) **SQUASH MERGED** into `main@91e59f5a6fe9810e2a9637eadff4238621f058e5`; exact-head [CI run 41172736372](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41172736372) **SUCCESS**: native Node, TypeScript, lint, build, disposable Worker/D1 and Python source validators all completed successfully.
- Current-main post-merge readback confirms both exact blobs persist. `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` for **this fix only**.

## SA-EXT-02 (intersects previously terminal SA-EXT-04) / ATTEMPT_GROUP_IDENTIFIER_EXACTNESS — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

- Proven source discrepancy: `app/api/groups/route.ts::boundedIdentifier` refuses whitespace aliases, while `app/api/attempts/route.ts::requestedGroupId` silently converted `" group-1 "` to `"group-1"`, potentially targeting another exact group key when saving/consuming reading and assessment receipts.
- Canonical fix: refuse leading/trailing-whitespace group IDs instead of trimming; preserve absent/null/empty personal mode and valid exact group IDs. No second router, DB or group authority.
- Existing real-route test `tests/attempt-group-context-typed.test.mjs` now rejects leading, trailing, length-prefix and whitespace aliases for both `read` and `start`; legitimate personal/group flows remain tested.
- Exact production blob `da5242f781c3b04a5f08afc832f61f99b46f9cad`; regression blob `0c48d3ac9cf095701b2c0152ed92d867ce60d65e`.
- GitHub source PR [#867](https://github.com/Oleksii-debug/scripture-archive/pull/867) **SQUASH MERGED** into `main@39108a68fa37bbf6020a33d0dc43ec8511cf0ea0`; exact-head [CI run 41172834341](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41172834341) **SUCCESS** (Node/TypeScript/lint/build/Worker-D1/Python).
- Current-main post-merge readback confirms both exact blobs persist. `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` for **this fix only**. Original SA-EXT-04 full source scope remains **CLOSED_FOR_DEVELOPMENT / TERMINAL** (this is a concrete narrow regression repair, not a reopening).

## Full parent status / unfinished acceptance

- **SA-EXT-01 and SA-EXT-02: OPEN** as approved; licensed translations/provenance and broader missions/repetition content are still incomplete.
- **SA-EXT-03 and SA-EXT-04: source-development TERMINAL**, already closed before this operation. Do not reimplement them without a demonstrated defect or new requirement.
- **SA-EXT-05…20** remain OPEN except already terminal scoped records inside them; this receipt does not promote any parent.
- Historical Sites handoff is not proof of installed live SHA. Chrome E2E, actual hosted D1, SMTP/DNS, physical Windows/NVDA, full source corpus/rights, owner-scheduler, legal/partner acceptance and publication are **NOT_VERIFIED** here. No deployment, funds, bulk emails, dating launch or live-data edits were performed.
- Pre-existing draft PR [#325](https://github.com/Oleksii-debug/scripture-archive/pull/325) is diverged and is NOT implied ready to merge; other open R06 stacks are separate. Two changes here had no required unmerged PR after actual integration.

**Final scoped classification:** each of the above two precisely named defects is `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; replay or speculative re-development prohibited without a new concrete regression or approved scope change. The full plan remains open, and user-visible production readiness must not be fabricated.
