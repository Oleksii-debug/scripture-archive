# SA-EXT-01 — EDITION_RIGHTS_TEXT_UNICODE — source-scoped terminal receipt

Date: 2026-10-31. Feature [PR #947](https://github.com/Oleksii-debug/scripture-archive/pull/947).

**Status: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** for the precise issue of invisible/bidi/invalid Unicode in the canonical edition title, licence text and attribution **only**. The SA-EXT-01 parent remains **OPEN** for real source/rights/translation breadth and end-to-end acceptance.

## Exact defect and bounded source fix
The canonical rights gate `public/parallel-reader.js::validEditionRightsMetadata`, already used by the real primary and parallel readers, rejected malformed source/rights URLs but accepted invisible/Unicode bidirectional controls, NUL and orphaned UTF-16 surrogates in its title, licence and optional attribution. Those fields enter displayed editorial/source terms and copied verse citations; HTML escaping does not remove textual spoofing.

**Source reproduction:** original blob `16d4fd5622295cd5cfc35ce69f6a3ca604d76e7d` accepted **15/15** adversarial metadata variants (five control families × three text fields) in source-executed V8. Existing valid Ukrainian, English, TAB/LF/CR multiline metadata remained valid. No incident involving real published rights text or customer exposure was observed.

**Fix:** shared existing `validEditionRightsMetadata` bounds now reject these misleading characters in the established rights acceptance function before any parallel-rendered licensed verses, without another rights catalogue, authorization engine, API or translation source.
- Canonical source `public/parallel-reader.js`, exact merged blob `2846e4faf782d625e19b043deb2531fe706ec643`.
- New `tests/parallel-rights-visible-unicode.test.mjs`, exact merged blob `1e0080c550f8d715184cfd8068ce45642361b28f`.
- [PR #947](https://github.com/Oleksii-debug/scripture-archive/pull/947) **SQUASH MERGED** as feature `main@d7fb423ab545ed2fc4b770e03e3e34ab9c22157f`; both exact blobs independently fetched from main after merger.

## Executed qualification
- 15 original malformed cases accepted (RED); patched source function **15/15** correctly refused. Real `mountParallelReader` source executed with isolated DOM/fetch stubs **6/6 cases passed** (valid verse accepted; five spoofed licences refused before text and retry remained enabled). Isolated V8 does **not** equal native browser or human NVDA.
- 24 new committed Node regression tests: 15 malformed rights, three positives and six real reader-flow cases.
- Exact GitHub Actions [run #41194310571](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41194310571) head `7bc93f3d35986c9cf3d7f2c4c0f3395721155573`: **COMPLETED SUCCESS**. Native Node **3207 PASS / 0 FAIL / 1 SKIP** (3208 total). Disposable Worker/D1 **22 PASS / 0 FAIL**. TypeScript, lint, build and Python workflow steps all successful.
- Browser/real network, production Sites SHA, real production D1, licence-owner confirmation, physical Windows and NVDA, current release **NOT_VERIFIED**. No deployment, migration, mailing or update was performed.

## Source terminal boundary
`SA-EXT-01 / EDITION_RIGHTS_TEXT_UNICODE: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`;
`remaining_scoped_implementation=0`;
`necessary_unmerged_scoped_feature_PRs=0`.
No repeat development absent new demonstrated defect or approved requirement. **Parent SA-EXT-01 and remaining unfinished sections of [#295](https://github.com/Oleksii-debug/scripture-archive/issues/295) remain OPEN**. Previous SA-EXT-03/04 parent TERMINAL status unchanged. Existing coordination [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297) and [#78](https://github.com/Oleksii-debug/scripture-archive/issues/78) remain the board.
