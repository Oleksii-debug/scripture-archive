# SA-EXT-16 — ambiguous repeated identity cookies: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

Date: 2026-10-31. **Only the narrow post-integration authentication-cookie defect is closed for further development. Parent SA-EXT-16 remains OPEN**, together with the other approved unfinished parent sections. No website release is claimed.

## Actual implemented behavior

- Existing `lib/auth.ts` session-cookie parsing no longer uses last-value-wins semantics when the browser sends duplicate names from distinct Path scopes. The one canonical parser tracks repeated names and removes ambiguous cookies rather than choosing one identity.
- Duplicate `sa_session`, `sa_agent` or `sa_guest` values do not silently authenticate as the last token. Duplicate session-cookie logout now fails closed with `ambiguous_session_cookie` instead of reporting that an arbitrarily selected session was revoked.
- Valid encoded single cookies and unrelated, independent cookies remain available. No new authentication service, parallel database or new public endpoint was introduced.

## Integration and executable evidence

- Implementing pull request: [#875](https://github.com/Oleksii-debug/scripture-archive/pull/875), **SQUASH MERGED** into canonical `main` as **`61085c99289ed056a9021887fe1b00154588ef63`**, from feature head `88866aab77cd79684d0c26e23c1204971a51f569`.
- Two actual code/test paths in merged feature commit: `lib/auth.ts`, blob `021b646f3cbe0d3c312e84a2f697fa7c9b5e90d8`; `tests/auth-duplicate-cookie-ambiguity.test.mjs`, blob `2b5cb3233e82eb8deecf8f71672210c83b44dc9d`. Both blobs reread directly from canonical main after merge.
- [GitHub Actions run #41175980190](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41175980190) for exact PR head `88866aab77cd79684d0c26e23c1204971a51f569`: **COMPLETED / SUCCESS**. Job `source-and-disposable-integration`, id `124463513825`, has **16 real steps**, with native Node regressions, TypeScript contracts, lint, source build, disposable local Worker/D1 end-to-end integration and existing canonical Python validators all reported successful.
- This is exact-head source and disposable integration evidence, not an assertion that the production website was installed or tested. Independent physical Windows 11, browser/NVDA and live Sites SHA have **NOT** been verified by this record.

## Terminal boundary and future work

`SA-EXT-16 / AMBIGUOUS_SESSION_COOKIE_AUTHORITY = CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.
`remaining_scoped_implementation = 0`.
`necessary_unmerged_feature_PRs = 0` **for the above specific defect only**.

Do not repeat this fix without a concrete newly reproduced regression or an approved new requirement. Do **not** mark entire SA-EXT-16 or 20-section product complete; separate email verification/reset, account/privacy migration, real live deployment, license/content completion and end-to-end accessibility obligations retain their own open work. No secrets, private cookies, credentials or user data are reproduced here.

Primary owner control: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297). Master approved scope: [#295](https://github.com/Oleksii-debug/scripture-archive/issues/295).