# SA-EXT-01 — parallel publisher-rights citation lease (scoped source terminal, 2026-11-02)

**Scope:** `PARALLEL_RIGHTS_CITATION_LEASE` only. Parent SA-EXT-01 is **OPEN**; SA-EXT-02/05/06/07 are OPEN, 03/04 source-terminal. This is not release or editorial acceptance.

## Reproduced source-level defect

The canonical parallel reader rechecked chapter authorization and selected edition identity before copying a verse, but did not revalidate the publisher-rights record and catalog map after displaying the text. A changed licence, source URL, replaced rights record or newly declared translation could therefore leave the old provenance in a clipboard citation. No live exploitation or production incident was observed or claimed.

## Integrated repair

- Reused `public/parallel-reader.js`, existing own-data descriptor checks, chapter guards, and accessible `changed`/retry status.
- Snapshot the exact catalog edition/translation map identities, rights record and own-data fields after provenance admission; check unchanged authority both before and after the asynchronous citation guard.
- If rights mutate, maps/records are replaced, a translation is newly declared, or an accessor appears, retire the stale comparison and refuse the clipboard operation.
- Preserve a stable null-prototype rights record and normal citation. No parallel service, API, DB or new language.

**Code and six new native Node tests:** [PR #1186](https://github.com/Oleksii-debug/scripture-archive/pull/1186), **SQUASH MERGED** into `main@d73bfa5f1095ab1b933713a1346c7f4e8fbea406`. Exact source blob `3db5d5774f84bff085592636dfdf379413651cc4`; regression blob `cb1e568c60a477158c5f27d61822c30c0999572c`. PR head `aeaeca62567b1c2af10ff441d2e87b6873d5735b`, base `75d86277002f96c15f443ccfcecf4ed0be63f70c`.

**Exact-head hosted [Actions #41384826383](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41384826383): COMPLETED SUCCESS** — native Node **4395 PASS / 0 FAIL / 1 SKIP** (4396 total), TypeScript PASS, lint PASS (0 errors / 13 warnings), source build PASS, disposable Worker/D1 **37/37 PASS**, canonical Python validators **2/2 PASS**. Before the repair, isolated execution of the actual main-source module against the six new test bodies gave **1/6 PASS** (five defect reproductions); candidate isolated V8 **6/6 PASS**. Isolated V8 is not a native checkout or browser certification.

## Remaining work / truth boundary

`remaining_scoped_implementation=0` and `necessary_unmerged_scoped_PRs=0` **only for this named defect**. All approved SA-EXT-01 parent requirements, independently checked Bible editions/licences, editorial review, physical Windows/Chrome/NVDA keyboard acceptance, live Sites/D1, backup/recovery and release SHA remain **NOT_VERIFIED** or open. Draft [PR #325](https://github.com/Oleksii-debug/scripture-archive/pull/325) was not modified or merged. No new release, production migration, 82-language activation, payments, synthetic users, mass mailing, dating service or secret publication.
