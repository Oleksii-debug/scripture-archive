# SA-EXT-01 / PRIMARY_READER_PROVENANCE_URL_RAW_AUTHORITY — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Date:** 2026-10-30. **Scope:** existing primary Bible reader's licence and origin URL admission, not the full Bible-reader section.

## Reproduced source defect

`localEditionMetadata` in the canonical `public/app.js` previously used bare WHATWG `new URL()` for source and optional licence URL. It silently removed CR/LF/TAB, leading/trailing space or empty `@` authority userinfo before the reader rendered the origin. This breaks the unchanged-authority requirement for source attribution; it does not establish a live exploit.

## Reused existing authority, not new parallel implementation

- [Functional PR #792](https://github.com/Oleksii-debug/scripture-archive/pull/792) **SQUASH MERGED** to exact `main@970d66db7b295bfd57155aa3ab96943619abddd6`.
- Actual `public/app.js@14ff01bbc398484c63ab0b5383cf9477afc5835f` now imports and uses the existing `safeProvenanceHttpsUrl` exported by `public/parallel-reader.js@50badc7992ffb996c744f5da8fdbb55e60c86b6f`; no duplicate parsing authority.
- Existing VM-executed actual `localEditionMetadata` regression `tests/reader-primary-provenance.test.mjs@3241fff8002c12dc3add325b71bee6f9d85b7ba3` injects the real helper and exercises 8 dangerous raw forms × source/licence × three real local editions (UK/RU/EN) = **48** negative checks plus positive ordinary HTTPS/encoded-path cases.
- Exact PR-head [GitHub Actions #41075816618](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41075816618), `56ca28164ba086ecc63ee9a68f409a068155536d`: **COMPLETED SUCCESS**, all native Node tests, TS contracts, lint, source build, disposable Worker/D1 E2E and Python validators. Merged main and both exact blobs read back; PR `merged=true`.

## Official decision

**SA-EXT-01 / PRIMARY_READER_PROVENANCE_URL_RAW_AUTHORITY — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ / CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.**

`remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0` **only for this one primary reader source defect**. Reopen only for a new reproducible defect or approved requirement.

**Still OPEN / NOT_VERIFIED:** complete parent SA-EXT-01 and other 19 parent sections, licensed multilingual corpus and rights, live Sites SHA/Cloudflare D1/privacy, SMTP, actual browser, Windows/NVDA, release or any production data. No new deployed service/translation/account authority, no host publish. Coordination [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297), plan [#295](https://github.com/Oleksii-debug/scripture-archive/issues/295).
