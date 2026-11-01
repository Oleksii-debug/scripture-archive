# SA-EXT-01 — READER_EMPTY_SEGMENTS_AND_LEGACY_HASH — scoped terminal receipt (2026-11-01)

**Scope:** one canonical reader-route integrity/accessibility repair, **not** the parent SA-EXT-01 or product release.

## Reproduced source defects

On exact pre-fix `main@8215dc6c14770fe9104317120ee7fde8678472e0`, `route()` used `split("/").filter(Boolean)`, so explicit empty path segments were silently discarded. Source-executed V8 showed `/reader/GEN//3` rendering Genesis 3, and `/reader/GEN/3/group//g_123` or `/reader/GEN/3//group/g_123` being accepted as the valid group route. That can misrepresent a malformed link's chapter/group identity; it is **not** evidence of a production incident. Separately, a valid legacy `/#/reader/GEN/3` entered `renderReader` but returned before rendering because the post-catalog guard checked only `location.pathname` rather than the active hash route.

## Existing-authority repair and regression

- Reused the canonical `public/app.js::renderReader`, its existing localized `role="alert"` + `/reader` recovery and current server-side chapter/group/attempt authority. No parallel reader, API, schema, D1 migration, or new service.
- Inspect the active raw pathname or legacy hash path **before** catalog/attempt/book fetch; reject doubled separators without mutating saved reader state. Preserve modern personal/group routes and one trailing slash; allow valid legacy `#/reader` routes to reach the existing reader.
- Added `tests/reader-empty-path-segments.test.mjs`: three languages × modern/legacy routing, five malformed and three valid paths per mode, plus early-rejection ordering. The exact candidate reader-entry V8 execution passed **48/48** route cases; this is not physical browser/NVDA qualification.

## Exact integration and verification

- [Functional PR #1117](https://github.com/Oleksii-debug/scripture-archive/pull/1117) **SQUASH MERGED** `main@ec7e9a2b21e49d6dab2c6e4ab4c09dffb0c4de47`; PR exact head `f3215f07792e1df3db5577cb70ed9ef7253a187b`.
- Verified post-merge source blob: `public/app.js@8d0a064cc2f40a0ae26c09784c58d8f40581abcd`; regression blob: `tests/reader-empty-path-segments.test.mjs@62357467e95ea6b2b3ac78b304bf530eeba1981c`.
- [Exact-head GitHub Actions #41278079344](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41278079344): **COMPLETED SUCCESS**, native Node **4087 PASS / 1 SKIP / 0 FAIL**, disposable Worker/D1 **37 PASS / 0 FAIL**, Python **2 PASS**, TypeScript contracts, lint (13 warnings, 0 errors) and source build PASS. This is genuine hosted CI, not a local full checkout.

## Closure boundary and remaining work

`CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` applies **only** to `READER_EMPTY_SEGMENTS_AND_LEGACY_HASH`: `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0`. **Parent SA-EXT-01/02/05/06/07 remain OPEN**; SA-EXT-03/04 remain source-terminal. Outstanding parent acceptance: verified text/edition rights, broader content and editorial review, real Chrome/Windows/physical NVDA, deployed Sites/D1/backup and release #689. No claims of production acceptance, release, migrations, 82-language launch, payments, synthetic users, mass mail or dating. Draft #325 remains untouched.
