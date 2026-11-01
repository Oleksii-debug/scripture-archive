# SA-EXT-01 — explicit malformed chapter route: scoped terminal receipt (2026-11-01)

**Status:** CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL **only for** `EXPLICIT_MALFORMED_CHAPTER_ROUTE_FAILCLOSED`. The parent SA-EXT-01 remains OPEN.

## Defect and accepted behavior

The existing canonical `renderReader` silently mapped malformed explicit `/reader/GEN/<chapter>` coordinates (including `abc`, `0`, `01`, `-2`, `1e2`, `NaN`, unsafe integers) to Genesis chapter 1. On original `main@f46e71b782e1e90cc9ba0b20bde14f1d662aae82`, 21/21 source-executed negative cases across uk/ru/en reproduced this wrong source selection.

The canonical reader now rejects nonempty malformed explicit chapter segments before the attempt API and Bible fetch. It clears stale `currentReader`, presents the existing accessible `role=alert` and `/reader` recovery link, and preserves the saved reading. Valid chapters, high-positive chapter clamping, and absent/empty saved-reader chapter fallback retain existing behavior. No parallel service.

## Exact integration and evidence

- Functional PR [#1106](https://github.com/Oleksii-debug/scripture-archive/pull/1106): **SQUASH MERGED** into `main@e9dd07151d570b660199a9aa3c44d02dfed2e811`.
- Production `public/app.js` blob: `2e8ad9bcf19332c979c389a3831b033d3b4550a0`.
- Native regression `tests/reader-explicit-malformed-chapter.test.mjs` blob: `e4c743a20f09f405a906165c1a914152146b40b5`.
- Exact PR-head [Actions #41266545819](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41266545819) **COMPLETED SUCCESS** at `00e7cc2a50593f4d95ad119df8a10d8cf0c45da8`: 4032 native Node PASS / 1 SKIP / 0 FAIL; 37 disposable Worker/D1 PASS; 2 Python PASS; TypeScript, lint (13 warnings, 0 errors), and build successful.
- Separate source-executed V8 checks on the candidate: 21/21 malformed negative and 12/12 compatibility positive PASS. These isolated checks are not a full native checkout.

Readback after merge confirms both exact blobs in main. The historical draft [#325](https://github.com/Oleksii-debug/scripture-archive/pull/325) remains divergent and unmergeable; its broader reader/attempt/editorial work was not rewritten or merged.

## Remaining gates

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0` **only for this malformed explicit chapter boundary**. SA-EXT-01, 02, 05, 06, 07 parents remain OPEN; 03/04 source-terminal. Publisher rights, editorial acceptance, actual Chrome/Windows/physical NVDA, deployed Sites/D1/backup, and release #689 remain **NOT_VERIFIED**. No deployment, production migration, 82-language launch, payments, synthetic users, bulk mail, or dating.
