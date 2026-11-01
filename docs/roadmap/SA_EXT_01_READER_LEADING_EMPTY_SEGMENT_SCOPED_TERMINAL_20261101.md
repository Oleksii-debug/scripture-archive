# SA-EXT-01 — READER_LEADING_EMPTY_SEGMENT_FAILCLOSED — scoped terminal (2026-11-01)

**Scope only:** the canonical reader rejects a second leading slash in a pathname or legacy hash route before catalogue/attempt access. This does **not** close parent SA-EXT-01.

## Source defect and repair
The outer `route()` uses `split("/").filter(Boolean)`; malformed `//reader/GEN/3` and `#//reader/GEN/3` therefore reached `renderReader(["reader","GEN","3"])`. The earlier interior-`//` guard did not detect a leading empty coordinate, while the later reader-path shape check silently returned after catalogue access without an accessible error. This is source-level analysis, not a confirmed production incident.

[Functional PR #1129](https://github.com/Oleksii-debug/scripture-archive/pull/1129) **SQUASH MERGED** to exact `main@3147abae55f304d0a113b7fef3eb2c119109ce1f`. Reused existing `public/app.js` guard, no second router/API/DB. A malformed leading segment now clears stale `state.currentReader` and produces localized `role="alert"` plus a recovery link before catalogue/attempt access. Valid ordinary/legacy personal and group URLs, single trailing slash and hash queries with URL values remain accepted.

## Exact source and test readback
- `public/app.js@44a7c7e480cf0b91d81c760d4bf69ce25254e589`
- `tests/reader-empty-path-segments.test.mjs@04a17c4fbb6331501f7b87f5a96a27c5979f135e`
- `tests/reader-hash-query-route-boundary.test.mjs@5c28b50a393f69c4dafe4b03cd3bb71e23d8d8db`
- Functional exact-head `1d29f886b279dfbcf6572e7cd458c0457206dec4`; [CI #41294627496](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41294627496) **COMPLETED SUCCESS**: **4160 Node PASS / 0 FAIL / 1 SKIP**; **37 disposable Worker/D1 PASS**; **2 Python PASS**; TypeScript, lint (13 warnings, 0 errors), build PASS.
- The regression runs the existing reader entry on malformed and valid pathname/hash URLs in uk/ru/en, asserting no catalogue access, no saved-reader mutation, and accessible rejection. No full local native checkout was available; these are hosted exact-head results, **not** a physical Chrome/Windows/NVDA test.

## Remaining work
`remaining_scoped_implementation=0` and `necessary_unmerged_scoped_PRs=0` only for this leading-segment repair. **Parent SA-EXT-01, 02, 05, 06, 07 remain OPEN; 03/04 source-terminal.** The larger approved editions, missions, historical research/atlas and Academy scopes are not completed by this change. Rights and editorial acceptance, physical Windows/Chrome/NVDA, installed Sites/D1/backup, and release #689 remain **NOT_VERIFIED**. Draft #325 is a diverged independent candidate, not silently merged or overwritten. No 82-language launch, production migration, deployment, payments, synthetic users, mass mail or dating.
