# SA-EXT-03 — public content D1 root integrity (scoped terminal, 2026-10-30)

**РОЗДІЛ SA-EXT-03 / PUBLIC_CONTENT_ROW_OBJECT_INTEGRITY — ЗАКРИТО ДЛЯ ПОВТОРНОЇ РОЗРОБКИ.**
Status: **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**. This receipt applies **only to the named existing publication-read defect**, **not** to the full SA-EXT-03 parent section or the complete site. All 20 parent SA-EXT-01…20 sections remain **OPEN**. New work on this defect requires a reproducible new regression or changed approved requirement.

## Completed functional behavior

The existing canonical `app/api/content/route.ts` public `GET /api/content` no longer spreads arbitrary D1 `site_content.data` JSON into a successful 200 response. The old implementation would spread a persisted JSON string into character-index fields, a JSON array into numeric fields, or a JSON scalar/null into an apparently empty publication. Corrupt/missing/type-invalid `data` and missing/type-invalid/blank `updated_at` are now rejected with existing private no-store **503 `content_unavailable`**, preserving fail-closed behavior. Genuine structured JSON-object content, previous compatible object shapes and the legitimate absent-row empty publication retain their existing successful read behavior. No alternative storage, editor, writer, identity, translation, or publication pipeline was added.

## Exact source and integration

- Code PR: [#729](https://github.com/Oleksii-debug/scripture-archive/pull/729) **SQUASH MERGED**, final source integration commit **`aaee52099946714f51eecd507f60fd737827f4cf`**.
- Main source file: `app/api/content/route.ts`, merged blob `d9e77518e7ea1dd012c80776f0f30a66a7ba2123`.
- New source-executing regression: `tests/content-public-row-integrity.test.mjs`, merged blob `32bfacaae7fd3ae82790aa973de91b2fbb382196`.
- After merge, GitHub PR readback reported `merged=true` and main commit compare reported `status=identical`, `behind_by=0`, at the observed exact integration SHA. Other workers may advance `main` later; this does not invalidate ancestry.

## Executed test evidence — exact PR head

GitHub Actions [run #41061096456](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41061096456) for exact PR head `4f2a642bcc5690f5fc062144bdf9a45ca5b1ed57`: completed **SUCCESS**, real hosted job and successful native execution:
- Node native suite: **2021 PASS, 0 FAIL, 1 SKIP** (2022 total); includes the new 23 test cases for current/legacy/empty publication, 12 corrupt JSON roots, eight damaged D1 metadata variants.
- Disposable local Worker/D1 end-to-end: **22 PASS, 0 FAIL**.
- TypeScript, ESLint (0 errors; 13 warnings), source build: **PASS**.
- Canonical Python validator adapter: **2 PASS**.
- Assertions include valid multilingual publication, empty-row compatibility, fail-closed 503/no-store/private and no authentication/D1 mutation on public GET.

**Remaining scoped implementation: 0. Necessary unmerged PRs for this scoped defect: 0.**

## Out of scope and NOT VERIFIED

- **The full SA-EXT-03 remains OPEN**, including overall author/editor workflows, rights, full approval/revocation/versioning and deployment acceptance.
- The code was **not deployed** in this work; no exact live Cloudflare Sites installed SHA, SMTP/DNS, physical browser keyboard, Windows or NVDA acceptance was established.
- The public D1 corruption fixture is a synthetic local test, not evidence of an actual existing production data-corruption incident.
- No production data, Accounts/D1 schema, scheduled task, publication permissions or separate dating service were changed.

Coordination: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297). Owner catalogue: [#295](https://github.com/Oleksii-debug/scripture-archive/issues/295).
