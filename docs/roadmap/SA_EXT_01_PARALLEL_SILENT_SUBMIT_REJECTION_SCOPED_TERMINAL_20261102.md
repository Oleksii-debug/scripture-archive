# SA-EXT-01 — PARALLEL_SILENT_SUBMIT_REJECTION_ANNOUNCEMENT

**Status:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` for this *one* error-recovery boundary only. **SA-EXT-01 remains OPEN.** No parent-section or production acceptance is asserted.

## Defect and canonical repair

The existing parallel-reader comparison could be in progress when a caller changed the native edition select programmatically without dispatching `change`. If the initial chapter authorization, second-edition `getBook`, or final chapter authorization rejected, the old request's catch returned with the accessible `role="status"` stuck on a loading announcement. The submit button was re-enabled, but a screen-reader user was not informed that the selected edition had changed.

Reused the existing `announceUnsignalledChange()` branch in all three rejection paths in `public/parallel-reader.js`. The active unchanged publisher still invokes the existing `failClosed()` assessment guard. Detached panels and native selection-change revisions cannot overwrite a newer reader's status. No second service, UI authority, API, schema, or data store.

## Exact GitHub evidence

- Functional PR [#1194](https://github.com/Oleksii-debug/scripture-archive/pull/1194) **SQUASH MERGED**, code integration `main@b59ba95e8f10755da99c6d4015657fa6e51c236e` (candidate head `9680cbd027b02a1f78bccf2b18255ca9a7fa1747`).
- Post-merge readback: `public/parallel-reader.js` blob `85fadfeb5d9a7d79883d016bba95e50aa74e9d9f`; new `tests/parallel-reader-silent-submit-rejection.test.mjs` blob `eeccfc6bd045719e032a2af22a43a0528954c02a`.
- [Exact-head Actions run #41395754824](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41395754824) **COMPLETED SUCCESS**: 4414 native Node PASS / 1 SKIP / 0 FAIL; disposable Worker/D1 37/37 PASS; Python validators 2/2 PASS; TypeScript, lint and source build PASS. Lint: 13 warnings, 0 errors.
- Five new top-level Node regressions cover first guard, `getBook`, and final guard rejections with silent selection changes in uk/ru/en, retry/recovery, stale-text suppression, and unchanged-publisher fail-closed behavior. Full native checkout was unavailable in this executor; the recorded PASS comes from exact-head GitHub Actions, **not** an invented local test.

## Remaining work / explicit boundaries

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **for this one boundary**.

**Parent sections SA-EXT-01, 02, 05, 06, 07 remain OPEN; SA-EXT-03/04 are source-terminal.** The full approved reader/missions/dossier/atlas/academy acceptance, independent Bible edition rights and editorial review, physical Windows/Chrome/NVDA, production Sites/D1 and backup/release fidelity are not verified by this change. Conflicting draft #325 was neither changed nor merged. No new release, production migration, 82-language rollout, payments, synthetic users, mass mail or dating service.
