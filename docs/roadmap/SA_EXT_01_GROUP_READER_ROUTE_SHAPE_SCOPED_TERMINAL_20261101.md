# SA-EXT-01 — GROUP_READER_ROUTE_SHAPE — scoped development receipt (2026-11-01)

**State: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL only for this route-shape defect. The SA-EXT-01 parent remains OPEN.**

## Reproduced source-level behavior

The canonical `public/app.js::renderReader` previously set `groupId = parts[3] === "group" ? parts[4] || "" : ""`. Consequently `/reader/GEN/3/group` (missing group ID), `/reader/GEN/3/groups/g-1` (mistyped marker), and `/reader/GEN/3/group/g-1/extra` silently became personal reading/assessment links. This could misattribute a user-intended group attempt to personal progress. It is a source-level routing defect, **not evidence of a production incident**.

## Canonical repair and integration

[Functional PR #1111](https://github.com/Oleksii-debug/scripture-archive/pull/1111) **SQUASH MERGED** into exact `main@90c9ca621d4ce08776eda6fb524e7ec08e3ac26e`. Existing `renderReader` now accepts only no suffix or exactly `/group/GROUP_ID` with a nonempty ID; malformed/truncated/extra segments fail closed **before** the first chapter-attempt API request and before loading Bible text. It clears stale `currentReader`, shows the existing accessible `role=alert` and `/reader` recovery, and does not overwrite the saved bookmark. Valid personal, group and resume routes remain. Server-side group membership/ID checks remain authoritative. No new API, database or service.

Verified main blobs: `public/app.js@c7c3d2dbe34569bb100a5fc8d74ca9a00c2ea985`; `tests/reader-group-route-shape.test.mjs@97da605e05938e8d343f5e559cc46f9278cb2ca9`. After merge, GitHub PR reported `merged=true` and `compare(90c9ca6,main)=identical`.

## Actual CI evidence

[Exact-head GitHub Actions #41270514276](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41270514276), feature head `cd44213bc644307eb547ed2ba0f5194c8848be50`: **COMPLETED SUCCESS**. Native Node **4052 PASS / 1 SKIP / 0 FAIL** (4053 total); disposable local Worker/D1 **37 PASS / 0 FAIL**; Python **2 PASS**; TypeScript, lint and source build all **SUCCESS**. The new test source-executes the actual reader entry for UK/RU/EN, malformed suffixes, valid group/personal/resume and guard ordering. This is not a full local checkout, live browser or physical NVDA acceptance.

## Scope and remaining work

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0` **only for GROUP_READER_ROUTE_SHAPE**. Parent **SA-EXT-01/02/05/06/07 OPEN**, SA-EXT-03/04 source-terminal. Remaining: licensed/verified Bible editions, editorial/source acceptance, real Chrome/Windows/keyboard/physical NVDA, live Sites/D1/backup, group-journey acceptance, release #689. No production deploy, migrations, 82-language launch, payments, synthetic users, mass email, dating or secret publication.
