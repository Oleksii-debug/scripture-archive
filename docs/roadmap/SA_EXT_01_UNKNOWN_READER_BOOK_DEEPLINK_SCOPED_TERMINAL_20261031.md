# SA-EXT-01 — explicit unknown reader book deep-link admission (scoped terminal, 2026-10-31)

**Scope:** `EXPLICIT_UNKNOWN_BOOK_DEEPLINK_FAILCLOSED`. **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** only for this narrow source-integrity boundary. **Parent SA-EXT-01 remains OPEN.**

## Real defect and correction
At `main@bc1c7d93f1da315fb3c2934ed26df46f5a0c6f3b`, the canonical `public/app.js::renderReader` used `books.find(...) || books[0]`. An explicitly unknown URL such as `/reader/ZZZ/5` therefore silently selected `GEN` chapter 5, misrepresenting the requested source. Exact old-source executed readback: `code=ZZZ`, `meta.code=GEN`. This is a reproducible source-level correctness defect, **not** a claimed production exploit.

[Functional PR #1081](https://github.com/Oleksii-debug/scripture-archive/pull/1081) **SQUASH MERGED** at `main@0dbf8979cff3a95a44760e1929a02e7fd9822549`. Unknown explicit book IDs now stop before chapter selection, attempt guard, Bible fetch or source rendering; the previous reader context is retired and an accessible `role=alert` provides a safe `/reader` recovery link. Valid exact/lowercase codes, ordinary `/reader` saved-book resume and fallback from a damaged *saved* book remain intact. No second source, server, D1 schema or private progress mutation.

**Exact source readback:** `public/app.js@9ba2cd1e6e06b6a4aab9af221f004da4e27789dd`; `tests/reader-unknown-book-route.test.mjs@9dad4750b27c7229414fc32ecfed959b9a36ee51`. Tests execute the actual production `renderReader` entry in three locales with unknown/unsafe book IDs, valid links, resume and recovery; isolated source-executed pre-merge check 21/21 PASS. These isolated checks are not substituted for CI.

[Exact PR-head GitHub Actions #41246461479](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41246461479) **COMPLETED SUCCESS** on `62631e37a9cbc2e944bffb5f7616e515bbbe5e7a`: native Node **3791 PASS / 1 SKIP / 0 FAIL**; disposable Worker/D1 **35/35 PASS**; Python **2/2 PASS**; TypeScript, lint and source build SUCCESS. Main readback after merge verified both exact blobs and `PR.merged=true`.

**Closure bounds:** `remaining_scoped_implementation=0`; `necessary_unmerged_scoped_PRs=0`. SA-EXT-01/02/05/06/07 parents **OPEN**, SA-EXT-03/04 source-terminal, release #689 **OPEN**. Licensed Bible editions, editorial approval, real Chrome/Windows/physical NVDA, installed Sites SHA, live D1, backup/recovery and independent release acceptance **NOT_VERIFIED**. No deployment, production migration, user data changes, 82-language expansion, payment, mass mail, synthetic users or dating service.
