# SA-EXT-02 — CHAPTER_FOREIGN_MISSION_ISOLATION — source terminal receipt

## Official scope decision: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Розділ SA-EXT-02 / CHAPTER_FOREIGN_MISSION_ISOLATION — ЗАКРИТО для подальшої розробки тільки цю підфункцію.** Original approved parent **SA-EXT-02 remains OPEN**; do not interpret this as a claim that all twenty expansion sections, Windows, live Cloudflare/Sites or a release have completed.

### Production integration

The already integrated canonical `POST /api/attempts?action=chapter` invalidates only **this route's trusted `OT-AB-01` mission** (its `MISSION_ID` server constant) for the same authenticated actor, book and chapter. Previously, the same SQL update had no mission predicate and could invalidate independently stored active attempts of another mission for that actor and passage. Preserve personal and group study contexts within the canonical mission, existing `status='active'` and expiry checks, atomic chapter reading-receipt consumption and D1 acknowledgement gates. No alternate server, schema, or frontend entry point was added.

### Real defect and verification

- On disposable SQLite, a canonical `OT-AB-01` attempt and foreign `OTHER-MISSION` attempt with identical actor/book/chapter were both invalidated by the old production SQL. With the new `mission_id=?` predicate, only the canonical attempt was invalidated.
- The canonical extracted SQL regression in `tests/attempt-scope-receipts.test.mjs` now tests canonical personal and two group contexts, foreign group/personal attempts, other actor/book/chapter, completed/expired and chapter-read receipt behavior. Existing `tests/attempt-receipt-race.test.mjs` was updated to supply the correct mission identifier to its concurrent-order tests. Existing WAL/DELETE journal recovery checks remain.
- First exact-head workflow #41244458371 **FAILED** the Node suite on a stale race-test fixture. That failure was repaired on the same branch; it is not represented as green.
- Final exact-head `0a07a804ad1785848616e5e1150c6155baad32ff` [GitHub Actions #41244571866](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41244571866): **COMPLETED SUCCESS**. Native Node **3680 pass / 0 fail / 1 skip** (3681 cases); local disposable Worker/D1 **32/32 pass**; Python **2 passed**; TypeScript, lint and production-source build **SUCCESS**.
- [PR #1058](https://github.com/Oleksii-debug/scripture-archive/pull/1058) **SQUASH MERGED** into feature `main@8488c748a5ec9d6fdc89489721466fc7dab093f1`. GitHub PR `merged=true`; exact merge SHA vs immediate `main` compare was `identical`. Post-merge source blob `app/api/attempts/route.ts@1e417e91705cb082098121db11675d8f9c69a572`, SQLite test blob `32a333eaa93cbd13fea0325ce2d0f16e7bb1801f`, race test blob `f487242461073365dd8518aa7528d7d20267a630`.

### Boundaries and handoff

`remaining_scoped_implementation=0`; `necessary_unmerged_scoped_feature_PRs=0`; `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. Do not reassign or rewrite the same implementation without a new, demonstrated defect or changed requirement. **SA-EXT-02 PARENT OPEN** and **release #689 OPEN**. The installed public Site's exact SHA, real production D1 state, migration/backup, browser/keyboard behavior, physical Windows/NVDA, rights and full parent section acceptance are **NOT_VERIFIED**. No deploy, migration, production user data, email, scheduler, new language or unrelated content was changed. Coordination: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297); source plan [#295](https://github.com/Oleksii-debug/scripture-archive/issues/295).
