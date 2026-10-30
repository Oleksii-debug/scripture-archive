# SA-EXT-02 / PRIVATE_ATTEMPT_HISTORY_DUPLICATE_ID_FAILCLOSED — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Date:** 2026-10-30. **Scope:** one verified source-integrity failure of the existing private attempt-history/review UI. The full SA-EXT-02 programme remains OPEN.

## Reproduced causal defect

`public/workspace.js` accepted otherwise well-shaped historical attempt arrays with a duplicate persisted attempt identifier. `missionHistoryMarkup` could list the same completed attempt twice; `reviewSuggestions` independently counted both as separate repetitions, increasing the suggested interval as if the student had made two independent attempts. The same attempt ID was also not rejected when present in both completed and pending arrays. These are reproducible malformed private API fixture cases, not proof that production Cloudflare D1 contains duplicates.

## Canonical repair and integration

- [Source PR #795](https://github.com/Oleksii-debug/scripture-archive/pull/795) **SQUASH MERGED** into exact `main@588f2da45f46691026edd532d6c251a434f0c370`.
- Existing canonical `public/workspace.js@571884cc723da28d695c3f8125e4d967029bacbe` now rejects duplicate IDs across the returned completed and pending sets before rendering progress, preserves the existing accessible unavailable/retry state and refuses unsafe links; `reviewSuggestions` separately quarantines duplicate IDs and both passages when a reused ID conflicts across sources.
- Existing `tests/review-suggestions.test.mjs@3533d3b2c1151c8d53851e34b3650c35fc060dc8` now covers duplicate completed rows, completed/pending collision, cross-passage same-ID reuse, malformed order reversal, negative UI links across UK/RU/EN and positive genuinely distinct attempts yielding the correct 1/3/7-day schedule.
- Existing APIs/D1 schema, missions, ownership/identity, source corpus and user data unchanged. No second learning-history engine.

## Evidence and scope gate

Exact PR-head [GitHub Actions #41077317717](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41077317717) at `a3f051fe9b0c14a5716c07642af729fbdb2b444a`: **COMPLETED SUCCESS**, all steps: native Node regression suite, TypeScript contracts, lint, non-deploy source build, disposable Worker/D1 end-to-end and existing Python validators. Merged main ref, two blob SHAs and PR `merged=true` independently read back.

**SA-EXT-02 / PRIVATE_ATTEMPT_HISTORY_DUPLICATE_ID_FAILCLOSED — РОЗРОБКУ ПІДПУНКТУ ЗАКРИТО / CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.**

`remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0` **for this exact defect only**; no repeat development without new concrete evidence or revised approved requirements.

**Still OPEN/NOT_VERIFIED:** complete parent SA-EXT-02 (larger mission catalogue, learning memory, levels, live progression acceptance), other parent sections SA-EXT-01 and SA-EXT-03…20, physically tested keyboard/Windows/NVDA, Sites deployed SHA, live D1/privacy cutover, SMTP, rights-review and full release. No production deploy or private data mutation performed. Central coordination [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).
