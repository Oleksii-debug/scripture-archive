# SA-EXT-05 — canonical dossier source comparison (scoped terminal, 2026-10-31)

**РОЗРОБКУ ЛИШЕ ЦІЄЇ ПІДФУНКЦІЇ ЗАКРИТО — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.** The parent **SA-EXT-05 remains OPEN**.

## Integrated implementation
- Existing single `/dossiers` public route and `public/workspace.js` now accept a native `GET ?id=...&compare=...` selection.
- `public/scripture-dossiers.js::dossierMarkup` reuses the validated existing `scriptureDossiers` graph and shows both dossiers' direct-source inventories, overlapping book/chapter/verse ranges, narrative-versus-interpretive source kinds, and canonical `/reader` passage links.
- An HTML `form` and labelled `select` expose the function using keyboard-native controls, with Ukrainian, Russian and English prompts; unknown/same IDs fail with `role=alert` and disjoint source ranges do not invent a common witness.
- No secondary Bible dataset, invented verse text, timeline, new identity authority or public release.

## Actual evidence
- Implementation PR: https://github.com/Oleksii-debug/scripture-archive/pull/921
- Approved source head: `2a309bb278b89eeaf197a716c78c6d8735f430fa`
- SQUASH MERGED to main: `1fc1fbaf0254d11241f4b31863e24b063d0177e3`
- Exact-head GitHub Actions: https://github.com/Oleksii-debug/scripture-archive/actions/runs/41188827090 — **completed SUCCESS**; job `source-and-disposable-integration` **SUCCESS** with all named test, TypeScript, lint, build, Worker/D1, Python steps **SUCCESS**. Earlier run 41188619195 had two stale assertions; the updated PR tests corrected them before successful acceptance, not ignored.
- Additional independent exact-source CodeMode V8 checks: **49/49 PASS, 0 FAIL**, source blob `e85c8f6c9b23020fb4441a3693d0609fd91112cd`, catalog blob `ad471ce574861f7c66e2a913886c2bcb22f2afc3`; checks include three languages, actual overlap oracle across ten dossier pairings, ten invalid compare IDs and canonical link/form semantics. The isolated V8 check used a limited `URLSearchParams` shim because the execution environment does not provide browser globals; **not a real browser/NVDA test**.

## Terminal decision and release separation
- `remaining_scoped_implementation=0`; `necessary_unmerged_scoped_feature_PRs=0` for dossier comparison.
- SA-EXT-05 remains **OPEN** for full approved dossier research, third-party source/licensing verification, independent research QA and separate runtime/browser accessibility acceptance.
- `SITES_INSTALLED_SHA=NOT_VERIFIED`; `WINDOWS_ACCEPTANCE=NOT_VERIFIED`; `PHYSICAL_NVDA_ACCEPTANCE=NOT_VERIFIED`; `DEPLOYED=NO`. No release action is authorized or performed here.
- Do not redesign this scoped comparison without a newly approved requirement or reproducible defect.
