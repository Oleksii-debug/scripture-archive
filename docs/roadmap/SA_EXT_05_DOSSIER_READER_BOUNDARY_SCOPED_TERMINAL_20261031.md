# SA-EXT-05 — DOSSIER_READER_BOUNDARY — scoped terminal, 2026-10-31

**Decision: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL for this exact defect; SA-EXT-05 parent remains OPEN.**

## Reproduced defect and actual shipped implementation

The canonical reader public/app.js accepts at most 200 chapters per book and 256 verses per chapter. The existing public/scripture-dossiers.js validator could approve a catalogue of 201 chapters or a source/witness ending at verse 257. Such a source produced a credible /dossiers or /atlas reader link that the primary reader refuses. This is a source-reference integrity defect, not an editorial claim about missing Scripture verses.

The existing validateDossierGraph now rejects chapter counts >200 in each uk/ru/en book catalogue, chapter refs >200, unsafe or out-of-bounds first/last verse refs >256, including relation witnesses. Both original UI routes use the same canonical validator and show the existing accessible unavailable alert; no duplicate server, graph, database or translated text.

## Exact merged evidence

- Source PR: https://github.com/Oleksii-debug/scripture-archive/pull/944 — SQUASH MERGED, confirmed PR.merged=true.
- Integrated main SHA: 2873ca8adfc93f708a9141fefb4a04e2dcf47896 (identical main on initial post-merge readback).
- Source blob: public/scripture-dossiers.js @ b63e539e43367031f6cdbd08c0df649ac78d564a
- Native regression blob: tests/dossier-authored-metadata-failclosed.test.mjs @ 6b3f5bf801310ef396da6879e2e180bc15d0e545
- Exact-head CI: https://github.com/Oleksii-debug/scripture-archive/actions/runs/41193874475 — COMPLETED SUCCESS.
- Actual job logs: native Node 3185 PASS, 0 FAIL, 1 SKIP; disposable Worker/D1 22 PASS, 0 FAIL; Python 2 PASS; TypeScript, lint and build succeeded.
- Additional isolated V8 exact-source check with synthetic catalogue derived from the real published dossier graph: 57/64 predicates passed before repair; 64/64 after. This is not a browser/NVDA test.

remaining_scoped_implementation=0
necessary_unmerged_scoped_feature_PRs=0
scope_status=CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

## Unfinished independent work

SA-EXT-05 PARENT OPEN: full editorial/provenance/third-party rights review, historical sources and roadmap features remain unresolved. SA-EXT-03/04 parent TERMINAL are not reopened. Site installed SHA, live D1, physical NVDA/Windows, release and email production NOT_VERIFIED. No deploy, migrations, payments, mailings or new languages executed.

Coordination: https://github.com/Oleksii-debug/scripture-archive/issues/297 ; https://github.com/Oleksii-debug/scripture-archive/issues/78
