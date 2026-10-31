# SA-EXT-02 — EXACT_ATTEMPT_IDENTITY_ON_READ_AND_MUTATION — scoped terminal (2026-10-31)

**РОЗДІЛ SA-EXT-02, лише підпункт `EXACT_ATTEMPT_IDENTITY_ON_READ_AND_MUTATION`: ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.**

## Real canonical implementation and defect

Previously the existing `app/api/attempts/route.ts` called `clean(value,80)` for durable attempt IDs, silently trimming a wrong explicit identifier such as `" attempt-1 "` into the real `"attempt-1"`. The same account could unintentionally retrieve, invalidate, grade or finalize a different saved attempt than the exact identifier it supplied. Overlong or wrong-type inputs were likewise not validated as durable identities.

All four canonical GET current / POST invalidate, finalize and answer operations now share a single typed exact-identity parser (ASCII alphanumeric, underscore or hyphen; length 1–80; no coercion, case transformation, trimming, hidden control/Unicode or truncation). Invalid IDs get the established private `attempt_not_found` 404 before any durable D1 lookup/write. **Important compatibility**: GET still calls canonical authentication to preserve the established `database_unavailable` 503 when the identity service fails, rather than misleadingly reporting 404; ownership checks remain on the unchanged `ownedAttempt` path.

No duplicate server, session authority, group API, database migration or new platform route was introduced. The current real interface keeps using the existing API.

## Verifiable source, integration, tests

- [PR #860](https://github.com/Oleksii-debug/scripture-archive/pull/860) **SQUASH MERGED** at exact `main@e4d154632fe850516d9206d4e567a5940662fa32`.
- Canonical source blob: `app/api/attempts/route.ts` = `761dce1e3df976ff14781e689f68f8cf6240cc6d`.
- Canonical test blob: `tests/attempt-status-failclosed.test.mjs` = `d9428c2ad3e7091bbec9ca1d4dc19bc07e3cf78f`; 12 malformed IDs × 4 actual GET/POST handlers + 6 wrong-typed IDs × 3 POST actions + one missing GET; existing positive assessment tests retained.
- First exact-head run `ee317a98b63e69a6f1044cecd50c0284c1a050ac` correctly **FAILED** one existing authorization-outage contract (404 vs 503). The source was repaired without weakening ID validation.
- Final repaired head `ec1c1308898fbc558ee7ae7e7b93fcc86b4ce5c2`: [GitHub Actions #41170903151](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41170903151) **COMPLETED SUCCESS** — native Node, TypeScript contracts, ESLint, production-source build, disposable Worker/D1 and canonical Python validation.
- GitHub merge status and exact source/test blobs read back from `main@e4d154...` after merge.

For **this exact bounded source defect** `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. Reimplementation is forbidden absent a new reproducible defect or explicit owner-approved requirement.

## Parent and release exclusions

**Full SA-EXT-02 remains OPEN** for the broader reviewed mission and repetition catalogue and accessible real-user acceptance. No claimed complete 20-section platform, real Chrome, Windows/NVDA hardware, Sites deployed SHA, production D1/SMTP or consent-cutover #689. No production release or migration occurred.
