# R0.4 — PUBLIC_SUMMARY_CACHE_AND_ANON_EXACT_SHAPE / CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

Date: 2026-10-31. **Closure covers only this verified P0 preflight regression, not all R0.4, SA-EXT-10, SA-EXT-16 or the final release.**

## Real existing implementation

The canonical `lib/community-smoke.mjs::communityDeploymentReady()` checks six existing GET endpoints without redirect follow or POST. It now rejects:

1. A success-shaped `GET /api/community?public=summary` containing plausible public counters when its response is cacheable, missing an explicit `Cache-Control: no-store`, or supplies a lookalike directive. The canonical `app/api/community/route.ts` already emits `no-store`.
2. An unauthenticated `GET /api/account?action=me` JSON response carrying extra fields beside the sole expected own `user:null`, even if the `user` field itself is null and the response is no-store. The canonical `app/api/account/route.ts` already returns exactly `{user:null}` for unauthenticated readers.

The earlier signed dispatch / anonymous-account cache gates remain intact. This is **a source-level false-positive release-readiness bug**, not an observation of private production data exposure or actual stale edge traffic. No new account endpoint, worker, scheduler, schema, external service or production mutation was introduced.

## Reproduction and exact GitHub evidence

- Original `lib/community-smoke.mjs` blob `f098b30ff0e8807f22f296e390ac717df4db05b2` was reconstructed byte-identically (`git hash-object` matched). Native Node v22.16.0 reported `communityDeploymentReady=true` on both a `{user:null,privateEmail:"..."}` account response and a `public,max-age=3600` cacheable summary, alongside the expected `healthy=true`.
- Patched tested production blob `lib/community-smoke.mjs@4db3745fc538ad67c17b9a4e6e4e2134b0eea522` kept the real probes and fail-closed behavior. `node --check` PASS. The isolated native Node negative/recovery suite gave 23 failures on the original source (before correcting one test expectation), then **34/34 PASS / 0 FAIL** on the patched source.
- [Functional PR #1040](https://github.com/Oleksii-debug/scripture-archive/pull/1040): exact PR head `458916a79192f0c9337165c37c05245d8ce30032`; **SQUASH MERGED** into `main@afb33edac75af68395fe8b9ac8c52b64e5dea26f` after checking the one concurrent `public/app.js`-only change did not overlap any touched file.
- Exact post-merge GitHub readback: production blob above; existing native fixture `tests/community-smoke.test.mjs@5b8043e1b74e8d337e68f4a223de2b0dccf91165`; new 34-case regression `tests/community-readiness-private-cache.test.mjs@c1417bdaaa65611ca0a6fe27f80311413d23644a`. The changed tests run under the existing native `npm test` glob.
- [Exact PR-head Actions #41242395430](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41242395430) **COMPLETED SUCCESS**, same head `458916a...`. Real executed steps: **3625/3625 native Node PASS / 1 SKIP**; **30/30 disposable Worker/D1 integration PASS**; **2/2 Python PASS**; TypeScript, lint, build PASS. This is source/disposable CI evidence, **not installed Sites/production E2E**.

## Strict final scoped disposition

`remaining_scoped_implementation=0`  
`necessary_unmerged_scoped_PRs=0`  
**`CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` — PUBLIC_SUMMARY_CACHE_AND_ANON_EXACT_SHAPE only.**

**Still open:** R0.4 and parent SA-EXT-10/16, production privacy cutover #689, real Sites/D1 SHA and migration ledger, backup/restore, owner STOP/START rights, actual email and account recovery, browsers/keyboard/Windows/NVDA and final release. No deploy, D1 migration, owner account, community START/POST, mail, payment or synthetic-profile action was performed. Reopen this narrow scope only for a concrete reproduced regression or a new requirement.
