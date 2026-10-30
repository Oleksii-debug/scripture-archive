# SA-EXT-02 — ATTEMPT_DEADLINE_CANONICAL_UTC — scoped source terminal

**Date:** 2026-10-30. **Status:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` for this precise saved deadline corruption risk, not the full section. All 20 SA-EXT parent sections remain OPEN.

## User-visible function, single authority
- Existing actual mission service: `GET /api/attempts?action=current`, `POST /api/attempts?action=answer`.
- Before: `Date.parse` silently normalized malformed persisted dates, potentially treating a corrupt future D1 deadline as a valid live test and exposing assessment task content or accepting a response.
- After: `attemptDeadline` checks strict UTC Gregorian day and time against an exact constructed UTC timestamp. Accepts historical `YYYY-MM-DD`, SQLite UTC `YYYY-MM-DD HH:MM:SS`, and explicit `YYYY-MM-DDTHH:MM:SSZ`; rejects malformed dates, times, types, timezone offsets. Valid expired assessment behavior remains 410; bad persistence fails closed as 409, without new database writes. No duplicate service, migrations or release commands.

## Integrated exact source
- Feature PR https://github.com/Oleksii-debug/scripture-archive/pull/746, **SQUASH MERGED** `main@16926cca4bd81e6d267f635c597be110fada3823`.
- Source blob `app/api/attempts/route.ts@9560f683902086c3f310a902bf9cb704fb9b84a7`.
- Existing production-route-executing regression fixture updated at `tests/attempt-expiry-failclosed.test.mjs@f632db1777619ed7bc18d497c160483132967200`.
- Exact helper separately exercised: 7 good + 37 invalid values = **44/44 passing**. This isolated exercise does not replace native whole-suite tests.
- [Exact-head GitHub Actions #41064837337](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41064837337) **SUCCESS**: native Node **2147 PASS, 0 FAIL, 1 SKIP**; disposable Worker/D1 **22/22 PASS**; TypeScript contracts, lint, build and Python validators **2/2 PASS**. The existing route-level tests cover both task read and answer invalidation with no mutation on corrupt input.
- `remaining_scoped_implementation=0` and `necessary_unmerged_PRs=0` **only for this subfeature**.

## Unresolved parent and production gates
SA-EXT-02's wider mission catalog, full multilingual editorial/sources, browser and actual physical Windows/NVDA acceptance, installed Sites SHA and SMTP/email, production D1/privacy cutover, overall 20-section release remain OPEN and unverified. No release triggered or site settings altered. Only a new reproducible defect justifies redevelopment of this exact now-terminal subfeature.

**Coordination:** https://github.com/Oleksii-debug/scripture-archive/issues/297.
