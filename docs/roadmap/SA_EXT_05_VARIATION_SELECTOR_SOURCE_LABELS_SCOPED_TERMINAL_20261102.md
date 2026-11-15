# SA-EXT-05 — VARIATION_SELECTOR_SOURCE_LABELS — scoped source acceptance (2026-11-02)

**Scope:** Existing `public/scripture-dossiers.js::validateDossierGraph` and existing dossier/text-atlas source links only. **Parent SA-EXT-05 remains OPEN.**

## Reproduced source-contract gap

Unicode variation selectors U+FE00 and U+FE0F are nonspacing marks (`Mn`), not `Cf` format controls. The pre-change `safeVisibleText` rejected `Cf`, Unicode spacing controls and selected invisible characters but admitted these variation selectors, including when used as an entire visible book title or inserted into source and dossier metadata. A citation or ARIA source label could therefore be visually ambiguous. This is a source-level reproduction, **not** a verified live production incident.

## Existing implementation repaired

[PR #1219](https://github.com/Oleksii-debug/scripture-archive/pull/1219) **SQUASH MERGED** into `main@394113d62473104033c2574d17bcc43f6f44916e`; qualified exact head `0e7ab56b2df2cf7814bf1a883fd731c97aaa79c7`. The shared `safeVisibleText` guard now rejects U+FE00–U+FE0F before either existing UI emits a source link. No new server, endpoint, database or second source authority. Existing null-prototype handling and valid multilingual catalog remain unchanged.

Two new adversarial characters × three languages × four metadata locations (publisher book title, dossier name, summary, prompt) = **24 new regression cases** in the existing test suite. Each checks the existing localized `role="alert"` refusal in both dossier and atlas and absence of reader links; the existing valid-catalog recovery test remains.

**Exact-head CI:** [GitHub Actions #41465782558](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41465782558) **SUCCESS** on `0e7ab56b2df2cf7814bf1a883fd731c97aaa79c7`: 4461 native Node PASS, 1 SKIP, 0 FAIL; 37/37 disposable Worker/D1 PASS; 2/2 Python PASS; TypeScript/lint/build PASS. Test-only predecessor `07f23edac6eff8e79d3031e981f6951d3175ed3a` had a workflow [#41465632637](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41465632637) **CANCELLED** after the repaired head was pushed; it is **not** claimed as a completed RED CI. Isolated source-regex reproduction confirmed that the previous guard admitted U+FE00 and U+FE0F.

## Completion boundary

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **only for this variation-selector metadata boundary**. SA-EXT-01/02/05/06/07 parent **OPEN**; SA-EXT-03/04 source-terminal. Independently verified publisher rights/editorial acceptance, physical Windows/Chrome/NVDA, live Sites/D1/backup and final release **NOT_VERIFIED**. No production migration, 82-language expansion, payments, synthetic users, bulk email, dating product or secret publication.
