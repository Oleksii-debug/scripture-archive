# SA-EXT-05 — DOSSIER_VISIBLE_SOURCE_UNICODE — source-scoped terminal receipt

Date: 2026-10-31. Feature PR: [#943](https://github.com/Oleksii-debug/scripture-archive/pull/943).
**Status: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL — this exact source-integrity defect only.**
**Parent SA-EXT-05 stays OPEN.** Other unfinished expansion parents stay OPEN; already accepted parents SA-EXT-03 and SA-EXT-04 stay TERMINAL.

## Concrete previously unhandled defect
The canonical `public/scripture-dossiers.js::validateDossierGraph` accepted invisible bidirectional/zero-width characters, NUL and malformed UTF-16 in multilingual dossier names and the existing Bible edition catalogue's localized book titles. Ordinary HTML escaping does not remove these characters. Source-executed original production blob `dbe42134b50705d6c487c83155c8271e97e5e207` accepted **30/30** mutated book-title/name cases and proceeded to source-linked atlas HTML. This is a reader provenance and accessible-label ambiguity, not a claim of observed malicious production content.

## Integrated fix, exact identities
- Reused the existing shared source-validation boundary. Added a visible-Unicode guard for already-approved `uk/ru/en` node names, summaries, research questions and catalogue book titles. No replacement renderer, database, external content, new route or fictitious Scripture citation.
- Canonical production: `public/scripture-dossiers.js`, Git blob `3449825ad740a206e07714409734ddb10de61ebb`.
- Committed negative/positive regression: `tests/dossier-provenance-unicode-controls.test.mjs`, Git blob `ee1da0d29c9405e27c2f27120bcf91319d01d3d5`.
- PR [#943](https://github.com/Oleksii-debug/scripture-archive/pull/943) **SQUASH MERGED**, feature `main@52b8d69d8cea0b689ea2808bcb2cddc211cf7e9a`. Both exact blobs were independently fetched from `main` after merge, and PR reported `merged=true`.
- Only two source/test paths changed. No old working authored content was rewritten; the same canonical `/dossiers`, `/atlas` and Academy source graph continue to apply.

## Executed qualification, with evidence limits
- Independently source-executed V8 against the exact original and proposed production JavaScript: **30/30 original defects reproduced**, **60/60 patched negative cases rejected**, real catalogue validated, and visible non-Latin text/emoji remained valid. This is an isolated source execution, not full Node/Chrome/Windows.
- Committed Node regression adds 60 adversarial cases across five Unicode families × three locales × four source metadata locations, plus a real positive baseline.
- Exact PR-head GitHub Actions [#41193714352](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41193714352), head `9b00e66029838b737c7053ad90fe077470b47ecd`: **COMPLETED SUCCESS**. Actual logs: native Node **3,183 PASS / 0 FAIL / 1 SKIP** (3,184 total); disposable Worker/D1 **22 PASS / 0 FAIL**; TypeScript contracts, lint, build and Python validator job steps SUCCESS.
- Browser keyboard tree, physical NVDA, Windows executable, deployed Sites SHA, production D1, licensing and independent editorial source acceptance **NOT_EXECUTED / NOT_VERIFIED**; no release or deployment was performed.

## Source development closure boundary
For this exact invisible/bidi source-metadata acceptance defect:
`remaining_scoped_implementation=0`;
`necessary_unmerged_scoped_feature_PRs=0`;
`CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.
**Do not reimplement** without a new independently reproduced defect or an approved changed requirement. Wider dossier breadth, sources and rights, 20-section expansion, live hosted verification and physical assistive-technology acceptance remain tracked in [#295](https://github.com/Oleksii-debug/scripture-archive/issues/295), [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297) and [#78](https://github.com/Oleksii-debug/scripture-archive/issues/78).
