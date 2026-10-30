# SA-EXT-16 — declared origin and public route integrity — SCOPED TERMINAL

Date: 2026-10-30

**Only this bounded source-delivery subsection: ЗАКРИТО / CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.** Full parent SA-EXT-16 and all SA-EXT-01…20 remain OPEN. No new automatic publication or approval of production was performed.

## Approved behavior and reuse

- Exact upstream draft #288 preflight source **reused byte-for-byte**, not the draft's stale web application.
- `scripts/check-web-release-origin.mjs` validates that `NEXT_PUBLIC_SITE_URL`, `APP_BASE_URL` and explicit owner-selected `--expected-origin` are the same bare HTTPS origin. Fail-closed for missing, mismatched, malformed, unsafe or credential-bearing values. Output `DECLARED_ORIGIN_MATCH_ONLY` cannot be misread as deployment validation.
- `tests/release-origin-declarations.test.mjs` executes valid, invalid and CLI cases (6 tests).
- `tests/public-route-release-contract.test.mjs` protects the current server catch-all, sitemap, public navigation, nonindexing of private routes, `/help`, `robots.txt` prefix rules and exactly UK/RU/EN permanent UI languages (7 tests).
- Existing `docs/WEB_RELEASE_DEPLOYMENT.md` now names the command and its non-deployment limitations. No existing server, route, auth, D1, SEO writer or public app was replaced; `npm test` discovers new regressions in the same CI.
- Already integrated `public/route-location.js`/hash-anchor keyboard tests and canonical `robots.txt` were deliberately preserved.

## Immutable integration readback

- Feature and docs PR: https://github.com/Oleksii-debug/scripture-archive/pull/777
- Accepted GitHub squash main SHA: `c6e3c12be1efeb58239f17697e4c433e315f8b1f` (GitHub exact post-merge main branch readback identical).
- `scripts/check-web-release-origin.mjs`: Git blob `80067ef46465070b2fc3f9bb2db17a69f7da09fc`
- `tests/release-origin-declarations.test.mjs`: Git blob `e119dad47d8fa43a1e4d547f12c59ea5446f3835`
- `tests/public-route-release-contract.test.mjs`: Git blob `04b3b9e24911457417b9fc0dfa8e885c087c1cc6`
- `docs/WEB_RELEASE_DEPLOYMENT.md`: Git blob `031d61d13569c994f0f2c9be8011fca32f77af59`
- Exact PR-head `07a6273d0fdeffe1ba126676dbd15deb40701e7c` CI: https://github.com/Oleksii-debug/scripture-archive/actions/runs/41070132012 **COMPLETED SUCCESS**. Executed 2,226 Node tests PASS; disposable Worker/D1 22 PASS; Python 2 PASS; TypeScript, lint and source build PASS. All named jobs completed; full log read back (job `124111737279`). None of this is a live deployment or physical NVDA test.

## Closure and non-claims

- `remaining_scoped_implementation=0`; `necessary_unmerged_PRS=0` for **this source-only subsection**.
- `parent_SA_EXT_16=OPEN`; `parents_SA_EXT_01_to_20=OPEN`. No full-parent terminal reclassification.
- `SITES_CURRENT_DEPLOYED_SHA=NOT_VERIFIED`, `HTTPS_BROWSER_E2E=NOT_VERIFIED`, `WINDOWS_NVDA=NOT_VERIFIED`, `SMTP=NOT_VERIFIED`, `PRODUCTION_D1_CUTOVER=NOT_EXECUTED`.
- Owner consent and the existing controlled release/backup/migration/rights checks remain binding; the preflight never sends a deployment request.
- Future source work requires a new requirement or a specific demonstrated regression. Refer to central coordination #297, source draft #288 and owner scope #295.
