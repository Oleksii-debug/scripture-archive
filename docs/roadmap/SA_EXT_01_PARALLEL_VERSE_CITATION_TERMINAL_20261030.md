# SA-EXT-01 — PARALLEL_READER_VERSE_CITATION: terminal source receipt

**Date:** 2026-10-30  
**Decision:** CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL  
**Parent:** SA-EXT-01 remains **OPEN**; all SA-EXT-01…20 parents remain **OPEN**.

## Scope closed
The existing canonical second-edition parallel Bible reader, mounted from `public/parallel-reader.js` by `public/app.js`, now has accessible per-verse citation controls. The citation copies the *second edition's own* verse and verified title, license, attribution, HTTPS source, and license URL. The primary edition's rights are not borrowed. Accessible UK/RU/EN labels and success/error messages, valid chapter guards, current reader/principal/edition checks, invalid verse rejection, detached-panel guards, clipboard error recovery and frozen verse snapshots are part of the same real feature.

## Exact integrated evidence
- Feature PR: [#695](https://github.com/Oleksii-debug/scripture-archive/pull/695), **merged=true** (squash).
- Exact feature main merge SHA: `50cef1bd98d25f34bc204b6d4c8bb43903ac05d5`.
- Reviewed PR HEAD: `1d28262cb730ce13ab9259ac115cc8a99c13956b`.
- Main source blob: `public/parallel-reader.js@f67e040d01dd43982ee6abda0265c84a2758d918`.
- Main regression blob: `tests/parallel-reader.test.mjs@34ca63d8a219b602f9905237e4f523b5d6f5e89e`.
- Exact-head [GitHub Actions #41057070238](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41057070238): **SUCCESS**. Native Node: **1,806 PASS, 0 FAIL, 1 SKIP**; disposable local Worker/D1: **22 PASS, 0 FAIL**; TypeScript/lint/source build and Python: **2 PASS**. The earlier head `4964d1c0…` had a red Node test fixture and was superseded by the successful fixed HEAD. No test result is inferred from queuing.
- GitHub readback after merge: PR merged, `main` at the exact merge SHA, both source/test blobs fetched from `main`.

## Closure and exclusions
For **PARALLEL_READER_VERSE_CITATION only**, `remaining_scoped_implementation=0` and `necessary_unmerged_PRs=0`. Do not repeat this scoped feature absent a demonstrated new defect or a new approved requirement.

This does **not** declare the entire SA-EXT-01 parent, the 20-section product, browser/physical NVDA, Cloudflare Sites installed SHA, licensed rights for additional editions, SMTP, live production migration or the Windows release complete. No site deployment, privacy migration, user-data write or new language was performed. Coordination: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).
