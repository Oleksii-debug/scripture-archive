# SA-EXT-04 — GROUP_CREATE_EDITION_TYPED_INPUT — scoped terminal receipt, 2026-10-30

**РОЗДІЛ ЗАКРИТО тільки для точно окресленого дефекту створення групи.**
Status: `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0`.
**The full parent SA-EXT-04 and all SA-EXT-01…20 remain OPEN.** This receipt does not establish a complete product, hosted release, physical NVDA or full group journeys.

## Reproduced canonical defect
The existing `POST /api/groups?action=create` originally applied `clean(body.bibleEdition,40) || "uk-ohiienko"`. An explicit `true`, `false`, `42`, array or object in the requested `bibleEdition` became an unrequested Ukrainian edition while the API could return HTTP 201 and persist that different source selection.

## Integrated final source
- [Feature PR #646](https://github.com/Oleksii-debug/scripture-archive/pull/646) SQUASH MERGED at exactly `main@b163f5e637d71b0908ca05459127c982e37016da`.
- Existing canonical `app/api/groups/route.ts` (merged blob `d99dd08ddf02d037e9d1b53aa900cba8e1baac35`) rejects any explicit non-string `bibleEdition` with `400 invalid_edition` before group/member/cohort D1 mutation. Omitted/null/blank selection preserves the approved Ukrainian default, and trimmed valid English/other edition selections remain unchanged. It reuses one backend and established edition allowlist, roles, privacy and marathon persistence.
- Existing regression file `tests/groups-numeric-input-boundary.test.mjs` (merged blob `28ff59fc81c67311d7ea93ce6119bb0bc3c454fc`) contains **9** exact-route SQLite test scenarios: 5 malformed type negatives with no writes, 4 legitimate default/trimmed positives with persisted selected edition.

## Exact-head executable evidence, with honest limits
- [GitHub Actions #41044060725](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41044060725), PR head `874805f0117a538ea30510e5da98e9fe25a71b8b`: native Node **1559 PASS / 0 FAIL / 1 SKIP**; TypeScript, lint, build and Python validator steps **PASS**.
- **Overall CI FAILURE** on the *separate* known disposable Wrangler Worker/D1 flake: 21/22 HTTP checks, `POST /api/material-review` HTTP503 with `Your worker restarted mid-request`. See [#618](https://github.com/Oleksii-debug/scripture-archive/issues/618). No full HTTP E2E PASS claimed for this candidate; no deployment, real browser or physical NVDA verification.
- Independent post-merge GitHub `main` readback of both changed blobs and PR `merged=true` succeeded.

## Remaining scope
No missing implementation for *this typed edition integrity defect*. Leave all approved parent sections and unrelated release issues OPEN. Do not repeat this fix without a new defect or approved requirement. Continue the real group journeys, consent, full site browser/NVDA and installed Sites SHA through central [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).
