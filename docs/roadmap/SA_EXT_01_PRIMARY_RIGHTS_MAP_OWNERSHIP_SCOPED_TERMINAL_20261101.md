# SA-EXT-01 — PRIMARY_RIGHTS_MAP_OWNERSHIP — scoped source terminal (2026-11-01)

## Exact scope and source finding

The canonical primary reader `localEditionMetadata(catalog)` previously checked own translation *keys* but read `catalog.translations` and `catalog.editions[lang]` through the prototype chain. A damaged in-memory catalogue could therefore select an inherited regional edition or an inherited top-level translation map with the expected edition ID and plausible publisher/licence fields. This is a source-level provenance integrity finding; ordinary JSON transport is separately validated, and **no production exploit or forged live publication is claimed**.

## Reuse → repair → converge

[Functional PR #1139](https://github.com/Oleksii-debug/scripture-archive/pull/1139) **SQUASH MERGED** to `main@91178972ad9c97a8453fca017c3737548859d53c`, feature head `bc464d4029bb4fa464e2bf9b1d31d3fb127f1edb`. Only two paths changed:
- `public/app.js`, integrated blob `adee39f1a39748d022e866bf5bdd06ac58b7fa2a`: reuse the parallel-reader's own-map/own-entry admission pattern before selecting primary source/licence metadata; explicit declared-but-invalid translation still refuses fallback.
- `tests/reader-primary-provenance.test.mjs`, integrated blob `349b9b091a8d267fcebaa54bcdb5cc7c6c8c7e7f`: negative inherited locale keys (uk/ru/en), inherited top-level maps, inherited accessors; positive own null-prototype locales, owned translation precedence, wrong-ID refusal.

## Verification and limitations

[Exact-head native CI #41307851019](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41307851019) **COMPLETED SUCCESS** on `bc464d4029bb4fa464e2bf9b1d31d3fb127f1edb`: 4211 Node PASS / 1 SKIP / 0 FAIL, 37/37 disposable Worker/D1 PASS, 2/2 Python PASS; TypeScript, lint (0 errors, 13 warnings) and build PASS. An earlier test-only CI #41307823447 was **CANCELLED** after the implementation push, so no executed baseline RED is claimed. Exact postmerge main/source/test blobs were read back from GitHub. Full local checkout and real Chrome/Windows/physical NVDA were not executed by this worker.

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **only for PRIMARY_RIGHTS_MAP_OWNERSHIP**. Parent **SA-EXT-01/02/05/06/07 remain OPEN**; 03/04 are source-terminal. Rights clearance, editorial acceptance, actual Sites/D1/backup, installed release and end-to-end human NVDA acceptance remain **NOT_VERIFIED**. Draft convergence PR #325 is not merged or rewritten. No 82-language rollout, new release, production migration, payments, synthetic users, mass email or dating service was launched.
