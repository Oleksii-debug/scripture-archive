# SA-EXT-02 / HISTORY_RENDER_UTC_TIMESTAMP_FAILCLOSED — scoped terminal

**Date:** 2026-10-30. **Disposition:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` for this exact HTML/history timestamp integrity defect only. Parent SA-EXT-02 and the other 19 complete SA-EXT parent sections remain **OPEN**.

## Before: independently reproduced

Canonical `public/workspace.js` source blob `7c06039fdd922804167082afb0f511aa4b589a4a`, loaded in isolated JavaScript V8, accepted `completedAt='not-a-timestamp'`, `2026-02-30 06:00:00`, and `2026-10-30 27:00:00`. The real `missionHistoryMarkup` displayed each invalid value as verified UTC and generated a completed-attempt route, rather than a localized fail-closed retry. A similarly malformed `startedAt` could create pending recovery links.

## Repaired, integrated, verified

- Reuse canonical mission UI; `canonicalHistoryUtcTimestamp` enforces exact SQLite/D1 `YYYY-MM-DD HH:MM:SS` string shape and real UTC round trip. Present invalid completed or pending timestamp makes the whole untrusted history payload show existing localized retry and suppresses links and review suggestions. Preserve legitimate timestamps and historic optional-field compatibility; no new route/server/schema.
- Source [PR #716](https://github.com/Oleksii-debug/scripture-archive/pull/716) **SQUASH MERGED**, exact source `main@99ac8af0f5e7fa6cb9bcf154d26b5c64e45602dc`.
- Read back merged-main source `public/workspace.js@9068f62616d3d014e755ad38e73031e14d3c517a`, new regression `tests/history-render-utc-timestamps.test.mjs@4f7ca8c2cf380f8e7840917882c07933cb19d8c1`, revised legacy contract test `tests/attempt-recovery-history.test.mjs@55c81866ee7816208bc3122730ec59d13d916adf`.
- Source-executing regression: 31 invalid variants × both completed and pending surfaces = **62** distinct negative cases, six valid canonical UTC positive cases, one legacy compatibility case.
- Initial exact-head CI [#41059196280](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41059196280) was RED due to an outdated legacy test expecting an escaped but invalid `<date>` to be rendered. The contract test was updated to match the stricter fail-closed behavior. **Final exact-head Actions [#41059402059](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41059402059) SUCCESS**, head `ef5846f14854c9e254a60a0d0f618aca3fc16d77`: native Node **1956 PASS / 0 FAIL / 1 SKIP**, TypeScript/lint/build PASS, disposable Worker/D1 **22/22 PASS**, Python **2/2 PASS**.
- Postmerge GitHub source/test blob readback and PR merged state verified at exact source integration SHA above.

## Closure boundary

`section_id=SA-EXT-02`; `subfeature=HISTORY_RENDER_UTC_TIMESTAMP_FAILCLOSED`; `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0`; `status=CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. Reopen this narrow defect only with new reproducible regression.

**NOT VERIFIED:** full SA-EXT-02 parent, all 20 parent sections, production deployment/version/D1, SMTP, Chrome E2E, physical Windows/NVDA, other user journeys and rights. No deployment, site settings, users, real data or scheduled jobs changed. Coordination [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297), [#78](https://github.com/Oleksii-debug/scripture-archive/issues/78).
