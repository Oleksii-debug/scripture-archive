# SA-EXT-01 / EDITION_ARRAY_OWN_DATA_SLOTS — scoped source acceptance, 2026-11-02

## Boundary and defect
Only the existing `public/parallel-reader.js` edition-array slot admission. Previously `editions.map` and `editions.find` could execute getter-backed or inherited array indices while building the selector or selecting a local edition, despite prior own-data field hardening in merged #1171. This is a reproduced **source-level integrity issue**, not evidence of a production incident.

## Implementation and exact readback
- Functional [PR #1174](https://github.com/Oleksii-debug/scripture-archive/pull/1174) SQUASH MERGED into `main@c6e590175aeb4d4cce4be3300ef216166a247b91`; qualified PR HEAD `85503082d957a1bfa6b2f527a1c43c48ce518010`.
- `public/parallel-reader.js` blob `54ac6c1b9ebc6ac7b0da1bcdfbdfb6041f9e6300`; new `tests/parallel-reader-edition-array-slots.test.mjs` blob `75767bebe93aa3f6a7a6b9221ab99b09e1e90e2f`.
- Existing canonical comparison UI and chapter guard remain. A single bounded own-data descriptor reader skips accessor and inherited edition slots, preserving ordinary/null-prototype records and retiring stale licensed text after invalid selection. No new server, API, D1, language or parallel implementation.
- Isolated JavaScript reproduction: old `.map` + `.find` invoked the same malicious slot getter twice; descriptor-only enumeration invoked it zero times. This is not native full-checkout RED CI.
- Five new native Node test groups: own getter selector, inherited getter selector, denied fetch, stale citation retirement, positive sparse/null-prototype recovery.

## CI evidence and exclusions
[Exact-head GitHub Actions #41363808105](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41363808105) **COMPLETED SUCCESS** on `85503082d957a1bfa6b2f527a1c43c48ce518010`: native Node **4333 PASS / 1 SKIP / 0 FAIL**; TypeScript, lint and build PASS (13 lint warnings, zero errors); disposable Worker/D1 **37/37 PASS**; canonical Python **2/2 PASS**. CI uses its own complete checkout; this executor did not possess a complete local checkout. Physical Windows/Chrome/NVDA, human rights/editorial review, live production Sites/D1, backup and release **NOT_VERIFIED**.

## Closure scope and remaining work
`remaining_scoped_implementation=0` and `necessary_unmerged_scoped_PRs=0` **only for EDITION_ARRAY_OWN_DATA_SLOTS**. Parent SA-EXT-01, 02, 05, 06 and 07 remain **OPEN**; SA-EXT-03/04 source-terminal. Distinct draft PR #325 untouched. Full source and production acceptance are separate. No release publication, 82-language rollout, production migration, payments, synthetic users, mass mail, dating, or secret disclosure.
