# SA-EXT-06 — canonical atlas relationship-source witnesses — source closure (2026-10-31)

**Розділ SA-EXT-06 / ATLAS_RELATION_WITNESSES — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.**
This finality applies only to exposing already approved `related[].via` cited witnesses in the existing text-first `/atlas` interface, not to the full planned atlas, chronology, rights, archaeology, historical-location mapping, or production acceptance.

## Integrated production behavior
- Canonical `public/scripture-dossiers.js::dossierAtlasMarkup` already consumed by the existing `/atlas` route now shows an accessible named section and semantic `<dl>` with every graph relation (17 canonical relation edges), names of both connected dossiers, the validated canonical reader `/reader/<book>/<chapter>?verse=...` link, and the original narrative-versus-interpretive classification.
- Ukrainian, Russian and English presentation reuse the validated existing `COPY[lang].relations` and existing source-kind labels. The previously accepted two source tables and editorial nonchronological boundary remain unchanged.
- Reuses existing dossier graph and source validation: invalid published Bible catalogues still fail closed before any link; no second backend, no invented quotation, source, coordinate, licence, account or new database.

## Exact GitHub source and independent execution proof
- Feature PR [#911](https://github.com/Oleksii-debug/scripture-archive/pull/911), **SQUASH MERGED** to `main@74b72f143d7472d1edf2f46d07a114ba0a88d6ac`; exact tested PR head `c88c7bf5142faa54c6f92a9440db8b83b530ab5b`.
- Production source Git blob `public/scripture-dossiers.js@e372c3f2453898e6caa37e68fce1ad4edefb062c`.
- Focused regression Git blob `tests/atlas-relation-witnesses.test.mjs@51e5f4b938eff8f6597b2e6cc9f5b166d666a1bc`: all 17 exact graph edges in three display languages (51 relation-language paths), original reader URL and source-kind checks, native semantic list counts and fail-closed damaged catalogue. An assertion matrix is not an assertion of 51 separate source features.
- **Exact-head** [GitHub Actions run 41184641131](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41184641131) `completed/success`: native Node **2976 PASS / 0 FAIL / 1 SKIP** (2977 tests), TypeScript contracts, lint, build, disposable local Worker/D1 **22/22 PASS**, Python validators **2/2 PASS**. Detailed job ID `124488942876`, all steps SUCCESS.

## Final scoped verdict
`remaining_scoped_implementation=0`
`necessary_unmerged_feature_PRs=0`
`status=CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`

**Full parent SA-EXT-06 stays OPEN**: real cartography, chronological / archaeological evidence and legal rights have not been accepted and were not invented here. First unfinished parent sections in order remain SA-EXT-01, SA-EXT-02, SA-EXT-05, SA-EXT-06, SA-EXT-07, followed by SA-EXT-08..20; full SA-EXT-03/04 are already terminal.

**Release separation:** published Sites source SHA, production D1 ledger and backup, genuine browser/keyboard/physical NVDA Windows acceptance, SMTP and production release **NOT VERIFIED**; live site unchanged, no deployment. Other workers should not rebuild this closed relation citation renderer without a new concrete reproduction or approved requirement. Track broader deliverables in #297 / #78 / #295 and privacy cutover #689.
