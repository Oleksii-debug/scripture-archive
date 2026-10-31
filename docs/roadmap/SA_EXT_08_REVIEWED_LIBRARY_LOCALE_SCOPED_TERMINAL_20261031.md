# SA-EXT-08 — reviewed library locale own-key repair: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

Date: 2026-10-31. This final receipt closes **only the demonstrated public library locale bug**, not the parent SA-EXT-08 section or Scripture Archive release.

## Real user-facing scope and repair
The existing canonical /library page and reviewed-material search were both reading a plain JavaScript translation dictionary with inherited-key lookup. For a malformed locale such as `__proto__`, `constructor` or `toString`, JavaScript returned a prototype value rather than a language copy; a null-prototype invalid object could throw. The existing canonical own-key fallback helper now selects `uk` for malformed/inherited values at BOTH route title and search form, without forking the reviewed-material authority. Supported `uk`, `ru` and `en` remain intact.

## Exact integration evidence
- [Feature PR #989](https://github.com/Oleksii-debug/scripture-archive/pull/989): **SQUASH MERGED** into main `2efd12811f6dfb8740788dba9e6b3d94b9bd5d6c`.
- Canonical `public/material-review.js` blob `33e142efa1d28dabf4c41c572c4f5e7f827590f1`.
- Canonical `public/workspace.js` blob `bf195b61243d95cbd1c55167010f80e834ecf4d6`.
- Regression `tests/library-reviewed-route.test.mjs` blob `b41517c312f42753da02cb8d5bae1dbe5605b25c` adds three test cases on the existing mounted library route and search form.

## Actual qualification
[Exact feature-head native workflow #41220737865](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41220737865), head `fd51361e3c412129fa3dbd824310630a3841af37`, **completed/success**. Its single source-and-disposable-integration job recorded completed/success for checkout, Node tests, TypeScript, lint, source build, disposable Worker/D1 end-to-end tests, and canonical Python validators; this is executed CI, not a queued job. No independent local checkout or browser test was run in this closure documentation pass.

## Boundaries and remaining work
- `remaining_scoped_implementation=0`.
- `required_unmerged_scoped_feature_PRs=0`.
- `SA-EXT-08 parent=OPEN`: comprehensive licensed books/catalogue, content-rights verification, broader acceptance and actual Web/Windows/NVDA remain distinct.
- Real production Sites SHA, D1 production migration/retention, actual browser/physical NVDA and release are **NOT_VERIFIED**.
- No deployment, language-expansion task, private-user migration, credentials, fundraising, email or other unrelated change.
- Reopen this scoped repair only for an independently reproduced new defect or a new approved requirement.
