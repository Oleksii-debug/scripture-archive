# SA-EXT-01/16 / HOME_SUPPORT_OWN_LOCALE — scoped source closure

**Date:** 2026-10-31  
**Status:** CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL  
**Full parents:** SA-EXT-01 OPEN; SA-EXT-16 OPEN. No wider-source or final product terminal claim.

## Reproduced defect and actual canonical fix

Existing `public/home.js::homePage` selected `C[lang] || C.uk`, so language `__proto__` resolved inherited Object.prototype and the real homepage threw while interpolating `c.title.replaceAll`. The existing donation/consent-to-support surface `public/support.js::supportSection` selected `COPY[lang] || COPY.uk` and could display undefined accessible labels or broken section title for inherited locale names.

Both existing canonical modules now require a supported *own string* locale key and otherwise fall back to full Ukrainian text. Original Ukrainian, Russian, and English strings, user profile link, donation URL safety, and heading semantics remain unchanged. No independent component, new localization scope, financial transaction, user-data mutation, email or production deployment.

- Source: `public/home.js`, exact integrated blob `78234e92e9da5a7c4e6d021ecf8d684b5a1fd3b5`.
- Source: `public/support.js`, exact integrated blob `0ffe4d78fb6e3e9b0f16072a1a85078ca4155775`.
- Real-native Node regression: `tests/home-support-locale-own-key.test.mjs`, blob `a33950ed2e27cecd90bcdae2f8ec37d739ea4602` (17 scenarios: 13 invalid locale inputs, 3 supported locale cases, one authenticated-home donation link check).

## Executed verification and merge

- [PR #899](https://github.com/Oleksii-debug/scripture-archive/pull/899) **SQUASH MERGED** `main@54759a89d79f5b8f2f216c50309810a7643e39fe`.
- Exact tested feature head `37f7d9de39d63ae14746a0cf433a568569171954`.
- [GitHub Actions run #41178889927](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41178889927), job 124472027140: **COMPLETED SUCCESS**, 16 executed successful workflow steps. Native Node **2879 PASS / 0 FAIL / 1 SKIP**; disposable Worker/D1 **22 PASS / 0 FAIL**; Python pytest adapter **2 PASS**; TypeScript, lint, source build PASS.
- Exact merged main head and all three Git source/test blobs read back after integration.

## Release and closure

`remaining_scoped_implementation=0`; `necessary_unmerged_feature_PRs=0` for **this exact defect only**. Parent SA-EXT-01 still requires licensed edition/provenance and corpus qualification; parent SA-EXT-16 has separate outstanding obligations. Actual Sites deployed SHA, production Chrome/Windows/NVDA, SMTP, and end-to-end live acceptance are NOT_VERIFIED. No release has been updated. Reopen only for new approved requirement or a specific reproduced regression.
