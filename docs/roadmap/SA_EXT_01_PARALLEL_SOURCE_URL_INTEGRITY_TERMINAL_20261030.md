# SA-EXT-01 / PARALLEL_EDITION_PROVENANCE_URL_RAW_AUTHORITY — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Date:** 2026-10-30  
**Scope:** one reproduced URL-provenance defect in the existing canonical parallel Bible reader — not the SA-EXT-01 parent.  
**Coordination:** [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297); owner scope [#295](https://github.com/Oleksii-debug/scripture-archive/issues/295).

## Reproduced source defect

`public/parallel-reader.js` previously called WHATWG `new URL(value)` before verifying the *raw* source/licence URL string. Node reproduced admission of `https://@source.example/`, `https://:@source.example/`, a CR in an origin, an LF in a path and a leading space. The URL parser rewrote the supplied bytes to a different apparent authority/path. That is insufficient provenance for attribution of licensed Scripture text. **This was not evidence of a live exploit.**

## Actual integrated repair

- [Functional PR #788](https://github.com/Oleksii-debug/scripture-archive/pull/788) **SQUASH MERGED** into exact `main@92e6859602dc0a0247abb8ef091e4ecab248f897`.
- Canonical source: `public/parallel-reader.js`, Git blob `abfd58e0c03e5afc3a202aff4fcbef2ba90bb0ef`.
- Existing regression test: `tests/parallel-reader.test.mjs`, Git blob `be6d3658287b39101e61b48e5387546797092b26`.
- Fail-closed input checks now reject ASCII control/space bytes and `@` user-info in the literal URL authority **before** URL normalization for both source and licence links. Valid HTTPS URL percent-encoding, uppercase scheme and `@` in a query remain supported.
- Comparison verse rendering, clipboard attribution, chapter-attempt authorization and retry/focus controls remain in their existing canonical implementation. No new site, backend, content source, licence grant, account store, or feature copy.

## Real qualification

- Original helper native Node reproduction: **5/5 deceptive forms erroneously admitted** (RED).
- Patched preflight isolated native Node: **8/8 dangerous forms refused**, one uppercase-HTTPS/encoded-path control accepted.
- Exact PR-head [GitHub Actions run #41073854181](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41073854181), head `aa379cc172f6c64ea8074b2dad441fc418528dee`: **COMPLETED SUCCESS**, job `124124678433`. All actual job steps passed: native Node suite (including eight malformed variants x **two** metadata fields = 16 negative source/licence cases), TypeScript contracts, lint, non-deploy source build, disposable local Worker/D1 E2E, and existing Python validators.
- The merged `main` was read back with both exact blob SHAs and PR `merged=true`, commit `92e6859602dc0a0247abb8ef091e4ecab248f897`.

## Official narrow closure and boundaries

**SA-EXT-01 / PARALLEL_EDITION_PROVENANCE_URL_RAW_AUTHORITY — РОЗРОБКУ ПІДПУНКТУ ЗАКРИТО / CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.**

`remaining_scoped_implementation=0`; `necessary_unmerged_PRs_for_this_scope=0`. Do not reimplement without a new evidenced defect or newly approved requirement.

**NOT CLOSED:** full parent SA-EXT-01 (licensed multilingual corpus, comprehensive reader/source rights, real keyboard/NVDA acceptance), the other **SA-EXT-02…20** parents, true Sites deployed SHA, live SMTP/Cloudflare D1 migration, browser/Windows physical acceptance, and release publication. No production deploy, customer data write, mail delivery, new language rollout or owner approval is claimed.
