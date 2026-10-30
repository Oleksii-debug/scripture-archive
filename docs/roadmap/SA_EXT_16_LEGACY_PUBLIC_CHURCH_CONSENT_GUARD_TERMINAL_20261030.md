# SA-EXT-16 — HISTORICAL_PUBLIC_CHURCH_CONSENT_WRITE_GUARD — source-scoped terminal (2026-10-30)

**State:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` for the exact source protection against legacy public-church writes without current v1 consent; `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0` for this precise feature. This **does not** close the full SA-EXT-16 or any other SA-EXT-01…20 parent section.

## Production source and one authority

- Existing canonical user/profile/consent database; no parallel API, account system or second deployment.
- Migration `drizzle/0013_public_church_consent_guard.sql` first clears stale or invalid public visibility, then installs SQLite/D1 INSERT/UPDATE guards that reject `public_church=1` without both explicit `sensitive_consent=1` and `sensitive_consent_version=1`.
- Rejects an old writer trying to undo the privacy reset from migration `0010_sensitive_consent_evidence.sql` and an unsafe withdrawal that leaves a row public.
- Existing validated v1 opt-in and atomic consent withdrawal remain permitted; private profile text is preserved. No live data was changed.

## Exact GitHub integration

- Feature PR: https://github.com/Oleksii-debug/scripture-archive/pull/743 — **squash merged**, exact original integrated main SHA `0847c2089ffbb5b20cbfe6e08245f0b32f401e56`.
- Post-merge independent readback: PR `merged=true`, `refs/heads/main=0847c2089ffbb5b20cbfe6e08245f0b32f401e56` at acceptance; `compare(merge SHA,main)=identical` at that point.
- Migration source blob SHA: `988b1a6987a7fd762550182b9f3315d4fdf75bad`.
- Regression: `tests/legacy-migration-upgrade.test.mjs` executes the actual migration SQL including the pre-guard hazard, cleanup, denied writes, successful valid v1 consent, safe withdrawal and FK validation.

## Executed source qualification

- Exact PR HEAD: `68e999527a55241942c635d7ea210327d9e0b4d4`.
- Exact-head GitHub Actions: https://github.com/Oleksii-debug/scripture-archive/actions/runs/41064432625 — **SUCCESS**, completed `source-and-disposable-integration` check. This is source/CI evidence, not production acceptance.
- No unresolved PR review thread in the checked PR snapshot.

## Separate production risk (OPEN; do not auto-deploy)

Issue https://github.com/Oleksii-debug/scripture-archive/issues/689 remains open. Applying migration 0013 after an unsafe overlap does not undo a historical disclosure or authorize production cutover. Operator must first establish deployed old-writer SHA, actual production D1 migration ledger, backup/restore and write freeze/compatible worker activation, post-cutover authenticated checks and exact deployed SHA. Live Sites, browser/Windows/NVDA, SMTP and full SA-EXT-16 acceptance remain **NOT_VERIFIED**. Do not publish, run jobs, generate accounts or migrate production data on this receipt alone.

**Coordination:** https://github.com/Oleksii-debug/scripture-archive/issues/297#issuecomment-6524193148
