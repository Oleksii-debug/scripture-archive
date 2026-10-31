# SA-EXT-01 / ABOUT_VISIBLE_RIGHTS — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

Date 2026-10-31. This is the *visible edition-information page only*; parent SA-EXT-01 remains OPEN.

**Actual defect:** `editionAboutMarkup` escaped HTML and validated source/licence URLs but rendered arbitrary licence/title/attribution/formatting text without the shared Unicode-visibility guard. In a malformed imported catalog, hidden soft hyphens and script fillers could disguise the displayed rights claim even after the reader itself rejected the same bytes.

**Integrated implementation:** `public/parallel-reader.js` exports its **existing** validated Unicode text rule for reuse; `public/workspace.js` uses that single rule on the real About edition screen in uk/ru/en. An unsafe title makes its edition listing unavailable; unsafe rights/notes are suppressed with safe publisher and licence URLs still accessible. Valid Cyrillic, visible Braille, HTML-escaped text and multiline licences remain. No new source authority, route or catalog.

**Native test:** `tests/edition-about.test.mjs` iterates nine hidden-control cases over four fields in three locales and verifies positive visible Cyrillic, Braille, multiline rights and previous credentialed-URL tests. The first exact PR-head run found a real legacy missing-license placeholder assertion, which was fixed on the same PR before merging (not concealed).

**Verifiable evidence:**
- Feature PR: https://github.com/Oleksii-debug/scripture-archive/pull/954 — squash MERGED.
- Merged main: `a5e283300b1a972f08ac4bce104ef128a18115b7`, confirmed via GitHub ref and PR receipt.
- Source blob: `public/parallel-reader.js@2c5a59860eaeb4b584db975a6e6fa241386c5206`.
- UI blob: `public/workspace.js@aecb30c00e078565f9fe14b301f483b7093435ec`.
- Test blob: `tests/edition-about.test.mjs@a680965ed29f9136a63bb0f33ad236cf76c4e7ab`.
- Final exact PR-head `51715b01e8b547134787b20e36b6e9044aeb52cc`.
- Successful GitHub Actions: https://github.com/Oleksii-debug/scripture-archive/actions/runs/41201267889; native Node **3294 PASS / 0 FAIL / 1 SKIP**, disposable HTTP Worker/D1 **24 PASS / 0 FAIL**, Python **2 PASS**, TypeScript/lint/build PASS. First failed run #41201120469 was fixed before this success.

`CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0`. The scope cannot be reopened without a new concrete defect or approved requirement.

**Not verified:** remaining Bible translation publishing rights and approved edition coverage; complete parent SA-EXT-01, actual live Sites SHA, physical NVDA/Windows/browser acceptance, external operations. No deploy, payments, emails or other production state changes.