# SA-EXT-05/06 — DOSSIER_ARRAY_METHOD_ACCESSORS — scoped source acceptance

Date: 2026-11-02. **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL only for this array-method accessor boundary.** SA-EXT-05/06 parents remain **OPEN**, as do 01/02/07; 03/04 remain source-terminal. This is not a production release or human accessibility acceptance.

## Proven source defect and canonical repair

The shared `validateDossierGraph` and the dossier/atlas markup in `public/scripture-dossiers.js` invoked `books.keys()`, `books.some()`, `books.map()` or `catalog.books[lang].map()` directly on publisher catalogue arrays. In-memory arrays with an own or inherited accessor shadowing any such method could run that accessor or throw before the accessible source-validation outcome. This is a source-level trust-boundary defect, **not evidence of a live exploit**.

The existing validator and renderers now call the native `Array.prototype.keys/some/map` implementations directly, retaining the existing own-data book checks, 200-book and chapter/verse bounds, verified source links, and localized accessible error state. No new service, DB, API, corpus or publishing-rights assertion.

## Exact evidence

- [Functional PR #1206](https://github.com/Oleksii-debug/scripture-archive/pull/1206) **SQUASH MERGED**; exact qualified head `517c1cdf6d45f8206c1823b2244de48cf3b7512a`; integrated `main@14d4f3ae2e4a929d5fd93989292aae678168b57b`.
- Exact merged blobs: `public/scripture-dossiers.js@ce5edb013d9f50571586f056cec36e427bd15eef`, `tests/dossier-search.test.mjs@0b5ade7d1041bd03ebacddc2c692fb8e15bcf9f8`. Both verified by post-merge `main` readback.
- [Exact-head GitHub Actions #41423525121](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41423525121) **COMPLETED SUCCESS**: native Node 4427 PASS / 1 SKIP / 0 FAIL; TypeScript PASS; lint PASS (13 warnings, 0 errors); build PASS; disposable Worker/D1 37/37 PASS; existing Python validators 2/2 PASS.
- Regression: 3 languages (uk/ru/en) × 3 array methods (keys/some/map) × 2 origins (own/inherited) = 18 cases; no accessor execution in graph validation, dossier or atlas; canonical reader links retained for valid catalogues, invalid chapter metadata denied with `role="alert"` and no reader links, and repaired catalogue recovered.
- No full local native checkout or physical Windows/Chrome/NVDA run was available. The GitHub Actions run, not a synthetic local check, supplies the native source-quality evidence.

## Remaining scope

`remaining_scoped_implementation=0`; `necessary_unmerged_scoped_PRs=0` **only for this defect**. SA-EXT-05/06 still require broader approved dossier/atlas material, independently checked sources and rights, editorial acceptance, real keyboard/NVDA/browser testing, and production Sites/D1/backup/release qualification before any parent TERMINAL. SA-EXT-01/02/07 remain OPEN; 03/04 source-terminal.

No 82-language expansion, new release, production migration, payments, synthetic users, mass mailing, dating service or secret publication was performed. Coordination: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).
