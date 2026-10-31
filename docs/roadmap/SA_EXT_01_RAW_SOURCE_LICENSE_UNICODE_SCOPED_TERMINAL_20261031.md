# SA-EXT-01 — RAW_SOURCE_AND_LICENSE_UNICODE_CONTROLS — scoped terminal receipt (2026-10-31)

**Status:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` **only** for the exact raw Unicode source/licence URL provenance defect below. **Parent SA-EXT-01 remains OPEN.** This is not `RELEASE_VERIFIED`, `SITE_DEPLOYED`, `WINDOWS_READY` or `NVDA_VERIFIED`.

## Production behavior now integrated

- The existing canonical `public/parallel-reader.js::safeProvenanceHttpsUrl` refuses raw Unicode control (`Cc`), invisible format (`Cf`), unpaired surrogate (`Cs`) and separator/whitespace inputs **before** WHATWG `URL` can silently rewrite them. It still accepts normal HTTPS attribution/licence URIs, ordinary percent-encoded paths and query strings, without accepting embedded credentials.
- The same existing function already controls the canonical comparison reader `mountParallelReader`, original reader source preflight in `public/app.js` and edition-about markup via `public/workspace.js`. No separate reader, API or rights authority has been introduced.
- When edition provenance fails, second-edition chapter verses are not rendered or offered for copying; the local retry control remains available.

## Exact evidence

- Original main before scoped fix: `6368ae42736b9a313381578dbda74edaf7a8dc45`.
- Authored [functional PR #839](https://github.com/Oleksii-debug/scripture-archive/pull/839) **SQUASH MERGED**, exact feature merge `main@d43111e214afdad45e6d35fadf9ebca9a88433eb`.
- Canonical source blob `public/parallel-reader.js@ccc7323f5d04fdca8c255343c992ebf2a5f18514`; focused regression blob `tests/parallel-provenance-unicode-control.test.mjs@928b7b4672c804cf3da87796771041a81c499143`. Both were read back from the merged SHA and PR is `merged=true`.
- Isolated Node 22 **source-aligned** old→new witness: old predicate accepted 19/19 raw hidden variants; new predicate rejected 19/19, and valid HTTPS percent-encoded URL remained accepted. This witness alone is **not** the repository suite.
- [Exact-head GitHub Actions #41167858860](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41167858860) for PR head `3212650e8a219cf6252280594f8b04ff03949c60`: **COMPLETED SUCCESS**. Actual runner steps for native Node regressions, TypeScript, lint, source build, disposable Worker/D1 and existing Python validators all completed successfully. Four new Node tests exercise the helper, edition-about and mounted comparison reader.
- `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` for this exact functional defect only. Reimplementation requires a newly demonstrated regression or approved change.

## Explicitly not closed / next action

- **SA-EXT-01 parent:** other translations/licensing/content, reader completeness, edition rights, actual browser, independent editorial verification, current deployed Sites SHA and physical NVDA acceptance remain separate.
- **SA-EXT-02 and SA-EXT-05 onward:** OPEN, not relabeled by this record. Previously accepted parent SA-EXT-03/04 remain TERMINAL.
- **Site deployment:** none performed. The website's exact installed source, live user sessions, production D1 and email/DNS are **NOT_VERIFIED** by this source PR.
- Coordination: [issue #297](https://github.com/Oleksii-debug/scripture-archive/issues/297); scope index `docs/EXPANSION_SCOPE_INDEX.md`. No public release, scheduled jobs, translations or outbound mail were activated.
