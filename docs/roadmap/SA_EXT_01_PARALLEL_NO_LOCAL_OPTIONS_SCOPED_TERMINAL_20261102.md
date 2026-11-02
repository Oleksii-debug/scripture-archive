# SA-EXT-01 — PARALLEL_NO_LOCAL_OPTIONS — scoped source acceptance (2026-11-02)

**Boundary:** accessible, honest empty-state handling for the canonical second-edition comparison selector only. **This is NOT a parent SA-EXT-01 TERMINAL, not a full translation or rights acceptance, and not a release.**

## Proven defect and correction

The accepted selector already excludes non-local, duplicate-ID and getter/inherited publisher records. When every imported edition was excluded, it nevertheless exposed an enabled native select with no options and an enabled submit. The user could reach only a generic failure, without an explanation that no comparison was possible.

[Functional PR #1201](https://github.com/Oleksii-debug/scripture-archive/pull/1201) **SQUASH MERGED** to `main@7dbe033245727bbc8b776d8aa37ec73c52bd1c9e` from exact tested head `db1ea31f4264097f0e929667740adf67624860b7`. The canonical `public/parallel-reader.js` reuses its existing admitted-options list; when empty, it disables both select and submit, and shows a visible `role="status"` explanation in Ukrainian, Russian or English. An admitted local edition retains normal native keyboard controls and the existing empty live status. No API, DB, new server, translation rollout or production change.

## Evidence

- Initial [CI #41409669695](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41409669695) **FAILED** three historical test assertions requiring the former enabled `<select name="edition">` for an all-rejected manifest. Those fixtures were corrected to require the disabled empty state, preserving all original getter/duplicate-ID rejection assertions; this initial run is **not** a PASS.
- Final exact-head [CI #41409817655](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41409817655) **COMPLETED SUCCESS**: 4424 native Node PASS / 0 FAIL / 1 SKIP; 37/37 disposable Worker/D1 PASS; 2/2 Python PASS; TypeScript, lint and build PASS (ESLint 0 errors, 13 warnings).
- Added four groups of regression checks for three localized empty states, all-invalid/duplicate manifest, normal valid local edition, and non-execution of an imported getter. Three legacy regression fixtures were updated without weakening the security guard.
- Merged main source blob: `public/parallel-reader.js@add67f41efa431cb836202b575928e8959a31c27`; regression blobs: `tests/parallel-reader.test.mjs@96395e35698ae5218055b26e6b6c5b04c4458831`, `tests/parallel-reader-duplicate-identity.test.mjs@d56d8a11ba2c5cddd12d1fbe38077046a145a424`, `tests/parallel-reader-edition-array-slots.test.mjs@ed86887c281d4b104ccaf39a25c68675ffc190f3`, `tests/parallel-reader-edition-descriptors.test.mjs@c31603289c7c09268d7fb6879517857b22afae07`.
- Post-merge source-quality run [#41410054896](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41410054896): **PENDING verification when this document was drafted**; do not infer PASS until confirmed.

## Closure boundary and remaining work

`remaining_scoped_implementation=0` and `necessary_unmerged_scoped_PRs=0` **for PARALLEL_NO_LOCAL_OPTIONS only**. Parent **SA-EXT-01, 02, 05, 06, 07 remain OPEN**. SA-EXT-03/04 are source-terminal and are not reopened.

Independent publisher-rights and editorial verification, physical Windows/Chrome/NVDA acceptance, real Sites/D1/backup, complete UI/API/DB journeys, and release remain **NOT_VERIFIED**. Existing broad draft #325 overlaps the reader source but is stale/conflicted and was not changed or merged; any future convergence must reconcile this main change. No 82-language expansion, release publication, production migration, payments, synthetic users, mass mail, or dating service was initiated.
