# SA-EXT-01 / PARALLEL_RIGHTS_ACCESSOR_ADMISSION — scoped source terminal (2026-11-01)

**Scope only:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; `remaining_scoped_implementation=0`; `necessary_unmerged_scoped_PRs=0`. **Parent SA-EXT-01 remains OPEN**, as do SA-EXT-02/05/06/07. SA-EXT-03/04 are already source-terminal. This is not release, editorial, browser or deployment acceptance.

## Source-level defect and repair

The canonical shared `validEditionRightsMetadata` checked that publisher/title/license/source fields were own properties, but accepted accessor properties. A stateful own getter could return an approved title during validation and a different title when the comparison or clipboard citation was built. This is an in-memory metadata-integrity boundary; ordinary parsed JSON does not create getters, and no production exploitation is claimed.

The existing `public/parallel-reader.js` validator now refuses any accessor-backed present `title`, `license`, `source`, `attribution` or `licenseUrl` without invoking it. Required and optional metadata contracts, normal plain/null-prototype records, canonical reader UI, two chapter attempt checks, locale fallback, and retry remain unchanged. No parallel reader/service, new API, DB schema, or licensed corpus was added.

## Exact integration and tests

- Functional [PR #1152](https://github.com/Oleksii-debug/scripture-archive/pull/1152) **SQUASH MERGED** into `main@fdbe0c8943ac92e2bad87881fbf0d07034b040f1`; exact tested PR head `2f49e115341cad44e3d00685f5a00ac696d80625`.
- Read back exact merged blobs: `public/parallel-reader.js@fec38539cba7b7f78235c600e776eca5a321260f`, `tests/parallel-reader-accessor-rights.test.mjs@c9c6ff8da925a2e185a591f34667ddf1c0c21db7`.
- [Exact-head GitHub Actions #41323272614](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41323272614) **COMPLETED SUCCESS**: native Node **4268 PASS / 1 SKIP / 0 FAIL**; disposable Worker/D1 **37 PASS / 0 FAIL**; canonical Python **2 PASS**; TypeScript, lint, build **SUCCESS**.
- The new native source-import regression tests cover all five accessor fields without executing getters, valid own-data and null-prototype rights, inherited optional-field denial, and actual parallel reader mounting in Ukrainian/Russian/English with no unverified verse disclosure, two active-attempt checks and available keyboard retry.
- Local isolated extracted-predicate reproduction: original code accepted an accessor and returned a changed title after validation; corrected extracted logic passed 13/13 assertions. This is **not** a full native checkout test. Native CI is the full source evidence.

## Remaining parent work and restrictions

SA-EXT-01 still requires verified lawful source/translation rights, independent editorial acceptance, real Chrome/Windows/NVDA keyboard journey, and installed Sites/D1/backup/release acceptance. Broader approved edition coverage and the other SA-EXT-02/05/06/07 requirements remain open. No production deployment/migration, release publication, 82-language rollout, payments, synthetic users, mass email, dating service, or secret disclosure occurred. Draft [PR #325](https://github.com/Oleksii-debug/scripture-archive/pull/325) was not modified.
