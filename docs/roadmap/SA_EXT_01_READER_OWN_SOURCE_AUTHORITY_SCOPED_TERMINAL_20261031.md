# SA-EXT-01 — READER_OWN_SOURCE_AUTHORITY / CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

Date: 2026-10-31. This closes **only** the reproduced canonical Bible-catalog inherited-source boundary, not the entire SA-EXT-01 parent section, the public website, or a Windows release.

## Integrated behavior

- The existing `public/app.js::validBibleCatalog` requires own `books` and `editions` containers, own uk/ru/en locale inventories, own book `code/title/testament/chapters` fields and own edition `id`; inherited values cannot certify a Bible book or translation source.
- Optional `editionBooks` rejects inherited enumerable source inventories. Both real production selectors (`getBook` chapter provenance and `renderReader` visible book metadata) use own-key lookup so an inherited alternate list cannot bypass validation.
- Preserve 66 canonical books, valid local Ukrainian Ohiienko alternate edition, Kulish primary fallback, and permitted null-prototype own-key inventories. No Bible content, editorial source, database, production data or approved rights were fabricated or rewritten.

## Evidence and exact GitHub ancestry

- Functional [PR #1030](https://github.com/Oleksii-debug/scripture-archive/pull/1030) — **merged=true**, squash integration commit `cf88f93a5f2714e1de0808500fd4e937232bbf71`.
- Production source `public/app.js` blob `120155b0e2e5b0aeae4225ae4edb57c68fbc3905`. Native regression `tests/reader-catalog-runtime-boundary.test.mjs` blob `25c3ba6d703fe6e896cb21dcbc833dab7d382459`. Both re-read from exact merged `main@cf88f93a5f2714e1de0808500fd4e937232bbf71`.
- Initial PR head `614a11b482ff118dfce1127a2b6e0b40ea2aa115` correctly **FAILED** native CI [#41240900178](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41240900178) due source-extracting test helper compatibility and cross-realm prototype behavior; this is **not** a successful test.
- Repaired exact PR head `bbeebe9316545d34eced64772b031e851a53d3ab`: [Actions #41241026959](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41241026959) **COMPLETED SUCCESS**, real completed GitHub Actions steps: native Node regression, TypeScript, lint, source build, disposable Worker/D1 integration, Python validators. The CI head was checked against the PR head immediately before merge.
- Post-merge GitHub readback: `main` equals the integration SHA, PR #1030 state closed/merged, exact source and regression blobs present. No separate local full-checkout, physical NVDA, Chrome, live Sites/D1, Windows package, real Bible edition rights or post-release acceptance was performed in this chat.

## Final scoped decision

`remaining_scoped_implementation=0`  
`required_unmerged_scoped_PRs=0`  
**`CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`** — *READER_OWN_SOURCE_AUTHORITY only*.

**Parent SA-EXT-01 remains OPEN.** Licensed edition sourcing, legally verified texts/attribution and overall reader/browser/physical NVDA and installed-release acceptance remain separate. SA-EXT-03 and SA-EXT-04 parent sections remain source-terminal; other expansion sections retain their existing statuses. Release #689 and coordination #297 are not closed.

No production deployment, D1 migration, changed user records, community activation, mail sending, payments, language bulk launches or separate dating service occurred. Do not reimplement this accepted narrow source fix absent a new demonstrated defect.
