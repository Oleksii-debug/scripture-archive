# SA-EXT-05/06 — VISIBLE_BOOK_TITLE_IDENTITY — scoped source acceptance

Date: 2026-11-02. **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL only for duplicate localized publisher book titles.** SA-EXT-05/06 parents remain **OPEN**, as do 01/02/07; 03/04 remain source-terminal. No release or physical NVDA acceptance is implied.

## Proven source-level defect and canonical repair

The existing `validateDossierGraph` checked unique publisher book **codes**, but did not reject two different codes with the same displayed localized title. The public dossier GET book-name search resolves labels to codes; a duplicated visible title can therefore represent multiple different sources and mislead reader/ARIA provenance. This is a source integrity risk, **not evidence of a production incident**.

The existing validator in `public/scripture-dossiers.js` now also checks uniqueness of publisher book titles per `uk/ru/en` catalogue after NFC normalization, whitespace trim and locale-aware lowercase, before dossier or atlas emits any reader link. The 66-book published catalogue has no such collisions. Existing own-data, book-code, chapter/verse, rights/provenance and native array-method guards remain unchanged. No new service, API, database, corpus, translation or publisher-rights assertion.

## Exact evidence

- [Functional PR #1209](https://github.com/Oleksii-debug/scripture-archive/pull/1209) **SQUASH MERGED**; exact qualified head `f6bad2d7462a6dbdc861466ae8b6eb6a6070b31d`; integrated `main@677d7b554b14963219a0db73a35d0d080b6b65f7`.
- Verified merged blobs: `public/scripture-dossiers.js@85032680fe7baaaf9f9125896ff00bf2cc5aeaf2`, `tests/dossier-search.test.mjs@16cdf408d052f4b163e7d354ee8953de7a406d53`.
- [Exact-head Actions #41431911488](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41431911488) **COMPLETED SUCCESS**: native Node 4429 PASS / 1 SKIP / 0 FAIL; TypeScript PASS; lint PASS (13 warnings, 0 errors); build PASS; disposable Worker/D1 37/37 PASS; existing Python validators 2/2 PASS.
- Regression: `uk/ru/en` × exact duplicate, case-equivalent and NFC-equivalent publisher titles = nine collision cases; both dossier and atlas show `role="alert"` without any reader link. Restoring distinct titles recovers both source-linked views. A separate isolated Node 22 predicate smoke passed; it is **not** counted as a native repository test.
- No complete local native checkout or physical Windows/Chrome/NVDA test was available. The exact-head GitHub Actions run supplies native source-quality evidence.

## Remaining scope

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **only for this title-identity defect**. SA-EXT-05/06 still need a wider independently sourced and editorially accepted dossier/atlas corpus, verified geographic and map rights, accessible text alternatives, real browser/NVDA acceptance, and live Sites/D1/backup/release evidence. SA-EXT-01 needs licensed edition coverage and provenance QA; SA-EXT-02 needs the wider mission/review catalogue; SA-EXT-07 needs the approved academy curriculum/media and editorial acceptance. Parents 01/02/05/06/07 remain OPEN; 03/04 source-terminal.

No 82-language expansion, new release, production migration, payments, synthetic users, mass email, dating service or secret publication was performed. Coordination: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).
