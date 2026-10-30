# R0 / SA-EXT-16 — declared origin normalization safety: scoped terminal

**2026-10-30 — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL for these two
reproduced source-validation defects only.** Full parent SA-EXT-16 and all
SA-EXT-01…20 remain **OPEN**.

The existing read-only release declaration checker now refuses:
1. Invisible LF/CR/TAB and other Unicode controls/format separators or padded
   whitespace, even when WHATWG `new URL()` would silently remove them from
   an apparently approved HTTPS host.
2. Syntactically present but empty userinfo (`https://@host`,
   `https://:@host`), which WHATWG normalizes away so the former
   `url.username || url.password` check could not catch it.

Existing canonical origin equality, HTTPS/no path/query/fragment and case/
trailing-slash normalization remain intact. No new deploy or alternative source
of origin truth.

- Functional PR: https://github.com/Oleksii-debug/scripture-archive/pull/784
- Exact merged `main` SHA: `0d9bf08f00794e75a6c91c0f5d6f95a21de63ef0`
- Source blob: `scripts/check-web-release-origin.mjs@3f69ae73471504f9bc501e95851e5c0a0d6607b7`
- Executable regression: `tests/release-origin-hidden-controls.test.mjs@15483df8b035782898054d4468cebe8a3a6ac3fb` (13 deceptive forms x normalization and declaration assertions, plus positive case and slash normalization).
- GitHub exact-head workflow: https://github.com/Oleksii-debug/scripture-archive/actions/runs/41072585585 **COMPLETED SUCCESS**: native Node tests, TypeScript, lint, source build, disposable Worker/D1 E2E, Python validators.
- Post-merge exact source/test blobs confirmed on main; no necessary unmerged PR for this bounded fix.

`remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` only for
the two preflight defects. Do not reopen without a new requirement or concrete
regression. This is **DECLARED_ORIGIN_MATCH_ONLY**; deployed SHA, live DNS/TLS,
production D1, email, Windows/NVDA acceptance and owner publication permissions
remain **NOT_VERIFIED**.
