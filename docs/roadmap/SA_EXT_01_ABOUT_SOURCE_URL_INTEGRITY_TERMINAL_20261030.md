# SA-EXT-01 / ABOUT_EDITION_PROVENANCE_URL_RAW_AUTHORITY — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Date:** 2026-10-30. **Scope:** only the source/licence HTTPS-link truthfulness on the existing Bible-edition About screen; parent SA-EXT-01 is not completed.

## Reproduced source defect

`public/workspace.js` contained its own loose `new URL()` admission. CR/LF/TAB, surrounding spaces and empty `https://@host`/`https://:@host` authority delimiters were silently removed before emitting a source/licence link. A malformed catalogue URL could therefore be represented as original Bible edition provenance. This is a source-level defect demonstration, not a claim of live exploitation.

## Implemented and integrated

- [Functional PR #790](https://github.com/Oleksii-debug/scripture-archive/pull/790) **SQUASH MERGED**, exact `main@e2ae19ee2e2f77b2bc34a0ac062d3007bf3ac546`.
- `public/workspace.js@772ae1dac4d11d8614b37ed6d5942193f28e54de` removes the weaker local validator, importing the **single** `safeProvenanceHttpsUrl` from `public/parallel-reader.js@50badc7992ffb996c744f5da8fdbb55e60c86b6f`. It uses this for both source and licence display.
- `tests/edition-about.test.mjs@25c1def2f5e5152fa9438259fc87dc5875e9f62a`: 8 malformed raw URL forms × 2 fields × 3 UK/RU/EN locales = **48** negative checks, positive legitimate HTTPS controls.
- [Exact-head GitHub Actions #41075153406](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41075153406), head `3219970a50e9727addf599d2e84b99722dedb547`: **COMPLETED SUCCESS**, all job steps passing (native Node regression, TypeScript, lint, source build, disposable Worker/D1 E2E, existing Python validators). Exact merged main source/test blobs read back.

## Final decision

**SA-EXT-01 / ABOUT_EDITION_PROVENANCE_URL_RAW_AUTHORITY — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ / CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.**

`remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0` for this defect. No need for more work without a newly evidenced bug.

**Explicitly NOT CLAIMED:** complete SA-EXT-01, any of the SA-EXT-02…20 parent sections, all licensed editions/translations, live Sites deployed SHA, browser/physical NVDA acceptance, hosting/D1/SMTP migration, new service, publication, customer-data mutation or mail delivery. Coordination [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297), original scope [#295](https://github.com/Oleksii-debug/scripture-archive/issues/295).
