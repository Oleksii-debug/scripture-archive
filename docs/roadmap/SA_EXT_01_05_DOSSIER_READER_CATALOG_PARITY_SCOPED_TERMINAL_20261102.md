# SA-EXT-01/05 — dossier-to-reader catalogue admission parity (scoped source terminal, 2026-11-02)

**Boundary:** only the existing source-validated dossier/atlas links when their Bible catalogue envelope or inventories are not admitted by the canonical primary reader. This is **not** full SA-EXT-01, SA-EXT-05, reader equivalence, editorial approval, licence clearance or a release.

## Reproduced source contract gap

The existing `public/scripture-dossiers.js::validateDossierGraph` previously checked the dossier's source references and a subset of publisher book fields but accepted catalogues with a missing/invalid reader schema/edition identity, fewer than 66 books, reordered locale or alternate-edition books, wrong OT/NT classification, or an inherited alternate-edition entry. Such data could produce dossier/atlas reader links and ARIA citation labels even though the canonical `public/app.js::validBibleCatalog` would reject the surrounding catalogue. These are deliberately corrupted **in-memory fixtures**, not evidence of a deployed incident.

## REUSE → REPAIR → CONVERGE

- Reuse the existing dossier graph, three-language dossier/atlas UI and localized `role="alert"` fail-closed path; no new route, database, API, server or source of Scripture text.
- Require owned schemaVersion 1 and owned nonblank edition IDs for uk/ru/en, 66 own book records per primary/optional alternate list, OT/NT classification, distinct bounded source labels and consistent primary locale book-code order. Optional `editionBooks` may be absent as the reader permits.
- Inspect descriptors without invoking schema/edition/alternate-map accessors. Retain valid null-prototype catalogue objects by updating two positive fixtures to include the complete reader-required envelope, not weakening their own-data assertions.
- The primary reader's **fixed canonical 66-code sequence** remains the authority; this bounded dossier parity check deliberately does not duplicate or replace it. Coordinated all-locale code substitution remains rejected by the reader, and full equivalence is not claimed.

## Exact integration and verification

- [Functional PR #1215](https://github.com/Oleksii-debug/scripture-archive/pull/1215) **SQUASH MERGED** to `main@8961f7a1f04dda6859c5b061897d6b7f9fcda803`; exact qualified PR head `bd8221ff083a3fef6485282f5d9ab4ff748a342b`, base `9f1a3aa9d2e6580e3f6685808ad55c44109c2ab6`. GitHub compare before merge: ahead 5, behind 0, four paths, no overlap with open draft #325 or R0.4 PR #1199.
- Merged blobs: `public/scripture-dossiers.js@7a17cbcc7c1373623dd85c3cc03c23c29342265d`, `tests/dossier-search.test.mjs@e870e81bdc0bfac62b229e17a42c5ae48ec83624`, `tests/dossier-catalog-accessor-authority.test.mjs@c42ec245e95f3be33a8673b422366ce2b66ccb56`, `tests/dossier-catalog-own-authority.test.mjs@8ed6d45cc6b1b45d3f978b4a5f6ff6ebfff32d89`.
- Initial [CI #41447345336](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41447345336) **FAILED** two historical positive null-prototype fixtures that omitted reader-required envelope fields. Both fixtures were corrected while preserving null-prototype and accessor protections; this is not claimed as a completed pre-fix RED test.
- Final [exact-head CI #41447503899](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41447503899) **COMPLETED SUCCESS**: 4435 native Node PASS, 1 SKIP, 0 FAIL; TypeScript, lint and build PASS (13 lint warnings, 0 errors); 37/37 disposable Worker/D1 PASS; 2/2 canonical Python PASS.
- Nine malformed catalogue cases, uk/ru/en and both existing UI views, accessible denial/no `/reader/` links, valid catalogue/optional-edition absence, three non-executed accessor cases and recovery were covered. GitHub Actions executed the native suite; **no full local checkout** or physical Windows/Chrome/NVDA acceptance was available.

## Closure boundary and remaining work

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **for this specific source-admission parity only**; `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. Parent **SA-EXT-01/02/05/06/07 OPEN**; 03/04 source-terminal. Outstanding: independent publication rights and editorial acceptance, full reader/catalogue equivalence, physical NVDA/browser/Windows testing, live Sites/D1 and backup/restore, release evidence and the other approved parent-section functions. No production migration/deploy, new release, 82-language rollout, payment, synthetic users, bulk email, dating, secrets or user data changes.
