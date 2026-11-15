# SA-EXT-05/06 — BOUNDED_PUBLISHER_BOOK_TITLES (scoped source terminal)

Date: 2026-11-02. This receipt covers **only** the bound on publisher book titles in the existing dossier/atlas catalogue validator. It does **not** close parent SA-EXT-05 or SA-EXT-06.

## Defect and canonical repair

Before the repair, `validateDossierGraph` admitted arbitrarily long, nonblank publisher book titles. The same unbounded title was repeated in visible Scripture source links and their accessible ARIA names in the dossier and text atlas. Escaping prevents markup injection but does not bound rendered or screen-reader output. This is a source-level correctness/accessibility and resource-amplification risk, **not evidence of a production exploit**.

The existing `public/scripture-dossiers.js` graph validator now requires an owned publisher title of at most **120 UTF-16 code units** before scanning it for unsafe Unicode and before either canonical UI renders source links. The ordinary localized titles remain valid (current maximum lengths: uk 47, ru 33, en 52). The existing 66-book catalogues, links, search, evidence classifications and fail-closed `role="alert"` remain unchanged. No second service, new UI/API/DB or new publishing authority was introduced.

## Exact integration evidence

- Functional [PR #1212](https://github.com/Oleksii-debug/scripture-archive/pull/1212): **SQUASH MERGED** into `main@54dc8c8429fb28ac1814a3065c49dcf86a8acde5`; qualified PR head `691a11bc4ffc66412ba84b563e119d3687411cd7`.
- GitHub main readback: `public/scripture-dossiers.js` blob `471604b9cd9327eef2cc830aa5c970bbd039d924`; `tests/dossier-search.test.mjs` blob `0a497f784df8b02f42bdb9f1f88346fa6f9518f8`.
- [Exact-head Actions #41439301249](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41439301249): **COMPLETED SUCCESS**; native Node **4431 PASS / 1 SKIP / 0 FAIL**; disposable Worker/D1 **37 PASS / 0 FAIL**; Python pytest-adapter validators **2 PASS**; TypeScript, lint and build **PASS** (lint: 13 warnings, 0 errors).
- Earlier [Actions #41438978978](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41438978978) **FAILED** because the newly added test contained a malformed regex literal, before the intended test body could run. This test syntax was repaired in `f2b0dd964a0600863e0e8be75cd3081d3f996624`. The intermediate run was superseded/cancelled after the length-first validator repair; **do not claim a completed pre-fix RED test**.
- Negative regression: publisher titles of length 121 and 4096 across uk/ru/en reject the graph; both existing UIs show `role="alert"`, emit no reader source links and do not echo the oversized title. Positive recovery: exact 120-unit title accepted, both existing UIs retain links, and the unchanged canonical catalogue validates.

## Remaining work / release boundary

`remaining_scoped_implementation=0`; `necessary_unmerged_scoped_PRs=0` **only for BOUNDED_PUBLISHER_BOOK_TITLES**.

**Parent SA-EXT-01, 02, 05, 06, 07 remain OPEN. SA-EXT-03/04 are already source-terminal.** Full rights/licensing review, editorial acceptance, physical Windows/Chrome/NVDA, installed Sites SHA, live production D1/backup and release are **NOT_VERIFIED**. This source-only change does not establish those gates. No production deployment/migration, 82-language rollout, payments, synthetic users, bulk mail, dating product or secrets were involved.
