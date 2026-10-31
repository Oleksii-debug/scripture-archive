# SA-EXT-02 — EXACT_BOOK_IDENTITY_ON_CHAPTER_READ_START — scoped terminal (2026-10-31)

**ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ ТІЛЬКИ ЦЕЙ ПІДПУНКТ / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.**

## Approved bounded functionality and canonical integration

The existing authenticated / guest `POST /api/attempts` actions `chapter`, `read` and `start` validate the *entire* supplied Bible-book identifier before changing the assessment/reading state. The former `clean(body.book, 8).toUpperCase()` silently truncated an overlength or wrong-type JSON value, potentially matching real `GEN` after truncation. The code now uses one source-owned `requestedBook` validator: typed string only, 2–8 ASCII letters/digits, no boundary whitespace, controls, Unicode lookalikes or punctuation, case-insensitive canonical uppercase output; malformed inputs return `invalid_book` HTTP 400 before D1 mutation. Valid original `GEN` and lower/mixed-case compatibility remain supported.

No extra backend, extra database, new source of Bible content, parallel UI, authorization change or new schema. The existing reader, mission and group consumers continue to invoke the canonical API.

- **Implementation:** [PR #856](https://github.com/Oleksii-debug/scripture-archive/pull/856) **SQUASH MERGED** into exact `main@2718f85ffadc70437785a8833e1c49491950c90b`.
- **Canonical source readback:** `app/api/attempts/route.ts` blob `96d33d4666cc90046e2630c1a2cdac8413d8fa8b`.
- **Actual-source behavioral regression:** `tests/attempt-group-context-typed.test.mjs` blob `0f91e057bfca773fa2358593be8b1fc262aef012`; 19 negative book identities × 3 real handlers plus 9 accepted canonical/case-insensitive controls. Guards assert HTTP status, no-store, no SQL read or mutation for invalid book codes and correct SQL bind for valid ones.
- **Exact-head CI:** [GitHub Actions #41170422587](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41170422587) **COMPLETED SUCCESS** for source head `c8e852c2f57002d9ee09e7552705ce0543b3e8dd`: native Node tests, TypeScript, lint, production-source build, disposable Worker/D1, Python validators all PASS.
- **Post-merge proof:** PR reports `merged=true`, `main` returned exact `2718f85...` at readback, both expected source blobs retrieved and confirmed.

`remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0` **only for `EXACT_BOOK_IDENTITY_ON_CHAPTER_READ_START`**. Do not duplicate work absent a newly reproduced defect or owner-approved scope revision.

**SA-EXT-02 PARENT REMAINS OPEN:** a complete independent editorial/rights reviewed catalogue of missions, repetition tracks, reliable individualized pedagogic progression and human accessibility acceptance are not demonstrated by this narrow repair. Live Sites SHA, production D1/SMTP, browser and physical Windows/NVDA NOT_VERIFIED. No deployment or release was performed.
