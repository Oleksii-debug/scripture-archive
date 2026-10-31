# SA-EXT-05/06 — invisible-control GET search integrity — scoped terminal

**Status:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. **This does not close SA-EXT-05, SA-EXT-06 or the complete Scripture Archive.**

## Approved scope and concrete behavior

The existing source-backed Scripture dossier search, native dossier GET markup and text-first atlas reject a nonempty raw query containing C0/C1 controls, bidirectional/invisible formatting controls, paragraph separators or lone Unicode surrogates before selecting or displaying Scripture source links. They preserve the established 120 UTF-16 code-unit limit. An empty or whitespace-only GET (including tab-only) retains the existing byte-identical, unfiltered atlas. Valid canonical citation queries, selected dossier links, normal source provenance, search and no-query recovery remain accessible and unchanged.

This repairs ambiguous pasted query handling (for example, `GEN 17:15\n` formerly becoming a valid source query after `trim()`); it is **not** evidence of a production security incident. No Bible text, scholarly interpretation, source license, user data or account authority was changed.

## Integration and test readback

- Real production source: `public/scripture-dossiers.js` blob `a1fa9175184f32f2579167de3571dd68e506ec59`.
- New regression: `tests/dossier-search-invisible-query.test.mjs` blob `fc7fe58d57fd63ab42e58d4696157dd4a1d4abec`.
- [Functional PR #1086](https://github.com/Oleksii-debug/scripture-archive/pull/1086), **SQUASH MERGED** into `main@9b4959d1fe0876ef26a2373a74f684acf398ce68`.
- First head `95ab8becdd1624e7d05f0a9b170a515f21cd822b` failed a real pre-existing regression preserving tab-only no-filter navigation. No passing claim for that head.
- Repaired exact head `68bc887f2e22158a4e778779810cf9556ee3eaaa`: [GitHub Actions run #41247019935](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41247019935), **COMPLETED SUCCESS**. Native Node **3940 PASS / 0 FAIL / 1 SKIP**; TypeScript, lint, source build, disposable Worker/D1 **37 PASS**, Python validators **2 PASS**. All job steps succeeded.
- GitHub post-merge readback established `PR.merged=true`, `main@9b4959d1fe0876ef26a2373a74f684acf398ce68`, and exact blob identities above.
- `remaining_scoped_implementation=0`; `necessary_unmerged_scoped_PRs=0` at feature merge.

## Scope restrictions and handoff

Full SA-EXT-05/06 remain OPEN: additional historical/source editorial verification, real accessible user workflows, map rights, physical keyboard/NVDA acceptance and live Sites/D1/deployment are not shown by these source tests. R0.1–0.6 release gates, especially release #689, remain independent. No production deployment, emails, automation launch, new languages, payments or real-user data writes were performed. Reopen this narrowly completed search-input boundary only on a new reproducible defect or approved requirement. The open parent requirements and parallel workers must continue without reimplementing this fixed slice.
