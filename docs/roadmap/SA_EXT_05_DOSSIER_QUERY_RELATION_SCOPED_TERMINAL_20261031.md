# SA-EXT-05 — two source defects terminal, 2026-10-31

**Decision: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL for exactly TWO defects. Parent SA-EXT-05 remains OPEN.** This is not a live-release acceptance.

## Integrated production behavior

1. PASTED_CITATION_RANGE_TYPOGRAPHY: canonical /dossiers source search accepts copied source citations with em dash, en dash and ASCII dash plus optional spaces (example: GEN 17:15 — 19), while preserving the exact existing book/chapter lookup, relation witnesses, reversed-range rejection and valid reader links.
2. FILTERED_RELATION_GET_CONTINUITY: native related-dossier navigation preserves the GET q filter when the destination is itself in the validated result set; otherwise it intentionally uses the original unfiltered deep link so the actual related dossier remains reachable. Existing URL encoding and HTML escaping are reused.

## Exact merges, tests and source readback

- Feature [PR #940](https://github.com/Oleksii-debug/scripture-archive/pull/940) SQUASH MERGED to main@ba329072d1e325a5f419f956c69b3b2aa9245d8b; [CI #41192139022](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41192139022) completed SUCCESS.
- Feature [PR #941](https://github.com/Oleksii-debug/scripture-archive/pull/941) SQUASH MERGED to main@6d1f48c9ed8b13ffb26fddf6ea6cdf43e7edaf3c; [CI #41192425545](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41192425545) completed SUCCESS.
- Both exact-head GitHub CI jobs passed native Node regression suite, TypeScript contracts, lint, build, disposable Worker/D1 integration and canonical Python validators.
- Verified final source public/scripture-dossiers.js blob dbe42134b50705d6c487c83155c8271e97e5e207
- Verified native test tests/dossier-cited-range-pasted-typography.test.mjs blob 6320ece74c67b51614fc3b8f079586ea12d89f36
- Verified native test tests/dossier-filtered-relation-navigation.test.mjs blob ff497068d96b997d888dfa2f655496b009f97067
- Direct source-executed V8 checks separately reproduced the old behavior and exercised fixed query cases and rendered links in uk/ru/en; these are not physical Chrome/NVDA evidence.

## Explicit remaining boundary

remaining_scoped_implementation=0; necessary_unmerged_scoped_feature_PRs=0; CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL only for these two concrete fixes.
SA-EXT-05 PARENT REMAINS OPEN: full approved source-verified dossier catalogue, external historical/archaeological authority, third-party rights and research QA are incomplete. Original SA-EXT-03/04 source-parent TERMINAL unaffected.
SITES_INSTALLED_SHA=NOT_VERIFIED; PHYSICAL_NVDA=NOT_VERIFIED; WINDOWS_PACKAGE=NOT_VERIFIED; PRODUCTION_RELEASE=NOT_PERFORMED.
No site deployment, D1 migration, account operation or outbound messages.

Coordination: [#78](https://github.com/Oleksii-debug/scripture-archive/issues/78), [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297), [#295](https://github.com/Oleksii-debug/scripture-archive/issues/295).
