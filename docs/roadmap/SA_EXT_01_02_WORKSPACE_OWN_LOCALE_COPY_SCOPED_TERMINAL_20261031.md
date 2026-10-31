# SA-EXT-01/02 / WORKSPACE_OWN_LOCALE_COPY — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Date:** 2026-10-31. **Status:** This *single source-scope defect only* is `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. **Both full SA-EXT-01 and SA-EXT-02 remain OPEN.** SA-EXT-03 and SA-EXT-04 parent sections retain their already accepted terminal statuses.

## Product behavior and fix

The existing canonical `public/workspace.js` used `COPY[lang] || COPY.uk` and seven other dictionary lookups with inherited Object.prototype property names. Malformed user-controlled locale values such as `__proto__`, `constructor`, `toString`, `hasOwnProperty`, `valueOf`, `isPrototypeOf` could select a truthy prototype value instead of a valid translations record, yielding missing/undefined user-visible headings, accessible group controls, learning/mission history text, spaced review text, or Bible edition provenance details.

A **single local helper** now resolves only own property keys for supported string locales, retaining the authorized Ukrainian fallback and unchanged `uk/ru/en` copy. It is used within the real `workspaceCopy`, `groupManagementCopy`, `missionHistoryMarkup`, `reviewScheduleMarkup` and `editionAboutMarkup`; no parallel UI, Bible content, or database authority.

## Native evidence and exact integration

- **Canonical functional [PR #891](https://github.com/Oleksii-debug/scripture-archive/pull/891) SQUASH MERGED**, exact main `0309db1bbcb6226d359cfb6f85e0467c01c4e142`. After merge, fetched real source blob `public/workspace.js@38ea87453762533065046b424f0541c3968860a0` and real regression `tests/workspace-locale-own-key.test.mjs@3dbcad82a0b333e1b21c3614ae4b7f72a9140695` from main; source has one shared own-key helper reused by 8 dictionary sites.
- **[Exact feature-head GitHub Actions #41178305059](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41178305059) COMPLETED SUCCESS**. Job `124470328630`: native Node **2,831 PASS / 0 FAIL / 1 SKIP**, disposable Worker/D1 **22 PASS / 0 FAIL**, TypeScript contracts, lint, build, existing Python validators all passed. CI ran before merge, not a postmerge delivery result.
- A concurrent integration PR [#892](https://github.com/Oleksii-debug/scripture-archive/pull/892) independently proved the same defect, passed its own exact-head CI (2,834 Node PASS; Worker/D1 22 PASS), but was explicitly **closed unmerged as superseded** after reading #891 merged in main, avoiding duplicate or conflicting source authority.
- Real `uk/ru/en` user-facing strings and Hebrew/Greek/Bible source rights and database operations were not changed.

**remaining_scoped_implementation=0; necessary_unmerged_feature_PRs=0; CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.** Only reopen for a newly reproduced defect or explicit new requirement.

## Not a parent closure or release

SA-EXT-01 still needs approved/licensed edition coverage and translation provenance. SA-EXT-02 still needs full authored missions, repetition and educational validation. Nothing here implies 82-language rollout, an installed Cloudflare Sites SHA, live D1 migration, Chrome/Windows end-to-end, physical NVDA, SMTP or a published release; no deployment was performed.
