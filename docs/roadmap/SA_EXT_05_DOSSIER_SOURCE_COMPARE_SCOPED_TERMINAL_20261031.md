# SA-EXT-05 — Dossier canonical source comparison — scoped terminal

**Date:** 2026-10-31
**Scope:** only the actual /dossiers two-dossier public source comparison, not SA-EXT-05 as a whole.
**Decision:** CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.

## Delivered into canonical UI
- Real /dossiers GET page accepts verified dossier id and compare selectors; no alternative server, database, graph authority, or temporary example route.
- Keyboard-native labelled select + submit to compare any two approved dossiers.
- Shows both complete direct-source lists, direct /reader book/chapter/verse links and inherited narrative vs interpretive source classifications in uk/ru/en.
- Computes same-book, same-chapter intersecting verse ranges from already-validated canonical dossier records; it never claims two references are historically independent evidence.
- Source ranges without intersections say so; unknown or self-comparison IDs show a role=alert without false witnesses.

## Exact evidence
- Implementation PR [#921](https://github.com/Oleksii-debug/scripture-archive/pull/921) is **MERGED** into main at `1fc1fbaf0254d11241f4b31863e24b063d0177e3`.
- Exact integrated blobs: `public/scripture-dossiers.js@e85c8f6c9b23020fb4441a3693d0609fd91112cd`; `public/workspace.js@21dcb3d5ef31bdea081801e56bc10a0fcafad64d`.
- Source-executing test blob `tests/dossier-comparison.test.mjs@13de44f51011d9c0f28fd2f8d7b993fec37b59cd`; updated canonical-route contracts `tests/dossier-search.test.mjs@2aec4d88e20ba58e117f6ba5496529f52e039c6c`, `tests/source-dossier-graph.test.mjs@1e1a05cb2e60e8233ca8bc1bd905b0b529127a32`.
- Exact accepted head `2a309bb278b89eeaf197a716c78c6d8735f430fa` passed full [GitHub Actions #41188827090](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41188827090): native Node, TypeScript, lint, build, disposable Worker/D1, Python validators.
- Earlier head [#41188619195](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41188619195) exposed two stale static route-contract regex assertions; both were reconciled in the accepted branch, with no test disabled.
- GitHub main integration readback confirms the source and all 3 test blobs. Other-worker library rights #922 merged independently on disjoint files.

`remaining_scoped_implementation=0`
`necessary_unmerged_scoped_PRs=0`

## Boundaries
**SA-EXT-05 parent stays OPEN** for broader rights-cleared, historically sourced dossiers, scholarly provenance, geographic facts and editorial acceptance. This comparison does not create archaeological proof, map data or licensed new Scripture text.
Physical NVDA, browser/live Sites SHA, rights of future content and production D1 remain NOT_VERIFIED. No release or hosting update was performed. Reopen only for a reproducible defect or newly approved requirement.