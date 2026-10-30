# SA-EXT-16 — read-only origin and public route preflight: scoped terminal receipt

Date: 2026-10-30. Canonical repository: `Oleksii-debug/scripture-archive`.
STATUS: `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` **only** for `READONLY_ORIGIN_AND_PUBLIC_ROUTE_PREFLIGHT`.
Parent SA-EXT-16: OPEN. All parent SA-EXT-01…20: OPEN.

## Canonical source, no duplicate implementation
Reused the exact approved preflight source and tests from older draft [#288](https://github.com/Oleksii-debug/scripture-archive/pull/288), without merging the old app/router into today's web runtime. Existing release instructions are in `docs/WEB_RELEASE_DEPLOYMENT.md`.

- [PR #775](https://github.com/Oleksii-debug/scripture-archive/pull/775): squash merged `82cc9a45e72e623fe34fd51613f57ee083e2992b`, preflight CLI `scripts/check-web-release-origin.mjs` blob `80067ef46465070b2fc3f9bb2db17a69f7da09fc`, six real Node tests `tests/release-origin-declarations.test.mjs` blob `e119dad47d8fa43a1e4d547f12c59ea5446f3835`.
- [PR #777](https://github.com/Oleksii-debug/scripture-archive/pull/777): merged `c6e3c12be1efeb58239f17697e4c433e315f8b1f`, canonical public-route source checks `tests/public-route-release-contract.test.mjs` blob `04b3b9e24911457417b9fc0dfa8e885c087c1cc6`. Its new test proves sitemap/direct paths, private exclusions, language selector and robots boundaries on the current source; it is not actual deployed HTTP proof.
- Both merged files were independently read back from live GitHub `main`. No pending source PR needed for this *scoped feature*. Draft #288 retains any distinct unfinished work; do not merge its stale app ancestry.

## Exact-head validation
- [Actions #41069789649](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41069789649): status `completed`, conclusion `success`, head `a0e4f1b4b45c34ad39ee0fb0f909a0bbdfb5bfc4`. Native Node, TypeScript, lint, build, disposable Worker/D1, Python job steps succeeded.
- [Actions #41070132012](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41070132012): status `completed`, conclusion `success`, head `07a6273d0fdeffe1ba126676dbd15deb40701e7c`. Same job `source-and-disposable-integration` succeeded.
- Verified merged-source ancestry: `main@c6e3c12be1efeb58239f17697e4c433e315f8b1f` has parent `82cc9a45e72e623fe34fd51613f57ee083e2992b`.
- CLI success means **`DECLARED_ORIGIN_MATCH_ONLY`**, *not* DNS, TLS, deployed SHA, production D1, SMTP, real browser or physical NVDA readiness.

## Closure and handoff
`remaining_scoped_implementation=0`. `necessary_unmerged_PRs=0`. No second server, no runtime credentials, no user/data writes and no deployment performed. Only a **new demonstrated regression** or a new approved requirement reopens this precise source boundary.

Existing owner coordination: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297), owner scope [#295](https://github.com/Oleksii-debug/scripture-archive/issues/295). Existing release gate [#689](https://github.com/Oleksii-debug/scripture-archive/issues/689). Source checks are not a production release approval. The 20 parent sections remain open until every approved requirement and applicable acceptance is satisfied.
