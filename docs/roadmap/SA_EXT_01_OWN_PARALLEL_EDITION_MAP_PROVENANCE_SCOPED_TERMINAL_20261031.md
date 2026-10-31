# SA-EXT-01 / OWN_PARALLEL_EDITION_MAP_PROVENANCE — scoped terminal receipt

**Date:** 2026-10-31. **Status:** CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL. **Parent SA-EXT-01 OPEN.**

## Scope permanently closed for development

The existing canonical accessible parallel Bible reader `public/parallel-reader.js::mountParallelReader` now allows attribution/rights metadata exclusively from own `catalog.editions` and `catalog.translations` maps and own locale/translation keys. Previously an inherited `catalog.editions[lang]` or top-level inherited `catalog.translations` could satisfy a valid-looking metadata field check and incorrectly attach unrelated source/rights claims to loaded chapter verses. The fix preserves explicit owned translation precedence, genuine owned legacy edition fallback, source/rights bounds and both assessment checks. No parallel module, service, publication, new translation or Bible-text rewriting.

## Evidence
- Source PR [#1073](https://github.com/Oleksii-debug/scripture-archive/pull/1073) **SQUASH MERGED**, exact functional `main@454067a80e0af17d14fddb4a61c927611fc7f5b8`. Source `public/parallel-reader.js` Git blob `0c9b35c22f1506c01e916602043d15d67d031f07`.
- Four committed native real-module regression tests added to `tests/parallel-reader.test.mjs`, Git blob `6e39340f9289eac79cc484df89bad22da5374cc7`: inherited locale, inherited top-level edition or translation map, valid own fallback, valid own explicitly selected translation, bad explicitly declared identity and accessible failure/retry behavior.
- PR head `311fde43bcd680b25ded73e7b868269eac04c12c`: exact-head [GitHub Actions #41245903139](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41245903139) **COMPLETED SUCCESS**. Native Node tests, TypeScript, lint, source build, disposable Worker/D1 and Python all executed and passed. This is source/isolated qualification, **not** physical Windows/NVDA or live-domain release acceptance.
- Exact source and test blobs read back from GitHub `main` after integration, both match feature merge.

`remaining_scoped_implementation=0`; `necessary_unmerged_scoped_PRs=0`. **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** only this specific provenance integrity boundary; do not reopen without a new concrete defect or approved change.

## Outstanding independent requirements

Parent **SA-EXT-01 remains OPEN**: Bible translation/source licensing and edition provenance audit, complete accessible browser workflow and installed website verification. Other parents and release [#689](https://github.com/Oleksii-debug/scripture-archive/issues/689) remain open. Real Sites exact SHA, production D1, backup/rollback, source rights, actual Windows/Chrome/physical NVDA NOT_VERIFIED. No production deployment, private-account mutation, email, payment, cron activation or new languages were performed.

See [canonical board #297](https://github.com/Oleksii-debug/scripture-archive/issues/297).
