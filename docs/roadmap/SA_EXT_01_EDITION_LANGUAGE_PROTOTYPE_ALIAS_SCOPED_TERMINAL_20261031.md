# SA-EXT-01 / EDITION_LANGUAGE_PROTOTYPE_ALIAS — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Date:** 2026-10-31. **Section:** SA-EXT-01 (Bible editions/parallel reader). **Status:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` **only for this reproducible defect**. The full parent **SA-EXT-01 stays OPEN** because approved translation rights, edition coverage, provenance, and editorial checks remain unfinished.

## Real production behavior and repair

The existing canonical `public/editions.js` indexed `EDITIONS[lang]` and `editionCopy[lang]` as ordinary objects. An invalid locale equal to an inherited Object.prototype property (`__proto__`, `constructor`, `toString`, `hasOwnProperty`) resolved to a truthy non-list and caused `TypeError: list.find is not a function` rather than safe Ukrainian fallback. It could also select an invalid display label.

The canonical selector now resolves only **own** supported string-locale keys. Unknown or inherited-key locales return the canonical primary Ukrainian edition without consulting a forged preference key; user-chosen supported `uk/ru/en`, valid persisted preferences, external edition links, storage-denied behavior, and all existing reading UI are unchanged. No parallel catalog/reader/router was created.

## Evidence of correctness and integration

- **Functional source PR [#887](https://github.com/Oleksii-debug/scripture-archive/pull/887) SQUASH MERGED**, exact integrated `main@f8d20af9433de5a8e90ec47208ffe14f0e0d88c9`.
- Post-merge readback from **that exact live main**: `public/editions.js` Git blob `024670d26a3676852516efc79eddd82dfb9d84c0`, `tests/editions-storage-fallback.test.mjs` blob `9c33538698379e744a98c1c815b7c56b22f5aa93`; PR `merged=true`, branch/main compare `identical` at readback.
- Executed original exact source in isolated V8: **4/4 prototype-locale values threw TypeError**. Executed updated real source in the same isolate: 4/4 no crash, the unsafe tab set was refused, selected edition was `uk-ohiienko`, localized Ukrainian selector markup remained correct, while legitimate `uk/ru/en` behaved as before. This V8 check does not substitute for CI.
- On preliminary head the newly added real-module Node regression **RED** in [CI #41177788116](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41177788116): invalid locale inherited stored `uk-kulish` and failed exact Ukrainian fallback. Corrected without weakening the test.
- On final exact feature head `595c9d6f68e9317b93ffe9417ce5c70f7cfa4c38`, real [GitHub Actions #41177845597](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41177845597) **COMPLETED SUCCESS**: native Node **2781 PASS / 0 FAIL / 1 SKIP** (2782 tests), disposable local Worker/D1 **22 PASS / 0 FAIL**, TypeScript, lint, source build and Python validators passed. Exact-head CI precedes the merge; no fabricated post-merge CI claim.

**remaining_scoped_implementation=0; necessary_unmerged_feature_PRs=0; CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.** Do not redevelop this subfeature absent a concrete new defect or requirement.

## Explicit exclusions

The full SA-EXT-01 is NOT terminal; other 17 open parents remain OPEN. No claim to 82-language rollout, historical source rights, live Cloudflare Sites SHA, production migration, real Chrome/Windows/focus/NVDA or SMTP proof. No website deployment, release settings, or payment/community automation changed.
