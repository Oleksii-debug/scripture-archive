# SA-EXT-02 — COMPLETED_RESULT_RECEIPT_CONSISTENCY — source terminal receipt

**2026-10-30 — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** only for canonical completed-attempt score/total consistency; **not** the full parent SA-EXT-02. All 20 SA-EXT parents remain OPEN.

## Shipped user function
- Existing authenticated `GET /api/attempts?action=current&attemptId=...` and idempotent `POST /api/attempts?action=finalize` retries return a completed assessment only when `result_json` is an object whose safe integer score/positive total agree exactly with the saved D1 columns.
- Missing/corrupt JSON, primitive/array payloads, wrong types, negative/fractional/out-of-bounds or nonmatching score/total fail closed with private no-store HTTP 503 `attempt_state_invalid`, never `completed:true`. Valid scores, owner-specific results and group receipts remain operational. No record modification or second server.

## Exact source, tests and integration
- Feature [PR #710](https://github.com/Oleksii-debug/scripture-archive/pull/710) **SQUASH MERGED** exact `main@8ff4618473d25551a6839ecd3a1bfaf7942fbf4e`.
- Source `app/api/attempts/route.ts` blob `2ebbbba5c5b4ede75505448c1408973c31f24a2a`.
- Real-route SQLite negative/other-principal/recovery test `tests/attempt-recovery-history.test.mjs` blob `5dacf5304242687182895875615d793e16b99021`.
- Existing lifecycle fixture adapted to actual D1 persisted columns: `tests/attempt-status-failclosed.test.mjs` blob `d9d96594e1f74f6c5ceeca116c2218314f70d155`.
- First exact-head run [#41058611230](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41058611230) **FAIL** from incomplete old fixture (mock omitted score/total); corrected. Final exact PR head `ab72eabac41c1044e6f2d8016372f9733359f560` [Actions #41058847951](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41058847951): **SUCCESS** Node/TS/lint/build/disposable Worker/D1/Python.
- Coordinated at [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297#issuecomment-6523361029).

## Closure limits
`remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` for this specific bug only. No full section closure or Windows/NVDA/browser/Sites/SMTP/rights acceptance. No production release or private data migration.
