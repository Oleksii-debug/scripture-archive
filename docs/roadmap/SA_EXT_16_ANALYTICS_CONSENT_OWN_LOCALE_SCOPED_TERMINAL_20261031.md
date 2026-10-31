# SA-EXT-16 / ANALYTICS_CONSENT_OWN_LOCALE — exact source closure

**2026-10-31 — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.**
Parent SA-EXT-16 is still OPEN for its wider security/accessibility/product obligations.

## Defect, source authority and behavior

The real analytics consent dialog in `public/analytics.js` used `document.documentElement.lang in copy`. The JavaScript `in` operator follows `Object.prototype`, so language codes such as `__proto__`, `constructor`, or `toString` selected an inherited object/function and rendered literal `undefined` instead of accessible consent choices. This could undermine informed opt-in and screen reader usability. The canonical source now requires an **own string locale key** (supported `uk`, `ru`, `en`) and uses Ukrainian when unsupported/malformed. Existing consent control, persistence, privacy, no-pre-consent tracking, GA4 script rules and transport logic are unchanged.

- Production file: `public/analytics.js`, Git blob `d34a85bdde386f1b3faa5fcced5f48b06ae8ab75`.
- Source-executing real-browser-module regression: `tests/analytics-consent-locale-own-key.test.mjs`, Git blob `d94debf6a7ca8a19b79506cdd412a2067ddfa314`.
- 15 new Node cases: 12 hostile/typed/unknown `lang` inputs and 3 preserved supported language prompts, asserting actual dialog labels, no undefined, and no pre-consent tracking.
- Feature [PR #901](https://github.com/Oleksii-debug/scripture-archive/pull/901) SQUASH MERGED: `main@a55849fcaac59623b33df9f1f247d6a0bb948cd5`; exact feature head `4f9a87ae3142c12cdce010b1d59d7c4daa8f01fa`.

## Actual exact-head CI (not a simulated PASS)

[GitHub Actions run #41179127156](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41179127156), job 124472724507: **COMPLETED SUCCESS**, 16 completed successful steps. Native Node **2894 PASS / 0 FAIL / 1 SKIP**; disposable Worker/D1 **22 PASS**, Python existing validator adapter **2 PASS**; TypeScript, lint and source build successful. Exact source and test blobs read back from merged main. GitHub Actions does not prove live deployed browser/physical NVDA.

`remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0` only for this exact defect. No Sites release/deployment, SMTP, Windows or physical NVDA acceptance done. All other approved SA-EXT-16 scope remains OPEN. Reopen only on a specific reproduced regression or new approved requirement.
