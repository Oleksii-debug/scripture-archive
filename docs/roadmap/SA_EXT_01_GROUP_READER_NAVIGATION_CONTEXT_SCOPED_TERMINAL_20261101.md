# SA-EXT-01 — GROUP_READER_NAVIGATION_CONTEXT — scoped terminal receipt (2026-11-01)

**Scope only:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` for preserving group identity in the canonical Bible reader's in-page navigation. **SA-EXT-01 parent remains OPEN**; SA-EXT-02/05/06/07 OPEN; SA-EXT-03/04 source-terminal. This is not release or production acceptance.

## Reproduced defect and repair

On exact baseline `main@ff675ea9bff90ab43deb4e9e691d98e5055be2ea`, executing the real reader HTML template for `/reader/GEN/3/group/g_123` generated personal links `/reader/GEN/3?verse=1`, `?verse=2`, `/reader/GEN/2`, `/reader/GEN/4`. Group context could therefore be silently dropped when a group reader navigated, and a later read/quiz could be misattributed as personal. This is source-level behavior, **not evidence of a live incident**.

[Functional PR #1114](https://github.com/Oleksii-debug/scripture-archive/pull/1114) **SQUASH MERGED** into exact `main@61dca5ec11436d532180a7f1ef59ebbf33a639a9`. Reused the existing `public/app.js` and server-owned group membership checks. The new `readerChapterUrl` helper and optional `groupId` for `readerVerseUrl` preserve group context for previous/next chapters, book/chapter/verse keyboard selectors, verse anchors and in-book search results. Group ID is URI-encoded as one path segment; personal links retain their original URLs. **Copied verse citations deliberately remain public links without private group IDs**, preventing clipboard disclosure. No parallel service, API, DB migration or second route authority.

Readback on integrated main:
- `public/app.js` blob `7b6df1ee1127abf135020c0750489b7c5746881c`.
- `tests/reader-group-navigation-context.test.mjs` blob `d4a585fd5f527feb56b53cefdc65eb354e785aea`.
- Updated `tests/reader-deeplink.test.mjs` blob `bdc05da63544dc864171d628080872bfa0154bf1`.

## Test evidence

- [Exact-head native GitHub Actions #41274563834](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41274563834): **COMPLETED SUCCESS**, `head=c690b414d9f386709e58eb5193575d3f7616ef5e`; **4071 Node PASS / 1 SKIP / 0 FAIL**, TypeScript PASS, lint PASS, build PASS, **37/37 disposable Worker/D1 PASS**, **2/2 Python PASS**.
- Earlier [CI #41274462832](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41274462832) **FAILED** (9 old deep-link regression harness assumptions about the old helper signature/group-less context); the existing test harness was repaired without weakening personal-reader assertions, then the full exact-head CI succeeded.
- Isolated source-executed V8 before/after verified four actual group HTML links; candidate links retain `/group/g_123`. This is not a browser, Windows or physical NVDA acceptance.
- Post-merge `main` and all three file blobs were read back. [Coordination #297](https://github.com/Oleksii-debug/scripture-archive/issues/297).

## Remaining work and constraints

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **only for this group-reader navigation fix**. Full SA-EXT-01 requires edition rights and editorial acceptance, wider approved reader corpus, real keyboard/Chrome/Windows/physical NVDA acceptance, installed Sites/D1/backup evidence, and release signoff. SA-EXT-02/05/06/07 parents remain OPEN; 03/04 source-terminal. No production deployment, migrations, release publication, 82-language activation, payments, synthetic users, mass mailing or dating.
