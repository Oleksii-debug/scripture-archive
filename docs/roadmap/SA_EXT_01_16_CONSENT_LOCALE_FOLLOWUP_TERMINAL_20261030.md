# 2026-10-30 Scripture Archive SA-EXT-01/16 — TWO SCOPED TERMINAL FOLLOW-UPS

## Scope and disposition
The parent SA-EXT-01…20 approved sections all remain OPEN. These records close only two defects of the existing canonical account route, not the full product, packaging, deployed site or physical NVDA.
Statuses for each: `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`.

### SA-EXT-16 consent withdrawal with malformed legacy metadata
- [PR #647](https://github.com/Oleksii-debug/scripture-archive/pull/647) MERGED to exact `main@a947ac31b40e937fca73d9c602a9d4707010731f`.
- Existing `app/api/account/route.ts`: validate accepted consent's authored tradition/denomination/church type/length before D1, but malformed abandoned fields must never prevent `acceptSensitive=false` withdrawal.
- `tests/account-write-receipts.test.mjs` current blob `51d828c4f231e50a223e4947142969fe859ce501`; 19 new real-route cases: malformed inputs, optional omitted/null, valid exact Unicode boundaries, withdrawal with stale data.
- [Exact-head CI #41044241339](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41044241339): native Node 1569 PASS / 0 FAIL / 1 SKIP; TS/lint/build/Python PASS; **whole CI FAIL** because unrelated Wrangler/D1 503, 21/22 HTTP tests.

### SA-EXT-01 typed malformed profile locale
- [PR #651](https://github.com/Oleksii-debug/scripture-archive/pull/651) MERGED to exact `main@eddd3b0ccb9e4d79720f846e69f72e3567365ba3`.
- `app/api/account/route.ts` current blob `4ad13a82b95c2f52b9bcaff24174174a3a1ad360`; malformed nonstring explicit locale JSON is rejected with private HTTP 400 and zero D1 writes.
- Existing canonical SA10 contract intentionally maps unsupported *textual* locale such as `de` to UK. First CI [#41044653188](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41044653188) found 2 SA10 SQLite regressions when a first candidate rejected unknown textual locale; the candidate was **repaired before merge**, not hidden or weakened.
- `tests/account-profile-locale-strict.test.mjs` current blob `b9d74c045049d18c98037179347da05502618e1d`; 22 real-route cases (10 malformed typed rejects and 12 approved/legacy accepts, including SA10 fallback).
- [Exact-head CI #41044921126](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41044921126): native Node 1600 PASS / 0 FAIL / 1 SKIP; TS/lint/build/Python 2 PASS; **whole CI FAIL** because unrelated existing Wrangler/D1 503, 21/22 HTTP tests.

### Current readback, limits and follow-up
After both merges: exact `refs/heads/main@eddd3b0ccb9e4d79720f846e69f72e3567365ba3`, both PRs `merged=true`, code and test blobs in main. These source-level terminals do **not** qualify Cloudflare Sites production/deployment SHA, Chrome browser, Windows/WebView2, physical NVDA, translation rights, email/DNS, production D1, full 82 languages, or the 20 full parent sections. No migration, new server, payment, private user data change or deployment performed. Separate unresolved Worker/D1 release failure [#618](https://github.com/Oleksii-debug/scripture-archive/issues/618) must remain OPEN. Central [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297#issuecomment-6521107672).

Prior scoped terminal [#644](https://github.com/Oleksii-debug/scripture-archive/pull/644) and its standalone [receipt](SA_EXT_01_16_ACCOUNT_PROFILE_LOSSLESS_TERMINAL_20261030.md) remain valid as historical exact-merge authorities; #647 adds the necessary consent-withdrawal safeguards.
