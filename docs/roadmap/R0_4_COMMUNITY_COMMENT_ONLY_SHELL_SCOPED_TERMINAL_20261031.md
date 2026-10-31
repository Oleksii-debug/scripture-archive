# R0.4 — Community HTML-comment shell readiness: scoped terminal closure (2026-10-31)

**Official status:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` for **this one verified release-preflight false positive**. Full R0.4, all unfinished SA-EXT parents and production release #689 remain OPEN.

## Real defect and behavior

The canonical read-only `communityDeploymentReady()` in `lib/community-smoke.mjs` previously accepted `/community` HTTP 200 HTML when the only `<main id="main">` and `data-route="community"` elements were inside an inert HTML comment. A maintenance page with such comment markup is not a functioning rendered workspace, and must not qualify automated community activation.

The canonical `hasCommunityShell()` now strips complete and unterminated HTML comments before applying its unchanged shell predicates. Its bounded UTF-8 stream, six read-only GETs, no-store/anonymous-account/dispatch-protocol gates, 10s timeouts, and no-mutation default remain. No extra backend, no server route, no user or production data change.

## Exact integrated GitHub evidence

- Functional [PR #1065](https://github.com/Oleksii-debug/scripture-archive/pull/1065) **SQUASH MERGED** with exact reviewed head `6742e482f89378e126fc9b223c313b883e6eb7a4`.
- Exact post-merge `main@fb2ed6689a358b19c29aeb1f80140b17a4d536c7`, verified using repository `commits/main` and `compare` (`identical`). Canonical source blob `lib/community-smoke.mjs@a22ef7ffb85dc277fc4ecf0d8790f6f95f9d61a5`; regression `tests/community-smoke-comment-markup.test.mjs@d2a57d73248845eb608ce2a4648544fc261d14e3`.
- Old Node predicate reproduction: comment-only maintenance shell was incorrectly `true`. Isolated red/green proof: comment-only false, unclosed comment false, legitimate banner+real anchors true, plain shell true (4/4 expected on repaired regex). Not presented as full repository execution.
- Exact-head [GitHub Actions #41245134293](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41245134293) **COMPLETED SUCCESS** for `6742e482f89378e126fc9b223c313b883e6eb7a4`, with executed native Node tests (including real imported `communityDeploymentReady()` regressions), TypeScript contracts, lint, source build, disposable Worker/D1 E2E and canonical Python validators; all steps concluded success.

## End of approved scoped implementation

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0`, `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. Do not reopen this scoped fix without a newly demonstrated defect or changed requirements.

**Separate release truth:** `#689` remains OPEN; the installed site's SHA, live production D1/migrations and backup/restore, release account/provider access, real Chrome/NVDA/Windows, source rights and release owner approval are **NOT_VERIFIED**. No deployment, cron or bot activation, email, monetary operation or production mutation occurred. Coordination: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).
