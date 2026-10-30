# SA-EXT-01 / READING_EXPORT_CANONICAL_TITLE_BOUNDARY — scoped terminal

Дата: 2026-10-30. **Тільки доведений вузький дефект, НЕ весь батьківський SA-EXT-01.**

**РІШЕННЯ: ПІДФУНКЦІЯ SA-EXT-01 / READING_EXPORT_CANONICAL_TITLE_BOUNDARY — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ / CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.**
`remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`.

- Source PR: https://github.com/Oleksii-debug/scripture-archive/pull/670 — squash MERGED.
- **Exact integrated main SHA:** `4cb564da6b705b1296e552c20ca8e2b7ade4f78f`.
- Canonical production handler: `app/api/reading-export/route.ts` (verified merged blob `c07b50718733527e91824c9389ab52ce43013492`).
- Native route tests: `tests/reading-export-batch-ack.test.mjs` (verified merged blob `d752a02c67d693ef444d917d14740eda4f4ee322`).
- Defect: account reader and writer refuse saved READING titles longer than **100** characters, but owner private archive previously accepted **101–200**, falsely advertising non-restorable history as a successful JSON backup.
- Behavior: canonical reading export now refuses non-restorable rows, including mixed good+bad receipts, with private HTTP 503 and **no attachment**; valid exact-100 Unicode/ASCII titles remain exportable. Seven new executing route regression tests, no separate API/DB, no change to private user data.
- **Full exact-branch GitHub Actions run:** https://github.com/Oleksii-debug/scripture-archive/actions/runs/41053249167 — SUCCESS; Node **1681 PASS, 0 FAIL, 1 SKIP** out of 1682; disposable Worker/D1 **22 PASS, 0 FAIL**; Python **2 PASS**; TypeScript, ESLint, build PASS. Job 124054272847.
- Post-merge readback: PR `merged=true`, main `4cb564da6b705b1296e552c20ca8e2b7ade4f78f`, ancestry `compare(merge,main)=identical`, confirmed source/test blobs.
- Source-scope reopened only if a *new reproduced defect or approved requirement*. Full SA-EXT-01 and all 20 parent sections **OPEN**, real Sites installed SHA/SMTP/browser/physical NVDA and Windows packaging **NOT VERIFIED**; no production publication authorized.
- Canonical coordination: issue #297, owner scope #295, continuous control #78. No duplicate development board or status inflation.
