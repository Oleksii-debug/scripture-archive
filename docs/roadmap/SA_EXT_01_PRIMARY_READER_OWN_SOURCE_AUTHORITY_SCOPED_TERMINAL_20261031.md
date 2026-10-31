# SA-EXT-01 — PRIMARY_READER_OWN_SOURCE_AUTHORITY — scoped terminal, 2026-10-31

**Scope:** only the canonical Bible reader catalog source-authority repair. **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**, `remaining_scoped_implementation=0`, `required_unmerged_scoped_PRs=0` for this named defect only. **SA-EXT-01 parent remains OPEN**; SA-EXT-03/04 remain their prior source-terminal status.

## Reproduced defect

On the exact prior `public/app.js` Git blob `9ee9e1a4f56ffeebd261a673d7f835ac69b6e079` with genuine `public/data/catalog.json` blob `ad471ce574861f7c66e2a913886c2bcb22f2afc3`, source-executed isolated V8 accepted **9/9** corrupted in-memory catalogs that inherited their primary locale maps, edition metadata, book provenance fields, or an alternate `uk-ohiienko` inventory. `Object.values(editionBooks)` checked only own values, while the actual reader selected inherited bracket-lookup entries. A forged inherited title could be selected without catalog validation. This is **controlled in-memory integrity evidence**, not a claim of a live remote exploit or a malformed JSON transport.

## Integrated fix

[PR #1030](https://github.com/Oleksii-debug/scripture-archive/pull/1030) **SQUASH MERGED** at exact source `main@cf88f93a5f2714e1de0808500fd4e937232bbf71`. Canonical `public/app.js` blob `120155b0e2e5b0aeae4225ae4edb57c68fbc3905`; `tests/reader-catalog-runtime-boundary.test.mjs` blob `25c3ba6d703fe6e896cb21dcbc833dab7d382459`.

- Require own `books` and `editions` containers, locale entries, per-book source fields and edition IDs before accepting 66-book inventories.
- Reject inherited enumerable alternate edition entries; select alternate inventories in both `getBook` and `renderReader` **only** through own-key lookup, never an unvalidated inherited list.
- Preserve real Ukrainian Ohiienko and Kulish selections, 66 canonical books, valid per-edition chapter-count differences, legitimate retry/cache, and null-prototype own-key inventories. No second reader/server/DB schema.

## Executed tests and CI honesty

- Exact old source + genuine catalog: **9/9 malformed cases RED** (incorrectly accepted).
- Exact patched source + genuine catalog: **11/11 isolated V8 positive/negative/recovery cases PASS** (not native browser or Node).
- Initial PR head `614a11b482ff118dfce1127a2b6e0b40ea2aa115`: [Actions #41240900178](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41240900178) **FAIL**. Native source-extracting harnesses lacked a newly added helper; prototype identity check rejected cross-realm JSON. Both were repaired without weakening the own-key boundary.
- Final exact PR head `bbeebe9316545d34eced64772b031e851a53d3ab`: [Actions #41241026959](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41241026959) **COMPLETED SUCCESS**: **3584 native Node PASS / 0 FAIL / 1 SKIP; 26/26 disposable Worker/D1 PASS; 2/2 Python PASS; TypeScript, lint and source build PASS**. Native tests execute actual canonical source and both own-key selectors. This is source/disposable integration, **not** production Sites/D1 or physical NVDA.

## Remaining parent and release gates

SA-EXT-01 remains **OPEN** for independently verified publisher/translation rights and editorial acceptance, broader approved edition/content scope, real Chrome/keyboard/physical NVDA acceptance, installed Sites SHA, production D1/backup and independent release gate. SA-EXT-02/05/06/07 remain OPEN, SA-EXT-03/04 source TERMINAL. **No production deployment, migrations, user-data mutation, new 82 languages, payments, synthetic accounts, bulk mail or dating product.**
