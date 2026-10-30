# SA-EXT-04 — invite rotation exact predecessor: scoped terminal (2026-10-30)

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**, only `INVITE_ROTATION_EXPECTED_TOKEN_EXACT`. `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Full SA-EXT-04 and all 20 parent sections remain OPEN**.

## Scope and integration
The existing owner-only `POST /api/groups?action=rotate-invite` passed the caller-supplied `expectedInviteCode` through the generic `clean(value,32)`, silently trimming/truncating an overlong predecessor token into the currently stored invitation token. Even an incorrect `[valid 32-character code] + [extra bytes]` could therefore pass the SQL compare-and-swap predicate and rotate the invitation. Existing owner authorization was already present; this was a target/version fidelity defect, **not** an auth bypass.

The canonical API now uses the existing strict `boundedIdentifier(body.expectedInviteCode,32)`, preserves owner authorization and database compare-and-swap, and refuses a malformed predecessor *before* any update. Three source-executed SQLite-backed cases cover extra suffix, excessive trailing whitespace (both 400/no write) and a valid 32-character predecessor (200/actual rotation). No extra API, schema, server, service, email, scheduler, production data or deployment.

**Functional [PR #768](https://github.com/Oleksii-debug/scripture-archive/pull/768) MERGED:** exact merge SHA `dcad693792dae4b2fa38bde692e1d0dc3c3b065b`. GitHub readback confirmed its source and test blob hashes are identical to later current-main versions. Exact-head [Actions #41067830702](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41067830702) **SUCCESS** on `26c75b2d3f3b3f8358ef8d7ace8193c826576f28`: native Node, TypeScript, ESLint, source build, disposable Worker/D1 and Python validators passed. No claim of current live Sites SHA, browser/NVDA/Windows/SMTP acceptance.

**Terminal policy:** do not redevelop this one scoped bug without a new reproduced regression. Do not label the parent SA-EXT-04 closed. Coordinate other incomplete work at #297.
