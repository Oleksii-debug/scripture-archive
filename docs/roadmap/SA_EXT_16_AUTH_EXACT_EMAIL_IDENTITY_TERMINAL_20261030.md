# R0.2 / SA-EXT-16 — exact email identity: scoped terminal

**Date:** 2026-10-30  
**Status:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` **only for `AUTH_EMAIL_NO_PREFIX_ALIAS`**.

## Real defect and correction

The canonical `app/api/auth/route.ts` used `clean(email,254)` in `normalizeEmail`, silently truncating a too-long submitted address. A legal 254-character email plus trailing characters was reduced to the different stored 254-character identity. This could produce an unrelated registration collision, a login lookup for that other account (still requiring its correct password), or a verification/reset email targeting an address different from the submitted address.

The existing canonical auth route now trims and lowercases the entire string, then rejects normalization results longer than 254 characters **without truncation**. Existing database authority, password checks, rate limits, session issuance, provider mail, and generic anti-enumeration resend/recovery responses are preserved.

## Exact evidence

- Functional PR: [#774](https://github.com/Oleksii-debug/scripture-archive/pull/774), **SQUASH MERGED**.
- Accepted feature `main@5050cb7f9816f1cdd6f0adbc8e58c941188daf84`, independently re-read after merge; PR reports `merged=true`.
- Merged auth route blob: `app/api/auth/route.ts@b6253ffd8200419299b62f143fb3f8c189463007`.
- Merged existing route-and-SQLite tests: `tests/auth-token-atomicity.test.mjs@91ae49d97d3c899d9a8d360c646feb438b3339a1`.
- Independent exact-source V8 helper reproduction: original blob `a2014b49ab836b25b647ae41f34500ccb9b7a05c` aliased too-long input; fixed blob does not; exactly 254-character legitimate input and existing trim/case behavior preserved.
- GitHub Actions [source quality #41069364724](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41069364724) **SUCCESS** on PR head `ff212a6a5ab504383f1d36295c29378ad1d8765e`. Actual job `124109096464`: **2213/2214 Node tests passed, 1 skipped, 0 failed**; five newly added real route/SQLite boundary cases all PASS; **22/22 disposable local Worker/D1 PASS**; TypeScript, lint, source build, Python **2/2 PASS**.
- Exact post-merge `main` source/test blobs read back and equal expected.
- `remaining_scoped_implementation=0`; `necessary_unmerged_feature_prs=0` for this particular defect.

## Explicit limits

**Full R0.2 remains INCOMPLETE_RELEASE** because real SMTP/DNS sender, verification and password reset delivery on production have not been accepted. **SA-EXT-16 and all 20 complete parent sections SA-EXT-01…20 remain OPEN**. The browser, real deployed Sites SHA, D1 cutover, Windows and physical NVDA were NOT_VERIFIED; no production deployment or user mail was initiated. Future changes to this scoped defect require a new reproduced regression or changed requirement.

Tracking: [coordination #297](https://github.com/Oleksii-debug/scripture-archive/issues/297), [continuous control #78](https://github.com/Oleksii-debug/scripture-archive/issues/78) and [owner scope #295](https://github.com/Oleksii-debug/scripture-archive/issues/295).
