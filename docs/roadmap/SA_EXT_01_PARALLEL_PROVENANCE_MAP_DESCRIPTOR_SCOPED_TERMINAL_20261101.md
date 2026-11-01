# SA-EXT-01 — PARALLEL_PROVENANCE_MAP_OWN_DATA — scoped source acceptance

Date: 2026-11-01. **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL for this one defect only.** Parent **SA-EXT-01 OPEN**; SA-EXT-02/05/06/07 OPEN; SA-EXT-03/04 source-terminal.

## Defect and canonical repair

The existing parallel Scripture reader used property reads on catalog `editions` / `translations` dictionaries and their locale/translation entries. An own JavaScript getter could run during publisher-rights admission and supply fabricated or unstable edition metadata. A getter-backed translations dictionary could also silently downgrade to fallback publisher rights. This was not addressed by prior rights-field, verse-record, or edition-ID descriptor repairs.

The minimal change to `public/parallel-reader.js` inspects **own data descriptors** for both rights dictionaries and their selected slots, without invoking getters. A declared accessor-backed translations dictionary or translation entry fails closed; the reader does not borrow fallback rights. The existing chapter guards, language strings, retry control, UI, API, and DB remain canonical. No new service or migration.

## Evidence

- Test-first commit: `ec8f16a1a1620ead61fb0adbb5e1713ca8f199f9`.
- Source candidate exact head: `aef91a2694fed4896a3c17c183888e4e2306f89a`.
- Functional [PR #1161](https://github.com/Oleksii-debug/scripture-archive/pull/1161): **SQUASH MERGED**, `main@dd7b6c8246f48793cce6c6e298eb124017d8b030`.
- [Exact-head GitHub Actions #41338544895](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41338544895): **COMPLETED SUCCESS**. Native Node **4293 PASS / 0 FAIL**; TypeScript PASS, lint PASS (13 pre-existing warnings, 0 errors), source build PASS, disposable Worker/D1 **37/37 PASS**, Python **2/2 PASS**.
- Existing source-executing Node regression file `tests/parallel-reader.test.mjs`: 12 getter-backed negative cases across uk/ru/en, zero getter execution, no unverified verse disclosure, both chapter guards, usable retry; two positive own-data/null-prototype cases.
- Independent isolated predicate reproduction: old catalog map accessor executed four times; replacement rejected without invoking it. This is **not** a native full-checkout test; hosted CI above supplies native evidence.

## Remaining and nonclaims

`remaining_scoped_implementation=0`; `necessary_unmerged_scoped_PRs=0` **only for PARALLEL_PROVENANCE_MAP_OWN_DATA**. Full SA-EXT-01 still requires independent publisher rights/editorial acceptance, full reader/search/navigation/comparison/keyboard/NVDA acceptance and end-to-end deployment verification. Physical Windows/Chrome/NVDA, production Sites/D1, backup/restore, live email, editorial rights and release are **NOT_VERIFIED**. Do not mark the parent TERMINAL based on this receipt.

No release publication, production migration, 82-language expansion, payments, synthetic users, mass mail, dating service or secret exposure was performed.
