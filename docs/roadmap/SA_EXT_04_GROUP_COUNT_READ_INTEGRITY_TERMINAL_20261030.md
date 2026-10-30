# SA-EXT-04 — GROUP_PUBLIC_COUNT_INTEGRITY: scoped terminal receipt

**2026-10-30 — РОЗДІЛ SA-EXT-04, тільки підпункт `GROUP_PUBLIC_COUNT_INTEGRITY`: ЗАКРИТО ДЛЯ ПОВТОРНОЇ РОЗРОБКИ / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.**

**Остаточний код у `main`: `9d3e8b2aa856384324228682cd4043f7726e9bff`**, [PR #724](https://github.com/Oleksii-debug/scripture-archive/pull/724), squash merged, GitHub verified `merged=true`, feature merge ancestor of current main. No necessary unmerged PR for this exact repair.

## Real canonical functionality

The existing `app/api/groups/route.ts` `publicGroup` already rejected corrupt `answers_correct`, `answers_total` and `chapters_completed`, but did not validate D1 `COUNT()` columns `member_count`, `session_count`, `cohort_size`. It silently coerced a missing count to zero, showed negative/fractional membership or session totals as ordinary 200 results, and converted nonnumeric cohort data to `null` in JSON. Actual unmodified publicGroup source was executed and these fail-open cases reproduced before the change.

**Fixed at the only canonical group endpoint:** validate all three COUNT columns as nonnegative safe integers before any public or member summary is returned; otherwise use the existing HTTP `503 groups_unavailable` with `Cache-Control: no-store, private`. Valid counts, legitimate zero counts, study percentages and masking of private roster size are retained. This does not create new data authorities, modify the D1 schema, publish data, or deploy the site.

## GitHub source/test identities (read back from merged main)

- Product source: `app/api/groups/route.ts`, blob `ded650b260eaef568d154358d35bc966e45e3f5e`.
- Real-route regression: `tests/groups-public-count-integrity.test.mjs`, blob `d8d5f3f2a0959fb8fd02752d19dfb8fa5c5b46df`.
- Existing reflection-privacy fixture repair: `tests/group-reflection-privacy.test.mjs`, blob `bfe7f26f61e875cddb8660c0625c315b3b04b423`. Its former fake SELECT omitted `cohort_size`, while the actual SQL COUNT returns numeric zero; corrected the fixture without bypassing the guard.

## Executed evidence

- Pre-change actual-source V8 reproduction: malformed count data was accepted as valid (RED).
- Post-change actual-source V8: **69/69 PASS** over three derived counters, corruption classes and private/public-roster projections.
- [Exact PR-head CI #41060270624](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41060270624), head `8c805c0ad750de1dc606547e441ac1d708f6fcb1`: **SUCCESS**. Native Node **1998 PASS / 0 FAIL / 1 SKIP**, disposable Worker/D1 **22/22 PASS**, TypeScript **PASS**, ESLint **0 errors** (warnings remain), source build **PASS**, canonical Python **2 PASS**. The new real-route test exercises 33 distinct corrupt field/value classes each against public/mine and public/private roster variants (132 denial scenarios), valid/zero/private projections and existing score protection.
- Earlier CI #41060069378 **FAILED** on three existing synthetic group privacy rows missing `cohort_size`; the fixture was repaired, fresh exact-head CI above passed. Never substitute the earlier failed attempt for the passing one.

## Final scoped state and boundaries

`remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0`; `source_merged_to_main=true`; `source_tests_qualified=true`.

**Parent SA-EXT-04 and all 20 full SA-EXT-01…20 sections remain OPEN**, including unimplemented future expansion and production acceptance. The 26 October Sites v10 deployment handoff does **not** prove today's installed source SHA. No actual production D1, DNS/SMTP, browser, keyboard/physical NVDA or Cloudflare Sites release was verified or changed by this PR. Do not redevelop the specific group-count guard without a newly reproduced defect or a new approved requirement.

Coordination and owner board: [issue #297](https://github.com/Oleksii-debug/scripture-archive/issues/297), canonical [20-section plan](SCRIPTURE_ARCHIVE_EXPANSION_SECTION_PLAN_2026-10-28.md).