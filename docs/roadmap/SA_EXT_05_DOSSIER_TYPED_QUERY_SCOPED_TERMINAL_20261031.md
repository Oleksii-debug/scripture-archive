# SA-EXT-05 — DOSSIER_TYPED_QUERY_FAIL_CLOSED — scoped terminal receipt (2026-10-31)

**Status: `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` only for this repaired renderer-contract boundary.** SA-EXT-05 parent remains **OPEN**, as do SA-EXT-01/02/06/07; SA-EXT-03/04 are source-terminal. This is **not** a release, an installed browser audit, a rights sign-off or a claim of a live production exploit.

## Reproduced defect

In the existing canonical `public/scripture-dossiers.js::dossierMarkup`, an explicitly non-string `searchQuery` (null, boolean, number, array, object or boxed string) bypassed the length-only check. The existing `searchScriptureDossiers` correctly returned no results for such input, but the renderer classified it as an absent filter and selected the default public dossier, exposing unrelated reader-source links in that response. The same module's `dossierAtlasMarkup` already failed closed on non-string `query`. The normal `public/workspace.js` GET path uses `URLSearchParams.get('q') || ''`, so this is a direct renderer contract regression, **not** evidence of a reachable remote exploit.

## Narrow repair and exact authorities

- Reused existing `public/scripture-dossiers.js`, no new API/DB/UI authority. Reject `typeof searchQuery !== 'string'` or raw length above 120 with the already-localized `role="alert"` state, before selecting a dossier or constructing reader links.
- Reused `tests/dossier-search.test.mjs`: 30 malformed-input negative cases across UK/RU/EN, plus absent query, valid book search, and overlong query. No synthetic Scripture, source content or user data.
- Previous source blob `10036abce8d3a67cd060f1e4fede1a47043c86ad` at baseline main `87540665c280554f78a9437026592e510b59fb60`. Exact repaired source blob `1fa5afc35deca37be043d134f0a98ef793a92dcf`; regression blob `c155a6216e4ca393b7ebdb5ae54dc0ddd55c28dd`.
- [Functional PR #1066](https://github.com/Oleksii-debug/scripture-archive/pull/1066) **SQUASH MERGED**, exact integrated `main@b5d66aebcbc8aaf5f64081c51762756773576d1e`; expected head `89779ec95c76b8fdde7a5a5d1740f93675fba286`.
- Isolated actual-source V8 proof with the real `public/data/catalog.json` blob `ad471ce574861f7c66e2a913886c2bcb22f2afc3`: **30/30 RED before** (unrelated dossier/reader links rendered), **30/30 GREEN after** (localized alert, no article/source links); **12/12 unchanged** legitimate/overlong-string outcomes. V8 test is not a native browser.
- First full [CI #41245227935](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41245227935) **FAIL** because a newly authored positive test incorrectly matched the whole `class` attribute rather than its `dossier-article` token; fixed test assertion, no product logic change.
- Final exact-head [CI #41245341526](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41245341526) **COMPLETED SUCCESS** on `89779ec95c76b8fdde7a5a5d1740f93675fba286`: **3687 native Node PASS / 0 FAIL / 1 SKIP; 35/35 disposable Worker/D1 PASS; 2/2 Python PASS; TypeScript, lint and build SUCCESS**. Source blob read back on merged main. No claim of full native local checkout: GitHub runner supplied the native validation.

## Remaining work

For this narrow repair, `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0`. **SA-EXT-05 parent remains OPEN**: independent editorial/source-provenance and disambiguation acceptance, actual rights verification, accessible real-browser/physical NVDA review, installed Sites/D1/backup evidence and owner-approved release acceptance remain **NOT_VERIFIED**. SA-EXT-01/02/06/07 parents remain OPEN. No deployment, production migration, 82-language expansion, payments, synthetic users, mass mail or dating activation occurred.
