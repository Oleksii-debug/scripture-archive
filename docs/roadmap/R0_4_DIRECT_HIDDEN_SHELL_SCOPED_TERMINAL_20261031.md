# R0.4 / DIRECT_HIDDEN_SHELL_READINESS — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

- Date: 2026-10-31.
- Repository: `Oleksii-debug/scripture-archive`; canonical source: `lib/community-smoke.mjs`.
- Scope: direct HTML `hidden`, `inert`, and `aria-hidden=true` on `html`, `body`, `main#main`, and the `a[data-route=community][href=/community]` readiness markers.
- Reproduced original: after merged #1068, 52/52 direct inaccessible-marker samples were incorrectly accepted. Valid controls remained accepted.
- Corrected: [PR #1072](https://github.com/Oleksii-debug/scripture-archive/pull/1072) **squash merged** at exact feature `main@30f2b7c14d55fa96a8eed8f2ba13748bb050b83b`.
- Production source Git blob: `c38891682ddf423d62b05238175506f7154dfa6b`.
- Native regression Git blob: `tests/community-shell-hidden-aria.test.mjs@74d916dc367f984405d9d2d6fac3c85de7aada99`.
- Focus: 52 negative + 24 positive + 1 recovery case; source-level V8 old/new 52 erroneous positives → 52 fixed negatives and 24 unchanged positives.
- Exact-head run: [Actions #41245745253](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41245745253) `COMPLETED SUCCESS` on PR head `f835c2592ec6eb84fa62d01133a14695cf85a11f`, with actual 16 successful job steps; Node **3778 PASS / 1 SKIP / 0 FAIL**, disposable Worker/D1 **35/35 PASS**, Python **2/2 PASS**, TypeScript/lint/build **SUCCESS**.
- Remaining approved **direct-marker** implementation: `0`. Necessary unmerged PRs for this direct-marker repair: `0`.
- Status: **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**; do not reopen without a new reproduced direct-marker defect.
- Not closed: broader R0.4/SA-EXT parents; inherited hidden/inert ancestors (new, separately proven scope); live production page, installed Sites/Worker SHA, production D1, Windows/browser/NVDA and release #689. No deploy/migration, scheduler activation or external email.
