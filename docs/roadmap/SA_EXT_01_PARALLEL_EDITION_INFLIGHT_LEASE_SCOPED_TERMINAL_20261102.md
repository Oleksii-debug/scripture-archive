# SA-EXT-01 — PARALLEL_EDITION_INFLIGHT_IDENTITY_LEASE — scoped source terminal (2026-11-02)

## Decision
**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** only for the named in-flight edition identity and citation lease. **SA-EXT-01 parent remains OPEN**; SA-EXT-02/05/06/07 remain OPEN, SA-EXT-03/04 are source-terminal only. `remaining_scoped_implementation=0`; `necessary_unmerged_scoped_PRs=0` for this narrow defect only.

## Reproduced risk and repair
In the existing `public/parallel-reader.js`, changing an imported edition's `folder`, `contentId`, `title`, or replacing its record while a chapter guard or `getBook` awaited could leave the select's string ID unchanged and publish stale licensed verses under a changed edition authority. After a successful comparison, the same mutable manifest could authorize a stale clipboard citation.

The canonical reader now retains an own-data snapshot of the admitted record's publisher/path identity and checks exact object membership, unique ID, local eligibility, and stable fields after async boundaries. A changed record fails closed before a new file read or DOM publication. Clipboard actions revalidate before and after the assessment guard; a stale citation is not copied and the old comparison is cleared with an accessible status message. No second reader, API, DB migration or new service was added.

## Exact GitHub evidence
- [Functional PR #1183](https://github.com/Oleksii-debug/scripture-archive/pull/1183) **SQUASH MERGED** into `main@d7013d1936aa52275e0d6de0488cf16842860e20`; feature head `eb224ab66b1a0a8a1f777e143ecbbe690b1e5dda`.
- [Exact-head Actions #41379339135](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41379339135) **COMPLETED SUCCESS**, 4380 native Node PASS / 1 SKIP / 0 FAIL, including six new race/negative/control tests; TypeScript, lint (13 warnings, 0 errors), source build, 37/37 disposable Worker/D1 tests, and 2/2 canonical Python validators PASS.
- Separate V8 source preflight ran the six new tests with a minimal URL shim: 6/6 PASS. This is **not** counted as native Node or a second independent full suite.
- The old draft [PR #325](https://github.com/Oleksii-debug/scripture-archive/pull/325) touches the reader but is conflicting and unmerged. It was not modified or counted as qualifying this scoped fix.

## Explicit remaining work
All other requirements of SA-EXT-01 (edition rights/licensing and independent editorial acceptance, full canonical reader/attempt integration and release qualification) remain OPEN, as do SA-EXT-02/05/06/07. Real Windows/Chrome/NVDA, live Sites/D1, backup/restore, publisher permissions and production release are **NOT_VERIFIED**. No 82-language launch, production migration, release publication, payments, synthetic users, mass email, dating product, or secrets exposure occurred. The post-merge workflow is a separate verification gate and must not be called PASS until its actual conclusion is read.
