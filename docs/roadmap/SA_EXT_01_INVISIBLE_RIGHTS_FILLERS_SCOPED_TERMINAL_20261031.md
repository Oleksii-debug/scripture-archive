# SA-EXT-01 / EDITION_RIGHTS_INVISIBLE_FILLERS — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

Date: 2026-10-31. **Only this proven Unicode rights-metadata defect is terminal. The full SA-EXT-01 parent remains OPEN.**

## Reproduced defect and approved closure
On exact source baseline `main@777def029787649e5ee71129b6c742357bea899d`, the existing canonical `validEditionRightsMetadata` admitted U+00AD, U+034F, U+115F, U+1160, U+180E, U+2800, U+3164 and U+FFA0 in edition title, licence and attribution. Their visually blank/formatting characteristics could mask misleading publisher/rights text when real Bible verses were displayed. All eight were demonstrably accepted by the original exact source predicate.

**Fixed:** `public/parallel-reader.js` uses its existing shared rights-metadata contract to reject Unicode format controls and script blank fillers, while preserving visible Cyrillic, actual attribution, TAB/LF/CR in multiline licence text, HTTPS provenance checks, typed own-property gates and normal retry recovery. No new catalog, router, API or database was created. `tests/parallel-rights-visible-unicode.test.mjs` adds eight fixtures used by all three rights fields and the real parallel-reader render refusal path (32 new individual cases). Existing good-path cases remain.

## Exact GitHub evidence
- Feature PR: https://github.com/Oleksii-debug/scripture-archive/pull/952 — **squash MERGED**.
- Feature merged main: `1b8524f44c876e3ca1471b5785426d3a523b26ba`, independently read back from `refs/heads/main` and PR merge receipt.
- Production source blob: `93d100e8eb2182728fbdedfd2257e2ec14cddcac`.
- Regression test blob: `923fc033ee368bf38ee11459ca816faf38c7ce44`.
- Exact PR-head: `dd2f554768f2f45ed68577dc5acb59ea6c6497bf`.
- Native Actions: https://github.com/Oleksii-debug/scripture-archive/actions/runs/41200462083 — **COMPLETED SUCCESS**, exact PR-head, original real steps verified from the job record.
- Evidence observed from job logs: native Node **3292 PASS / 0 FAIL**, disposable Worker/D1 **24 PASS / 0 FAIL**, existing Python **2 PASS**; TypeScript, lint and source build all succeeded.

## Terminal boundary
`remaining_scoped_implementation=0`; `necessary_unmerged_scoped_feature_PRs=0`; `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. Reopen this precise Unicode admission rule only upon a newly reproduced defect or a changed requirement.

**Not claimed:** complete SA-EXT-01 language/rights coverage; human verification of editions/licences; production deployed Sites SHA, real Windows/physical NVDA/browser E2E, other SA-EXT parents or the entire final product. No deployment, production D1 mutation, messages, payments, or language expansion performed.