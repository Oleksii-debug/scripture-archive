# Scripture Archive — public reviewed-material client license links: terminal scoped source closure

Date: 2026-10-31. **STATUS: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**, only for the client-side raw URL provenance predicate in the canonical reviewed-material catalogue. Do not redo absent a new demonstrated defect or approved requirement.

## Exact product scope

- Existing `public/material-review.js::canonicalPublicHttps` guards every public reviewed-material rights link and editor rights rendering against raw control, invisible direction-changing Unicode, lone UTF-16 surrogate, and user-info authority ambiguity prior to WHATWG URL parsing.
- The existing authenticated editorial UI and public `renderPublicMaterials` remain the only interface: malformed publication metadata takes the pre-existing recoverable error/alert path, never becomes a misleading clickable rights link.
- Valid HTTPS publisher URLs, percent-encoded paths, query-string `@` and retry rendering remain usable. No new API, second client, D1 mutation, translation, auto-deploy or release.

## Material verification

- [Functional PR #967](https://github.com/Oleksii-debug/scripture-archive/pull/967) **SQUASH MERGED** to exact production `main@420b5e9f2dcb708ef81944d568efbd54af194970`.
- Exact-head [Actions #41204439232](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41204439232) **COMPLETED SUCCESS** on PR head `772e87afd46ae656820e5be7fe8e3c7cccf12602`: native Node **3405 PASS, 0 FAIL, 1 SKIP**, disposable Worker/D1 **24 PASS**, Python **2 PASS**, TypeScript/ESLint/build PASS.
- Post-merge GitHub source readback: `public/material-review.js@4a33e12ada329a5a5acc286effbc3b01d82700f0` and `tests/material-license-url-dom.test.mjs@ed24d567b6dd8862bc31e7c33a79fde9026fe9d0`. New test directly invokes real UI render with poisoned rows and validates a recoverable alert/no bogus href, plus valid URL and later recovery.
- Server companion already integrated in [PR #965](https://github.com/Oleksii-debug/scripture-archive/pull/965), [PR #966 receipt](https://github.com/Oleksii-debug/scripture-archive/pull/966); this record does not conflate the two separate commits.
- `remaining_scoped_implementation=0` and `necessary_unmerged_scoped_feature_PRs=0` for this **specific** browser URL predicate only.

## Boundaries

Previously closed parent SA-EXT-03/04 stay terminal. Parent SA-EXT-01/16 remain OPEN; the full 20-section programme, live Sites SHA, D1 migration history, hosted browser, Windows/WebView2, physical NVDA, edition permissions and final release remain **NOT_VERIFIED**. Do not infer deployment from source merge.

Coordination: #297 (active), #78 (comments disabled due GitHub 2500+ limit).
