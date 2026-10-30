# SA-EXT-04 / INVITE_ROTATION_EXACT_PREDECESSOR — scoped source closure

**2026-10-30 — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ лише `SA-EXT-04 / INVITE_ROTATION_EXACT_PREDECESSOR`**, `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. Parent SA-EXT-04 and all 20 SA-EXT parents remain OPEN.

An authorized group owner formerly could submit the actual 32-character predecessor invite code plus a suffix to `POST /api/groups?action=rotate-invite`. The existing `clean(body.expectedInviteCode,32)` truncated it to the valid predecessor before D1 compare-and-swap; a wrong version could therefore rotate the invite. Existing auth and actor controls were not bypassed, but exact token equality was broken.

Existing canonical `app/api/groups/route.ts` now reuses its already integrated `boundedIdentifier(...,32)` for the expected invite code: no truncation/aliasing, no alternate service or D1 schema. Real route-and-SQLite test `tests/groups-numeric-input-boundary.test.mjs` covers wrong suffix, trailing extra whitespace (400, no D1 mutation), and exact 32-character predecessor (200, one mutation).

- Original functional [PR #768](https://github.com/Oleksii-debug/scripture-archive/pull/768) SQUASH MERGED by integration into `main@dcad693792dae4b2fa38bde692e1d0dc3c3b065b` following full success on exact-head [Actions #41067830702](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41067830702) (head `26c75b2d3f3b3f8358ef8d7ace8193c826576f28`).
- Exact native job logs: **2193 Node PASS / 0 FAIL / 1 SKIP**, **22/22 disposable Worker/D1 PASS**, **2/2 Python PASS**, TypeScript/lint/build PASS.
- Readback merged main production blob `app/api/groups/route.ts@fe1077b06af2f7930ef12b0286cd758b3aec3b30`; test blob `tests/groups-numeric-input-boundary.test.mjs@ee2c68b025d2455eec5a1838c8ee4c5befe7e187`.
- `remaining_scoped_implementation=0`; `necessary_unmerged_prs=0` for this concrete defect.

**Not claimed**: full group/home marathon functionality acceptance, real production Sites SHA, D1 migration/backup, real browser/NVDA/Windows or SMTP. Production deployment was not performed. Continue through [coordination #297](https://github.com/Oleksii-debug/scripture-archive/issues/297) and owner [plan #295](https://github.com/Oleksii-debug/scripture-archive/issues/295); do not redo this narrow source work without a new reproduced regression.
