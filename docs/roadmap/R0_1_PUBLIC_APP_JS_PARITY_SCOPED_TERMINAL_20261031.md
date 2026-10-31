# R0.1 / PUBLIC_APP_JS_BYTE_PARITY — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

Date: 2026-10-31. Canonical source repository: `Oleksii-debug/scripture-archive`.

## Exact approved scope

Read-only preflight checking whether `https://scripture-archive.com/app.js` (or another **explicitly approved HTTPS origin**) has the **exact same bytes** as `public/app.js` from a clean, explicitly SHA-pinned Git checkout. Reuse the existing declared-origin validation; **no write** to Sites, D1, account data, mail, payments, schedules, or users.

## Delivered production code and negative checks

- [PR #961](https://github.com/Oleksii-debug/scripture-archive/pull/961) SQUASH MERGED into **`main@3f3623def47bc6cf62f0d8edd7f893efd0d61f6a`**.
- Runtime: `scripts/verify-live-public-asset.mjs`, exact blob **`2466e8ff133528bf14b77c2fb9c8eae4fd051e42`**.
- Regression: `tests/live-public-asset.test.mjs`, exact blob **`c271ba644732e297b17aaa5c3f680c3e1f4234ef`**.
- Only anonymous GET `/app.js`, no redirect or credentials, timeout, limited decoded bytes, SHA-256 of actual body. A clean 40-hex checkout HEAD and unchanged local `public/app.js` are mandatory. Wrong version, bad input, incomplete/oversize body, HTTP failures and content mismatch fail closed. Compressed CDN wire length is handled separately from decoded bytes.
- CLI: `node scripts/verify-live-public-asset.mjs --expected-origin https://scripture-archive.com --expected-head <40-character exact main SHA>`.

## Executed evidence

1. Local native Node 22.16.0 on exact runtime/test Git blobs: **8/8 PASS**, 0 FAIL, including negative/redirect/oversize/dirty-checkout/mismatch/compressed-response cases.
2. Exact PR head `715f5f6683db61b4fc2238388753050f2dd0310d`: [GitHub Actions #41202827639](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41202827639) **COMPLETED SUCCESS**; native Node regression suite, TypeScript, ESLint, production build, disposable Worker/D1, Python validators all SUCCESS.
3. After merge, independently read back `main@3f3623...` and both file blobs; both matched the local `git hash-object` results. Compare merged SHA with `main`: **identical, ahead 0, behind 0**.

## Exact terminal decision / boundaries

**`R0.1/PUBLIC_APP_JS_BYTE_PARITY — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`**, `remaining_scoped_source_implementation=0`, `necessary_unmerged_scoped_feature_prs=0`. No further development of this **specific checker** without a reproduced bug or new approved requirement.

**NOT DONE / NOT VERIFIED:** running this manual checker against the real site (network from current execution inaccessible), installed Cloudflare Worker SHA, D1 migration ledger, migration 0010→0013 release cutover, backup/rollback, authenticated user journeys, independent browser/Windows/NVDA, deployment and the complete 20-section expansion. **Parent R0.1 release acceptance and SA-EXT-16 remain OPEN**. The static-byte check can never by itself assert production readiness.
