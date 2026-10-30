# First five SA-EXT parent sections — 40 exact-source evidence readbacks (2026-10-30)

**Repository:** `Oleksii-debug/scripture-archive`. **Immutable audit baseline:** `main@a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7` (2026-10-30). `40/40` requested files successfully fetched from this exact ref and basic expected symbol/fixture markers were found. The following blob hashes are literal Git source identifiers, not estimates.

**Method and limits:** one independent source or test/migration file check per row, with exact `fetch_file` Git blob SHA and basic code/test signature checks. Source existence is **not** a full feature-completeness, test-execution, production, licence-rights, NVDA or release acceptance certificate. Relevant functional PRs #788/#790/#792 had separate exact-head **successful full CI**; the later SA-EXT-02 repair #795 was merged at `588f2da45f46691026edd532d6c251a434f0c370` after this frozen baseline. Its new `public/workspace.js` and `tests/review-suggestions.test.mjs` blobs have their own permanent receipt, not substituted for the frozen checks 15–16.

## 01 — Reader, translations, citations, bookmarks, export (10 readbacks)

1. [`public/app.js`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/public/app.js) — blob `14ff01bbc398484c63ab0b5383cf9477afc5835f`; source/test marker present.
2. [`public/editions.js`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/public/editions.js) — blob `12d1745955d3b43aea8bc05f077726d5bba8b8c9`; source/test marker present.
3. [`public/parallel-reader.js`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/public/parallel-reader.js) — blob `50badc7992ffb996c744f5da8fdbb55e60c86b6f`; source/test marker present.
4. [`public/data/catalog.json`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/public/data/catalog.json) — blob `ad471ce574861f7c66e2a913886c2bcb22f2afc3`; source/test marker present.
5. [`tests/parallel-reader.test.mjs`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/tests/parallel-reader.test.mjs) — blob `be6d3658287b39101e61b48e5387546797092b26`; source/test marker present.
6. [`tests/reader-primary-provenance.test.mjs`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/tests/reader-primary-provenance.test.mjs) — blob `3241fff8002c12dc3add325b71bee6f9d85b7ba3`; source/test marker present.
7. [`tests/edition-about.test.mjs`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/tests/edition-about.test.mjs) — blob `25c1def2f5e5152fa9438259fc87dc5875e9f62a`; source/test marker present.
8. [`app/api/bookmarks/route.ts`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/app/api/bookmarks/route.ts) — blob `f21d11ee1a9c60e3466eb30f0b85c04f80cbdc0a`; source/test marker present.
9. [`tests/bookmark-recovery-route.test.mjs`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/tests/bookmark-recovery-route.test.mjs) — blob `f931da0e20c9644e728b39631b071d5af53e4ce3`; source/test marker present.
10. [`app/api/reading-export/route.ts`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/app/api/reading-export/route.ts) — blob `0fb09c93047de8508f9ea8851e6f089d91729e2f`; source/test marker present.

## 02 — Mission attempts, recovery, personal review suggestions (8 readbacks)

11. [`app/api/attempts/route.ts`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/app/api/attempts/route.ts) — blob `9560f683902086c3f310a902bf9cb704fb9b84a7`; source/test marker present.
12. [`tests/attempt-recovery-history.test.mjs`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/tests/attempt-recovery-history.test.mjs) — blob `fc677c6f20a1e83369c762b13524669c166b1b40`; source/test marker present.
13. [`tests/attempt-expiry-failclosed.test.mjs`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/tests/attempt-expiry-failclosed.test.mjs) — blob `f632db1777619ed7bc18d497c160483132967200`; source/test marker present.
14. [`tests/attempt-scope-receipts.test.mjs`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/tests/attempt-scope-receipts.test.mjs) — blob `140a3d056bab0367dba0c6b29839744a3bbdfff1`; source/test marker present.
15. [`public/workspace.js`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/public/workspace.js) — blob `772ae1dac4d11d8614b37ed6d5942193f28e54de`; source/test marker present.
16. [`tests/review-suggestions.test.mjs`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/tests/review-suggestions.test.mjs) — blob `a4e2dabc4ce103ce74c4cb1b8009ae7c7f2dd60b`; source/test marker present.
17. [`tests/attempt-status-failclosed.test.mjs`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/tests/attempt-status-failclosed.test.mjs) — blob `d9d96594e1f74f6c5ceeca116c2218314f70d155`; source/test marker present.
18. [`tests/reading-history-dedup.test.mjs`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/tests/reading-history-dedup.test.mjs) — blob `4de08a882942146fa1cdc7092f3e4e689c6c36c1`; source/test marker present.

## 03 — Author/editor materials and rights review (8 readbacks)

19. [`app/api/materials/route.ts`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/app/api/materials/route.ts) — blob `3c4e3a76f582898915e090a010c8cbee1426aa83`; source/test marker present.
20. [`app/api/material-review/route.ts`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/app/api/material-review/route.ts) — blob `dbf9c9f2c36a4700604644bc039669d9cbee4d02`; source/test marker present.
21. [`app/api/content/route.ts`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/app/api/content/route.ts) — blob `ecae548f58908b5e0089aeb6f405dee08398632a`; source/test marker present.
22. [`app/api/editor-roles/route.ts`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/app/api/editor-roles/route.ts) — blob `6ce12d8ab2865c5f4a8ccb4dbc3e143884b5672c`; source/test marker present.
23. [`public/material-review.js`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/public/material-review.js) — blob `a5da2871509bc26e889e0a67a1c76ad92bf5f851`; source/test marker present.
24. [`tests/material-review.test.mjs`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/tests/material-review.test.mjs) — blob `94a2c1565bc35ef939322e7735930b69b220a161`; source/test marker present.
25. [`tests/editor-role-audit.test.mjs`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/tests/editor-role-audit.test.mjs) — blob `0689efa05c0c78d0a60bb3dab0a66f5460cef4b8`; source/test marker present.
26. [`tests/materials-auth-availability.test.mjs`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/tests/materials-auth-availability.test.mjs) — blob `6ee0e7505ff8ab481029d5c9b5fddf568b2f36bd`; source/test marker present.

## 04 — Home-group membership, consent, storage and aggregates (7 readbacks)

27. [`app/api/groups/route.ts`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/app/api/groups/route.ts) — blob `5f05c98caf062f078fb5f0333b555da2edde3995`; source/test marker present.
28. [`tests/group-membership.test.mjs`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/tests/group-membership.test.mjs) — blob `03180e02911d0011c3a92c4b4cc2b5ce495d86ab`; source/test marker present.
29. [`tests/group-reflection-privacy.test.mjs`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/tests/group-reflection-privacy.test.mjs) — blob `bfe7f26f61e875cddb8660c0625c315b3b04b423`; source/test marker present.
30. [`tests/groups-public-aggregate-integrity.test.mjs`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/tests/groups-public-aggregate-integrity.test.mjs) — blob `9452c401b8cb92a3701a2387c23422d695cd906d`; source/test marker present.
31. [`drizzle/0001_home_groups.sql`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/drizzle/0001_home_groups.sql) — blob `e176eb42d523e2bc00c8c9c39f1deec5cc2fd6df`; source/test marker present.
32. [`drizzle/0003_group_answers.sql`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/drizzle/0003_group_answers.sql) — blob `7dd9404695f221b36a579a127e7c1f31f3f30097`; source/test marker present.
33. [`tests/group-control-session-fence.test.mjs`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/tests/group-control-session-fence.test.mjs) — blob `2e6619f82cee5cca92e1e4d89ad5ac1e423bbdc5`; source/test marker present.

## 05 — Biblical dossier graph, source search and atlas witnesses (6 readbacks)

34. [`public/scripture-dossiers.js`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/public/scripture-dossiers.js) — blob `960e6c9ac24c3fb620173975b8761728fb4b3630`; source/test marker present.
35. [`tests/source-dossier-graph.test.mjs`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/tests/source-dossier-graph.test.mjs) — blob `ae55a3b139306ac755024f3481b7b2c60fbb8c29`; source/test marker present.
36. [`tests/dossier-search.test.mjs`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/tests/dossier-search.test.mjs) — blob `40afbca19e9e5c60b82e1e4a0934490739458c7b`; source/test marker present.
37. [`tests/source-dossier-corpus-bounds.test.mjs`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/tests/source-dossier-corpus-bounds.test.mjs) — blob `741320befb3312e7306be6514c8305f25d677144`; source/test marker present.
38. [`tests/source-dossier-atlas.test.mjs`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/tests/source-dossier-atlas.test.mjs) — blob `2e6237b1616c757df31c71b5fd30f64edb54619d`; source/test marker present.
39. [`tests/atlas-history-sources.test.mjs`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/tests/atlas-history-sources.test.mjs) — blob `92fb33bc8dbf631993df1528bd265008db1a473a`; source/test marker present.

## 01-05 — Canonical approved twenty-section scope (1 readbacks)

40. [`docs/roadmap/SCRIPTURE_ARCHIVE_EXPANSION_SECTION_PLAN_2026-10-28.md`](https://github.com/Oleksii-debug/scripture-archive/blob/a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7/docs/roadmap/SCRIPTURE_ARCHIVE_EXPANSION_SECTION_PLAN_2026-10-28.md) — blob `fbd7d34cafecd49edfd867f9baf2d9eea23bde23`; source/test marker present.

## Outstanding full-parent acceptance gates

- **SA-EXT-01 / OPEN:** all required licensed translations and actual rights/source review; complete reader/bookmark UX and real Windows Chrome/NVDA/production behavior. The three exact URL-provenance defects are *scoped terminal*, not parent DONE.
- **SA-EXT-02 / OPEN:** approved broader missions, learning memory and level system; real progress/assessment acceptance. Existing recovery/periodic-review components and #795 duplicated-ID fail-closed are only partial source coverage.
- **SA-EXT-03 / OPEN:** editor/author permission, human editorial source/rights approvals, version review/withdrawal and full platform acceptance still need end-to-end owner/editor qualification; repository files alone are not acceptance.
- **SA-EXT-04 / OPEN:** at least two genuine user roles/groups, privacy, group handoff, live D1 migration and relapse/relogin acceptance must be independently demonstrated. Do not rewrite the existing group controller.
- **SA-EXT-05 / OPEN:** wider person/place/event corpus, traceable historical sources, interpretation disambiguation, licence obligations and full reader/browser accessibility are not established by the existing seven-dossier source checks.

**R0 dependencies shared across parent sections:** exact deployed `scripture-archive.com` Sites SHA, Cloudflare production D1 consent/privacy migration, owner-approved release, real email and account/keyboard/NVDA validation remain OPEN/NOT_VERIFIED. This audit made **no** production calls, Cloudflare writes, DNS change, content licensing or user data access.

**Closure policy:** do not mark any parent `CLOSED_FOR_DEVELOPMENT` based on these 40 existence checks. Reuse verified source work, repair only demonstrated gaps, integrate via real GitHub main and exact-head CI. Add individual scoped terminal receipts and update [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297); no duplicate board. [Canonical owner scope](https://github.com/Oleksii-debug/scripture-archive/issues/295).
