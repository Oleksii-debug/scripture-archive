# SA-EXT-07 — Academy canonical-source-kind labels — scoped terminal closure (2026-10-31)

**Розділ SA-EXT-07 / ACADEMY_SOURCE_KIND_LABELS — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** This closes this specific previously missing published lesson feature, **not** the full approved SA-EXT-07 course, multimedia, review/rights, accreditation or release scope.

## Actual user-visible implementation
- In the existing `public/scripture-academy.js::academyMarkup` for canonical `/academy`, every valid source-linked Bible passage in all 13 already published lessons now visibly distinguishes its approved `source.kind` `narrative` vs `interpretive` (comparison, **not** independent historical proof).
- Only supported `uk/ru/en` labels are used and safely escaped. All 13 lesson and place tracks, question lists, original `/reader` links, progress controls, local import/export and account separation, focus behavior and read-only offline fallback retain prior behavior.
- Uses the same validated public `scriptureDossiers` source kinds, not another evidence graph, claimed independent witness, Bible text copy, server or DB. Invalid catalogue fails closed before any source link.

## Exact integrated GitHub evidence
- Source PR [#913](https://github.com/Oleksii-debug/scripture-archive/pull/913) **SQUASH MERGED** into `main@49969688fe575d4aefcedfbb5669511436b90285`. Tested exact PR head `513ff29846ec88b315920a3d97a2da3b729e62c9`.
- Canonical production blob `public/scripture-academy.js@2042637740f1a0952b195dc94f97c76739e52961`.
- New regression blob `tests/academy-source-kind-classification.test.mjs@04a0a126cb5cf6f353270da2238e0b4491f4fdde`; loops all 13 lessons across all three languages (39 lesson-locale paths) and every source within them; includes proper reader URLs, narrative/interpretive labels, fail-closed malformed catalog, read-only progress and unsupported language fallback. These are coverage paths, not an assertion of 39 independently completed features.
- Exact-head [GitHub Actions #41184940966](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41184940966) **COMPLETED SUCCESS**; job ID `124489857805` logs fetched. Native Node **2978 PASS / 0 FAIL / 1 SKIP** (2979 total), TypeScript, ESLint, source build, disposable Worker/D1 **22/22 PASS**, Python validators **2/2 PASS**.

## Scoped terminal verdict and external nonclaims
`status=CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`
`remaining_scoped_implementation=0`
`necessary_unmerged_feature_PRs=0`

**Full SA-EXT-07 parent OPEN:** expanded audited curricula, reviewed non-Scripture courses, genuine licensed audiovisual materials, course acceptance and real external user/NVDA verification remain separately unapproved/unfinished. Full SA-EXT-03 and 04 are already CLOSED; SA-EXT-01/02/05/06/08–20 parents remain OPEN despite individual scoped repairs.

**No publication:** source merge and CI are not production release. No exact installed Sites SHA, live production D1/SMTP/DNS, Chrome physical keyboard/NVDA on Windows, human rights/licence review or release verified. Historical production consent issue #689 stays OPEN. No user data, external mail, scheduled worker or site deployment was modified.

**Do not reimplement this closed feature** unless there is a new approved requirement or reproducible regression. Use existing GitHub governance #297/#78/#295.
