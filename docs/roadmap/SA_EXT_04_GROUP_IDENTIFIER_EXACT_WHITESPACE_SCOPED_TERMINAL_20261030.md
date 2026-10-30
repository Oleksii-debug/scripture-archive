# SA-EXT-04 — EXACT GROUP IDENTIFIER NO-ALIAS: SCOPED TERMINAL (2026-10-30)

**Result:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, only for `GROUP_IDENTIFIER_NO_WHITESPACE_ALIAS`. **Parent SA-EXT-04 and all SA-EXT-01…20 remain OPEN.**

## Delivered and integrated
- Source PR [#791](https://github.com/Oleksii-debug/scripture-archive/pull/791) **SQUASH MERGED** to exact feature `main@3a09d787f0730b7abc6aa45600310a3e06b5307c`.
- Canonical `app/api/groups/route.ts` Git blob `5f05c98caf062f078fb5f0333b555da2edde3995`.
- Native route/SQLite regression `tests/group-membership.test.mjs` Git blob `03180e02911d0011c3a92c4b4cc2b5ce495d86ab`.
- Exact group ID, membership target ID and invite precondition no longer silently normalize whitespace to a different existing record. Invalid explicit GET group ID reports HTTP 400 rather than falling back to public discovery. Canonical IDs, existing ACL, CSRF, group role and invitation mechanics remain in the existing server authority.

## Executed verification
[Exact PR-head source-quality workflow #41075642458](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41075642458): **COMPLETED SUCCESS** on head `e78687c22f8c66b86e7bc1ca689915be7bd138d9`, job `source-and-disposable-integration`: native Node regression suite, TypeScript, lint, source build, disposable local Worker/D1 E2E, Python validators all reported success. The added real SQLite route test rejects encoded-whitespace GET, group invite mutation and role target aliases; rejected calls preserve actual database state, while canonical reads work.

**Scope boundary:** `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0` for this defect alone. This is NOT a full group/marathon feature completion or full SA-EXT-04 parent closure. Real published Sites SHA, live browser and physical Windows/NVDA remain `NOT_VERIFIED`; no production deployment, email or scheduler activation took place. Future modifications require a new evidenced defect or approved requirement. Original scope issue: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).
