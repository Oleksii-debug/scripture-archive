# SA-EXT-07 / ACADEMY_CATALOG_ARRAY_METHOD_ACCESSORS — scoped source terminal, 2026-11-02

## Precise scope and defect

**Only the Academy's catalogue array-method accessor boundary is CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.** The complete SA-EXT-07 parent remains **OPEN**, as do SA-EXT-01/02/05/06; SA-EXT-03/04 remain source-terminal. This is not release acceptance.

The existing `validateDossierGraph` correctly accepts canonical 66-book arrays with own or inherited `map` accessors without executing them, by calling native array methods directly. But the existing `academyMarkup` used `catalog.books[lang].map` after validation. A publisher-controlled getter on that array could execute or throw while rendering source-linked Academy lessons and accessible source labels, despite the source catalogue passing the guard.

## Test-first reproduction and repair

- **Test-only head:** `d366564c14f810e860c5502ed599f8ddcc690b9c`. [Actions #41513854753](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41513854753) **COMPLETED FAILURE**: 4508 native Node PASS, 1 expected FAIL, 1 SKIP. Actual failure `uk own must not execute the accessor` at `public/scripture-academy.js:106`, with getter throwing `untrusted catalogue map accessor executed`. Existing Python validators passed; downstream TypeScript/lint/build/Worker-D1 gates were skipped, not claimed PASS.
- **Repair:** same existing `public/scripture-academy.js`, using `Array.prototype.map.call(catalog.books[lang], ...)` exactly as the canonical dossier validator does; no new service, schema, DB or source authority.
- **Regression:** `tests/academy-catalog-array-method-accessors.test.mjs`, 3 languages × own/inherited `map` getter × editable/read-only course, all 13 source-linked lessons, normal reader links, no getter execution, no private marker controls in read-only mode; malformed book-title getter still fails closed without source links.
- **Qualified feature head:** `7913a9314799aec9f06fc66cd0cb9d442c5e8736`. [Exact-head Actions #41514089177](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41514089177) **COMPLETED SUCCESS**: 4509 Node PASS / 1 SKIP / 0 FAIL, 37/37 disposable Worker/D1 PASS, 2/2 Python PASS; TypeScript, lint and source build PASS.
- **Integration:** [PR #1233](https://github.com/Oleksii-debug/scripture-archive/pull/1233) **SQUASH MERGED** into `main@ff85eba2b6f7795b3d8c467bf118f40e3c7739e1`. Changed functional paths: only Academy renderer and the new test. Exact post-merge source/test blob readback is required separately from this merge receipt.

## Remaining and prohibited scope

`remaining_scoped_implementation=0` and `necessary_unmerged_scoped_PRs=0` **only for this exact accessor defect**. The Academy's wider courses, transcripts/media, independent publisher rights and editorial acceptance, physical Windows/Chrome/NVDA, live Sites/D1, backup/recovery and release evidence remain **NOT_VERIFIED**. No native local checkout was available: all full-suite PASS claims refer only to the linked GitHub Actions exact-head run.

No production deployment or migration, new release, 82-language launch, payments, synthetic users, bulk email, dating product or secrets were used.
