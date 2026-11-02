# SA-EXT-01 — visible comparison edition identity: scoped terminal evidence (2026-11-02)

## Exact scope and acceptance
Only the canonical parallel reader's imported edition ID and visible option-title admission is closed here. It is **not** parent SA-EXT-01 completion, rights verification, release acceptance or physical accessibility acceptance.

- Existing shared `validEditionRightsText` now bounds ID to 128 code units and option title to 512; blank, leading/trailing/embedded whitespace, bidi/format/filler Unicode identities are rejected.
- The same ID predicate is reused in duplicate-counting, option rendering, verified local-edition lookup and submit admission. Invalid programmatic selection retires the previous verse/citation through the existing accessible status path before assessment/fetch.
- Five new native Node regression groups: uk/ru/en invalid IDs; submit fail-closed before check/getBook; stale-text retirement after identity mutation; misleading titles; positive Unicode and null-prototype records.
- No API/DB/service fork or new dependency; no approved 82-language rollout or production action.

## Verified GitHub evidence
- [PR #1180](https://github.com/Oleksii-debug/scripture-archive/pull/1180) **SQUASH MERGED**: `49b5f822a75e0a8bd548478f47c5c3ad5e8cbfe2`.
- Qualified exact head: `17cd4446ca9f2c4d9b1ce9eaa5277ed797059a14`.
- [Exact-head source-quality Actions #41373880047](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41373880047): **COMPLETED SUCCESS**; 4365 native Node PASS / 1 SKIP / 0 FAIL, TypeScript PASS, lint PASS, build PASS, 37/37 disposable Worker/D1 PASS, 2/2 Python PASS. Counts read from job logs; Python pytest adapter is not an independent suite.
- Read-back after merge: `public/parallel-reader.js` blob `8810d2c14410140ffaff2d34470bbc879bf356ec`; `tests/parallel-reader-visible-identity.test.mjs` blob `fb164c8f5852cf5b8d55d5783e837fe2c64a0d60`.
- No full local native checkout; hosted CI evidence only. Draft #325 left untouched.

## Remaining work and no-go boundaries
`remaining_scoped_implementation=0`; `necessary_unmerged_scoped_PRs=0` **only for this narrow defect**. Parent SA-EXT-01/02/05/06/07 remain OPEN; SA-EXT-03/04 source-terminal. Full UI/API/DB acceptance, independently verified publication rights/editorial content, physical Windows/Chrome/NVDA, live Sites/D1, backup/recovery and release are NOT_VERIFIED. No 82-language expansion, new release, production migrations, payments, synthetic users, bulk mail or dating service initiated.
