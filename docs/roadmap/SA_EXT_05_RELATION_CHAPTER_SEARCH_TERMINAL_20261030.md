# SA-EXT-05 — exact chapter search includes published relation witnesses

Date: 2026-10-30. **Status for this narrowly defined function only:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.

## Real user-facing behavior

The existing dossier search `searchScriptureDossiers` in `public/scripture-dossiers.js` now locates chapters cited both directly by a dossier and via its published `related[].via` edges. The canonical `dossierMarkup` route exposes these search hits and verified reader chapter/verse links, with no second search implementation, source registry or UI. Localized canonical book-title queries work in Ukrainian, Russian and English; neighboring unreferenced chapters do not match. Publication still requires `validateDossierGraph`.

## GitHub integration and qualification

- Implementing PR: https://github.com/Oleksii-debug/scripture-archive/pull/780 — **SQUASH MERGED**.
- Feature integration commit (confirmed on main immediately after merge): `8e57e95017c159b7de2d78af0acbbc6d7cf91a04`.
- Exact PR head: `672a9035a21a70948852917e1aae202fed1c555f`.
- Exact PR-head CI: https://github.com/Oleksii-debug/scripture-archive/actions/runs/41071444546 — **COMPLETED SUCCESS**: native Node, TypeScript, lint, build, disposable Worker/D1 and Python validators.
- Source/test readback after main merge: `public/scripture-dossiers.js` and `tests/dossier-search.test.mjs` contain the merged relation-chapter lookup and tests.
- Main-push workflow started at https://github.com/Oleksii-debug/scripture-archive/actions/runs/41072531790; result was **in progress** when this receipt was authored and is not declared passing.

**For this exact function:** remaining implementation = 0; necessary unmerged PRs = 0. New scope must be a separately scoped requirement or a concrete regression. All parent sections `SA-EXT-01…SA-EXT-20`, including `SA-EXT-05`, remain **OPEN**. No release / Sites SHA, Windows/NVDA physical acceptance, independent source audit or live deployment is claimed. This scoped receipt is not a blanket closing of the full approved dossier/graph scope.
