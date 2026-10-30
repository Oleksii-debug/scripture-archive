# SA-EXT-01 / CANONICAL_ACCOUNT_PROFILE_BOOLEAN_READBACK — scoped source completion

Date: 2026-10-30. **РОЗДІЛ SA-EXT-01 — ЗАКРИТО тільки вузький підпункт `CANONICAL_ACCOUNT_PROFILE_BOOLEAN_READBACK`**; status `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. This does not close parent SA-EXT-01, SA-EXT-16 or any of the 20 full SA-EXT parent sections.

**Confirmed source defect:** the existing authenticated `GET /api/account?action=me` response used JavaScript `Boolean()` on persisted `public_first_name`, `public_last_name`, `public_progress` and `has_children`. Invalid SQLite values `2`, `-1`, text `"0"` and `"1"` were represented as true public choices or a true personal profile field, contrary to the documented exact SQLite integer 0/1 controls.

**Integrated canonical repair:** `app/api/account/route.ts::publicUser()` now reports these flags true only on numeric `1`; `has_children = NULL` preserves the existing unknown/null state. No new route, schema, data migration, new account, new store or production mutation. Source-executing regression in `tests/account-get-action-failclosed.test.mjs` covers eight malformed/valid D1 value classes across four fields with private no-store response and exact single-principal readback.

- Functional [PR #765](https://github.com/Oleksii-debug/scripture-archive/pull/765) **squash merged** at `main@b5b0e29fee1a9f8619f0847739ae8939df19fd93`.
- Canonical production source blob `3d5dba3450df59e4c24257a8490caedcfa64def5`; regression test blob `28a50fab4d1ca06d4f1ecc80a17529a219e9c9ae`, both confirmed in integrated main.
- PR exact-head [GitHub Actions #41067492991](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41067492991), head `52612772ea485e3ce801af1f6aea3cb338910adc`: **COMPLETED SUCCESS**, native Node **2190 pass / 0 fail / 1 skipped**, disposable Worker/D1 **22/22 pass**, Python **2/2 pass**, TS/lint/source build PASS. The logged job really executed.
- `remaining_scoped_implementation=0` and `necessary_unmerged_prs=0` for this exact integrated source defect.

**All 20 SA-EXT parents remain OPEN**. Production Sites current SHA, actual D1 backup/migration/write-freeze, browser E2E, Windows/NVDA, SMTP, content rights and full product release are not verified. No publication was performed; follow ongoing owner plan [#295](https://github.com/Oleksii-debug/scripture-archive/issues/295), coordination [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297) and production privacy release hold [#689](https://github.com/Oleksii-debug/scripture-archive/issues/689). Do not reimplement this exact scoped fix without a new reproduced defect.
