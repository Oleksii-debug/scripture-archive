# SA-EXT-01 — PARALLEL_EDITION_OWN_DATA_SELECTION — scoped terminal (2026-11-01)

## Boundary and source-level defect

The canonical `public/parallel-reader.js` previously read the selected local edition's `id`, `local` and fallback `contentId` with ordinary property access, and its comparison selector read `id/title` likewise. Accessor-backed records could execute arbitrary getters while selecting a licensed source, including a dynamic local file-path/folder authority. This is a **source-level admission defect**, not evidence of a production incident.

## Integrated repair

- Reuse the existing parallel reader and `getBook` path. Do not add a second reader, API, database or service.
- Admit a local edition only if `id`, `local`, `folder` and `contentId` are own data properties when present; reject inherited/accessor-backed values before the first chapter guard or `getBook` call.
- Render comparison options only from own data `id/title` fields. Bind provenance lookup to the submitted verified ID and fallback to the admitted own `contentId`.
- If an invalid programmatic selection bypasses `onchange`, retire stale licensed verse DOM and citation state, announce an accessible retry failure, and leave the submit control enabled.

## Exact source and verification

- Functional [PR #1171](https://github.com/Oleksii-debug/scripture-archive/pull/1171) **SQUASH MERGED** to `main@6eacee08c591f8dbb26239db8e3d9c53380a15e0`.
- Qualified PR head: `f83c1a72b1efe27f060661aac3ed0957d76d5a28`.
- [Exact-head GitHub Actions #41358670256](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41358670256) **SUCCESS**: 4324 Node PASS / 1 SKIP / 0 FAIL, 37 disposable Worker/D1 PASS, 2 Python PASS, TypeScript/lint/build PASS; lint 13 warnings / 0 errors.
- Regression file `tests/parallel-reader-edition-descriptors.test.mjs`: negative accessor/inherited ID, local, contentId, folder and selector fields across uk/ru/en; valid null-prototype edition; stale comparison cleanup and keyboard retry.
- Isolated Node old-predicate reproduction executed a getter and admitted its forged ID. Isolated fixed-predicate reproduction rejected own/inherited getters with 0 getter calls. These are **not** substitutes for the exact-head native CI.
- Post-merge CI is tracked separately; do not call it PASS until completed.

## Closure boundary and remaining work

`remaining_scoped_implementation=0` and `necessary_unmerged_scoped_PRs=0` **for this descriptor admission repair only**. Parent **SA-EXT-01 remains OPEN**. SA-EXT-02/05/06/07 remain OPEN; 03/04 remain source-terminal. Complete approved parent functionality, cross-layer UI/API/DB acceptance, independent source/licensing/editorial review, physical Windows/Chrome/NVDA acceptance, installed Sites/D1 and backup/release qualification remain unverified. Do not infer production readiness from source CI.

No release publication, production migration, 82-language activation, payments, synthetic users, mass mail or dating service was performed.
