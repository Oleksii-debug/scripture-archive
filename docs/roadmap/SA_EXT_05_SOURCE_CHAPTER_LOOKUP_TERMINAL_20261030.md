# SA-EXT-05 — CANONICAL_SOURCE_BOOK_CHAPTER_DISCOVERY — scoped terminal

**Date:** 2026-10-30  
**Status:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` only for discovering existing dossiers by their canonical Bible book + chapter reference. **All twenty SA-EXT-01…20 full parent sections remain OPEN.**

## Demonstrated prior gap

The real native `GET /dossiers` search did not index the existing canonical Scripture passage pointers (`item.sources`). On exact pre-change source, `GEN 12` and the actual localized `GEN` book title followed by chapter 12 returned **zero** matches in Ukrainian, Russian and English, even though both Abraham and Egypt dossiers link directly to Genesis 12 in the reader. Do not invent modernized Bible book labels: canonical catalogue `public/data/catalog.json` is used verbatim.

## Implemented canonical behavior

- Existing `public/scripture-dossiers.js::searchScriptureDossiers` now optionally accepts the already-validated platform `catalog` (backwards-compatible two-argument API). Existing `dossierMarkup` passes that same catalog to both search and result index; no parallel catalogue, route or database.
- Search finds dossier's *actual sourced* `book + chapter` using canonical book code (`GEN 12`) or its true localized displayed name (`Перва книга Мойсея 12`, `Бытие 12`, `The First Book of Moses, Commonly Called Genesis 12`). Matching reference labels is **exact** to prevent the false prefix `GEN 1` matching `GEN 12`. Existing names, summaries and study-question search remain.
- Existing Scripture reader references and GET query roundtrip remain; malformed Bible catalogue fails closed at existing validator. No Bible verses copied, provenance invented, user data exposed or other sources substituted.

## Proof and GitHub integration

- Six direct V8 source-runtime checks on actual candidate bytes/canonical catalog, 3 languages x 2 reference formats, recovered Abraham and Egypt with genuine `/reader/GEN/12?verse=10` link. Negative check rejected `GEN 1` falsely matching `GEN 12`. Two additional native Node regression cases cover all three languages, stable GET links, exact chapter, two-argument compatibility and malformed catalogue.
- [Functional PR #738](https://github.com/Oleksii-debug/scripture-archive/pull/738) **SQUASH MERGED** in `main@691539a186a99339c4bf58a7d462b363c3719ecf`; exact merged source `public/scripture-dossiers.js@c9892694a51d1e2d04e68df0ebfd4cdb7e5083bf`; test `tests/dossier-search.test.mjs@4aef85afd8b4996889d953447f45b9dd7e94989a`. Main readback and exact merge-commit ancestry confirmed.
- [Exact PR-head Actions #41063455864](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41063455864), head `d6d8ae715851cd607a9964d71beff8d103de8d4e`, **SUCCESS**: native Node tests, TypeScript, lint, build, disposable Worker/D1 E2E and Python validators completed.

**remaining_scoped_implementation=0; necessary_unmerged_PRs=0** only for `CANONICAL_SOURCE_BOOK_CHAPTER_DISCOVERY`. Do not redevelop this exact approved slice absent a proved regression or new request.

## Explicitly not established

Full historical/academic dossier coverage, editorial and rights qualification, any current live Sites deployed SHA, live account/browser/physical Windows/NVDA, current production D1, privacy release and full SA-EXT-05 parent acceptance are NOT_VERIFIED. No deployment, accounts, DNS, email, paid service or external production data was changed.
