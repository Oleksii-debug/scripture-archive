# SA-EXT-01 — bounded parallel-chapter rendering: scoped terminal receipt (2026-10-30)

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL — this defect only.** This is not completion of full SA-EXT-01.

## Integrated source and proof

- Feature PR #756 https://github.com/Oleksii-debug/scripture-archive/pull/756 — SQUASH MERGED; immutable integration commit 35a37183ae655d2a11002953f0a3f7a45144e994.

- Production file: public/parallel-reader.js; read-back blob 21bdb6da604f7f274182cbeafab61acc95501c15.

- Tests: tests/parallel-reader.test.mjs; read-back blob e9d0a45de0fbedce86e5fdcc41dffc91a949fe92.

- Exact PR head 4ce42fb028475881bdb904d1403447704a9807f1; GitHub Actions https://github.com/Oleksii-debug/scripture-archive/actions/runs/41066856809 — SUCCESS (Node, TS, lint, build, disposable Worker/D1, Python).

## Accepted user-visible behavior

- Fail closed before constructing any chapter HTML, verse citation button or clipboard snapshot when a damaged second-edition chapter exceeds 256 verses or 131072 total JS string code units. Existing sparse/empty/non-text refusal retained.

- Positive 176-verse Psalm 119-size and 256-verse boundary remain accessible with per-verse citation controls. Negative oversized cases assert empty output, zero copied citations, accessible error and retry; both canonical chapter authorization checks are preserved.

- No additional server, database, proprietary source content, duplicate reader or separate site created.

## Closure boundary

- Remaining implementation for this exact defect: 0. Necessary unmerged PRs for it: 0. Reopen only on a concrete regression or owner scope change.

- The immutable merge SHA above was verified to be an ancestor of later moving main. No physical browser, live Cloudflare Sites deployment SHA, Windows/NVDA, real account, DNS/SMTP or production DB acceptance is claimed.

- Parent SA-EXT-01 and all SA-EXT-02…20 remain OPEN. This is only a narrow terminal. Coordination #297; approved scope #295.
