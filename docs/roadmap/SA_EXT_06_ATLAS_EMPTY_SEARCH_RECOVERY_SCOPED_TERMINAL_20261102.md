# SA-EXT-06 / ATLAS_EMPTY_SEARCH_RECOVERY — scoped source-level acceptance (2026-11-02)

## Scope and verified defect
The canonical text-first atlas is rendered inside the existing `/dossiers` workspace. When a valid GET search returned zero matching dossiers, its own `dossierAtlasMarkup` section used the **dossier catalogue** heading rather than the **atlas** heading and offered no atlas-local way to clear the filter. This was an accessibility/navigation defect, not a claim of lost content, a private-data leak or a live production incident.

## Reuse → repair → converge
- Reused the already localized `terms.title` atlas heading and `SEARCH_COPY[lang].clear` label in `public/scripture-dossiers.js`.
- Kept the existing `/dossiers` GET route, source validation, search semantics and all canonical Bible links. Only valid zero-result searches gain a direct `<a href="/dossiers">` recovery link.
- Added `tests/dossier-atlas-empty-recovery.test.mjs`: Ukrainian, Russian and English accessible heading/recovery, no unrelated reader/dossier links, valid and blank search preservation, malformed Unicode query and damaged catalogue fail-closed.
- No new UI authority, API, database, service, migration or deployment.

## Exact integration evidence
- [Functional PR #1239](https://github.com/Oleksii-debug/scripture-archive/pull/1239) **SQUASH MERGED** to `main@5ef2e8c65c5a1f82bbaf1fa51878891829514ac6`.
- Exact qualified functional head: `b1dec0c4472024af7c30eee465864ec8a6309930`.
- [Exact-head GitHub Actions #41531517417](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41531517417) **COMPLETED SUCCESS**: 4531 native Node PASS / 1 SKIP / 0 FAIL; 37/37 disposable Worker/D1 PASS; 2/2 Python validators PASS; TypeScript, lint and build PASS (13 lint warnings, 0 errors).
- Test-only run #41531455311 was **CANCELLED**, not a completed RED regression; no RED claim.
- Main readback: `public/scripture-dossiers.js` blob `09c7cde840f77244ccf5a3a3c88cf24bc1ef9f74`; `tests/dossier-atlas-empty-recovery.test.mjs` blob `4c31c42025c2576af7e60be2be1e3b71df0bbdc6`.

## Closure boundary
`remaining_scoped_implementation=0` and `necessary_unmerged_scoped_PRs=0` **only for ATLAS_EMPTY_SEARCH_RECOVERY**. **SA-EXT-01, 02, 05, 06, 07 parents remain OPEN; SA-EXT-03/04 source-terminal** under the active work sequence. Wider editorial and source-rights acceptance, physical Windows/Chrome/NVDA, live Sites/D1/backup, final release and all approved parent requirements remain **NOT_VERIFIED**.

There was no complete native local checkout. The native and disposable tests above ran in GitHub Actions on the exact PR head, not on a physical Windows/NVDA or production system. No 82-language expansion, production migration, release publication, payments, synthetic users, mass mail or dating service was launched.
