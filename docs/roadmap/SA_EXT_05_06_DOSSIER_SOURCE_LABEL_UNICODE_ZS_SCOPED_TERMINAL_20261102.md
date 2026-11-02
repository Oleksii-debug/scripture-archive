# SA-EXT-05/06 — DOSSIER_SOURCE_LABEL_UNICODE_ZS — scoped source acceptance

Date: 2026-11-02. **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** only for the 15 non-ASCII Unicode Zs publisher-book-label admission defect. **SA-EXT-05 and SA-EXT-06 parents remain OPEN**, as do 01, 02 and 07. 03/04 are source-terminal. This is neither release acceptance nor physical accessibility acceptance.

## Defect and bounded repair

The existing `public/scripture-dossiers.js` already rejects U+1680, U+2000–U+200A, U+202F, U+205F and U+3000 in untrusted dossier/atlas GET search strings. The same file's `validateDossierGraph` did not reject these characters in the publisher's book title, allowing ambiguous or visually obscured source labels in reader links and ARIA names. No external archaeological or publishing-rights claim is made.

The canonical shared validator now refuses these characters in visible source metadata before either dossier or atlas renders any reader link. Existing ordinary localized catalogue labels and reader routes are unchanged. No new endpoint, database schema, service, corpus, user or production deployment was introduced.

## Exact code, integration and test evidence

- Functional [PR #1203](https://github.com/Oleksii-debug/scripture-archive/pull/1203), exact PR head `ec7fc9c0c7cbb967f8c52608effc9299c2f4e1e5`, **SQUASH MERGED** into `main@e503cff684e63db204b57a9f1387b6ebd9d16c6c`.
- `public/scripture-dossiers.js` blob `b5e4de3fcb953111cad03c5a28c652fceb8a593e`; `tests/dossier-search.test.mjs` blob `ed2e63cfe7e720f51d0d8fb3777bf2ae5540e96d`. Both read back from `main` after merge.
- [Exact-head GitHub Actions run #41416028380](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41416028380): **COMPLETED SUCCESS**. Native Node 4425 PASS / 1 SKIP / 0 FAIL; TypeScript PASS; lint PASS (13 existing warnings, 0 errors); build PASS; disposable Worker/D1 37/37 PASS; existing Python validators 2/2 PASS.
- New regression covers 15 separator characters × uk/ru/en and asserts `validateDossierGraph=false`, accessible `role="alert"` and no `/reader/` source link in both canonical dossier and text atlas. Positive canonical catalogue remains accepted.
- No complete local native checkout was available to this executor. The completed GitHub Actions run, not a simulated local run, is the native verification evidence.

## Explicit remaining work

`remaining_scoped_implementation=0`; `necessary_unmerged_scoped_PRs=0` **for this defect only**. The full approved SA-EXT-05 dossier/source graph and SA-EXT-06 atlas/chronology scope still requires independently sourced material, rights/editorial acceptance, full UI/browser/NVDA and production Sites/D1/backup verification before any parent TERMINAL claim. Likewise SA-EXT-01, 02 and 07 remain OPEN. Physical Windows/Chrome/NVDA, installed Sites SHA, live D1 and release were **NOT_VERIFIED**.

No 82-language rollout, new release, production migration, payments, synthetic users, mass mailing, dating service or secret publication was performed. Coordination: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).
