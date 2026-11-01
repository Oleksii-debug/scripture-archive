# SA-EXT-01 — failed-provenance transient reader context (scoped acceptance, 2026-11-01)

**Status: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL for this specific source defect only.** The parent SA-EXT-01 remains **OPEN**; SA-EXT-02/05/06/07 remain **OPEN** and 03/04 are source-terminal under the active closure order.

## Source defect and minimal repair

Before this change, `renderReader` assigned `state.currentReader` after selecting a chapter and retained it when `localEditionMetadata` or `editionDetails` rejected the publisher/licence. The existing outer route error remained responsible for the accessible error UI, and PR #1141 already protected the last saved bookmark; however, the rejected chapter still owned a transient reader context. A cross-tab attempt invalidation listener can consult that context. This is a **source-level** finding, not an observed production incident.

The canonical `public/app.js` now clears `state.currentReader` and rethrows the original error on either provenance failure. No new service, alternate reader, API, D1 schema, release, or production migration was introduced. The previously readable `state.reader` and `sa.reader` are untouched. Successful rights admission and optional-storage-denied reading retain the current reader lease.

## Exact integration and executed checks

- Functional [PR #1144](https://github.com/Oleksii-debug/scripture-archive/pull/1144) **SQUASH MERGED**, source head `2c4cda3a04ab7c95fc0e49061d6c98adf50cf944`, exact integrated `main@8f5ce7b8c482d6fe2509d6c6eaae6ce00fc343be` (read back).
- Exact merged source blob `public/app.js@89bc5ae6ccb448658c6adb48d7d179767669f011`; regression blob `tests/reader-bookmark-provenance-order.test.mjs@49e4dc163e41863a954ee765a5a600cc66f9fc47`.
- [Exact PR-head Actions #41313075912](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41313075912): **COMPLETED SUCCESS**. Native Node **4229 PASS / 0 FAIL / 1 SKIP**, disposable Worker/D1 **37 PASS / 0 FAIL**, Python validators **2 PASS**, TypeScript, lint and build **SUCCESS**. The native test executes the actual reader source slice and checks publisher-rights and edition-details failures for uk/ru/en, unchanged saved bookmarks, zero preference writes, successful admission and storage-denied recovery.
- Main readback confirmed the merged code and regression assertions. No full local checkout or physical browser/NVDA test was performed by this worker; GitHub Actions is the actual native execution authority.

## Remaining work and non-claims

`remaining_scoped_implementation=0` and `necessary_unmerged_scoped_PRs=0` **only for this precise transient-reader/provenance defect**. Full SA-EXT-01 needs approved corpus and publisher rights, editorial acceptance, end-to-end browser/Windows/NVDA, actual Sites/D1/backup and release evidence. SA-EXT-02/05/06/07 have separate open requirements. No parent TERMINAL, installed Sites qualification, release approval, or production success is claimed. No 82-language launch, production migration, payment, synthetic users, mass email or dating service was started.
