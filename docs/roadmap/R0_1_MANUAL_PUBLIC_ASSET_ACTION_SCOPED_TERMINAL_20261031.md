# R0.1 / MANUAL_PUBLIC_ASSET_ACTION — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

2026-10-31. A specifically scoped, immutable-source, **manually invoked** GitHub Actions entrypoint for the already merged R0.1 static public `app.js` byte comparison. **No live check was dispatched, no release was performed.**

## Integrated source

- [Feature PR #963](https://github.com/Oleksii-debug/scripture-archive/pull/963) **SQUASH MERGED** to `main@14c5e421668f1fee487d3404f7adb3e26482b008`.
- Workflow `.github/workflows/manual-public-asset-parity.yml`, exact Git blob `14e7614c82ea854ee58d55c1fef50d71f151f0c8`.
- Regression `tests/manual-public-asset-workflow.test.mjs`, blob `f0d71f66ca3bfb933601249e660715ca5a3dd3c7`.
- The workflow has only `workflow_dispatch`, no scheduled or push-triggered public Site check, no deployment, no D1, no secrets or contact with users. It checks out immutable `github.sha` with `persist-credentials:false`, has `contents:read` only, and compares that checkout to a human-provided exact SHA. Inputs pass through environment variables, not interpolation into shell source; outbound HTTP is restricted to the existing read-only asset probe.

## Verification

- Local Node 22.16.0: **3/3 new action-config regression tests PASS**, plus **8/8 pre-existing R0.1 CLI tests PASS** on the exact source file bytes; 11/11 together.
- [GitHub Actions #41203374221](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41203374221) on feature head `c7b1970c34a74820db21be1e109cd61da56c8986`: **COMPLETED SUCCESS**; Node, TypeScript, ESLint, production build, disposable Worker/D1 and Python validators all succeeded.
- Re-read post-merge `main` and the workflow/test blobs; confirmed exact identities, `compare(main@14c5e421..., main)=identical`.

## Terminal decision

**`R0.1/MANUAL_PUBLIC_ASSET_ACTION — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`**. `remaining_scoped_source_implementation=0`, `necessary_unmerged_scoped_prs=0`; do not reimplement this approved single action without a reproduced defect.

**NOT VERIFIED:** No GitHub `workflow_dispatch` action was started in this run: the available connector cannot dispatch workflows. The current public Site cannot be reached from this executor; no live `/app.js` checksum or installed server SHA was established. Full R0.1 release/site verification, SA-EXT-16 parent, actual Cloudflare/Sites deployment, D1 migration ledger and backup, authenticated Chrome journeys, Windows/WebView2/NVDA and copyright clearance **remain OPEN**.
