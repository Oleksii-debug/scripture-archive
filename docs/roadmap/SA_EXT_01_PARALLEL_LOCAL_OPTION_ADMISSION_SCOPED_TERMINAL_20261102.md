# SA-EXT-01 — PARALLEL_LOCAL_OPTION_ADMISSION — scoped source acceptance (2026-11-02)

## Boundary and reproduced defect

The existing canonical parallel reader showed imported second-edition options when their `local` flag was false, null, missing, inherited, or accessor-backed. The existing submit path already refused these records through `verifiedLocalEdition`; selecting them led to a dead-end error despite their being offered as available. This is an inconsistent visible UI admission boundary, **not** a defect in the existing submit guard or a claim that the full SA-EXT-01 parent is finished.

## Reuse → repair → converge

[Functional PR #1197](https://github.com/Oleksii-debug/scripture-archive/pull/1197) **SQUASH MERGED** into `main@a3cb39de917635a3aa38a562648baf861864de22`, qualified exact PR head `c8aa2933aece510fd8bb3bd241e266204e7c60ed`. The existing `public/parallel-reader.js::parallelControls` now reuses `verifiedLocalEdition` to filter options; `mountParallelReader` remains the canonical submission authority. No new service, API, D1 schema, release or rights exception. Existing duplicate-ID refusal remains unchanged.

Changed source/test blobs verified after merge:
- `public/parallel-reader.js` `93dad39edb547fdf9e9d753ee5da57e8104d5084`
- `tests/parallel-reader.test.mjs` `010399a891b95aa8a6422bed53354355ec7b77bb`
- `tests/parallel-reader-locale-own-key.test.mjs` `f586c3a379b08b95cd16a76c04bd2d0b2c5a6b02`

## Qualification and negative evidence

The initial PR head `840071c5f508dc209d69956157e285e4eff13993` failed [native CI #41401949274](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41401949274): 4416 Node PASS / **3 FAIL** / 1 SKIP because three existing translated-label fixtures used a non-local record. The fixture was corrected to use a genuinely selectable local edition, not a weakened source guard.

[Exact final-head CI #41402124309](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41402124309) **COMPLETED SUCCESS**: **4419 Node PASS / 0 FAIL / 1 SKIP**; TypeScript, ESLint (0 errors, 13 warnings), source build, **37/37 disposable Worker/D1** and **2/2 Python validators PASS**. Added negative cases for non-local/missing/null and inherited/accessor `local`; no accessor execution, positive local selection retained. These are GitHub-hosted native checks, not local physical NVDA/browser tests.

## Scope truth

`CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` only for `PARALLEL_LOCAL_OPTION_ADMISSION`; `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0`. **SA-EXT-01/02/05/06/07 remain OPEN**, 03/04 source-terminal. Full licensed text/rightsholder confirmation, editorial/source acceptance, physical Windows/Chrome/NVDA, live Sites/D1/backup and release verification remain **NOT_VERIFIED**. Draft PR #325 remains unmerged and was not modified. No 82-language expansion, release publication, production migration, payments, synthetic users, bulk email or dating launch.
