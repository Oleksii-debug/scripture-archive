# R0.1 / PUBLIC_APP_JS_MIME_GATE — 2026-10-31

**ОСТАТОЧНО ЗАКРИТО ДЛЯ РОЗРОБКИ ТІЛЬКИ ВУЗЬКИЙ MIME/UTF-8 GATE.** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.

- Defect: old `comparePublicAppBytes` reported `PUBLIC_APP_JS_BYTE_MATCH` for correct JS bytes served with `text/html`, JSON, absent or contradictory charset MIME; a browser may refuse to execute them.
- Fix: standard JavaScript/ECMAScript Content-Type with absent or UTF-8 charset is required. Existing exact-byte SHA, approved origin, redirects, bounded stream, Git SHA and credential-free checks remain.
- Feature [PR #987](https://github.com/Oleksii-debug/scripture-archive/pull/987) SQUASH MERGED `main@171bbcb7b7ffe78e59ec8d3ab8897ffe86ccc0de`.
- Source blob `scripts/verify-live-public-asset.mjs@cc9b15e731b86031c5f7e74c42ad44867006d0c6`; test blob `tests/live-public-asset.test.mjs@d441a933efe0cd6d447febcc0613dab446fcdd19`.
- Exact PR-head `75990036fa46ff884f57cad2c0825e6a88389f31` [CI #41220160624](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41220160624): COMPLETED SUCCESS — native Node regression suite, TypeScript, lint, source build, disposable Worker/D1 and existing Python validators.
- `remaining_scoped_implementation=0`; `necessary_unmerged_scoped_feature_PRs=0` for this isolated gate only.
- R0.1 parent, SA-EXT-01..20, deployed Sites Worker, production D1, live `/app.js`, Chrome, Windows, human NVDA and release remain NOT_VERIFIED/OPEN to their own requirements. No deploy, emails, personal-data mutations or new translations occurred.

**Formal:** R0.1 / PUBLIC_APP_JS_MIME_GATE — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ (SCOPED TERMINAL). Do not repeat without a specific regression.
