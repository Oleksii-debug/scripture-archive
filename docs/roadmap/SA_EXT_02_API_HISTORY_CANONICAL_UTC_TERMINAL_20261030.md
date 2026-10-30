# SA-EXT-02 — API_HISTORY_CANONICAL_UTC — scoped terminal

**2026-10-30 — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**, only the owner-scoped API's persisted UTC timestamp integrity. Not the parent SA-EXT-02; all twenty SA-EXT parent sections remain OPEN.

- The real existing endpoint `GET /api/attempts?action=history` previously used loose `Date.parse`: `1` resolved to a made-up date and `2026-02-31` rolled into March. Those corrupted saved values could appear as successful completed/pending history. Browser #716 now applies canonical UTC format.
- The server now uses the **same canonical SQLite UTC seconds** `YYYY-MM-DD HH:mm:ss` and verifies UTC round-trip equality; damaged rows fail with private no-store `503 attempt_history_unavailable`, no user-row mutation, no disclosure of another user, valid restored records recover.
- Code [PR #722](https://github.com/Oleksii-debug/scripture-archive/pull/722) **SQUASH MERGED** `main@2e648177e91d0606cc001f2a79a7ee8a16c3b33a`; route blob `3a2f9400449b02c47cf103c826b628630e7d8df5`, real-route/SQLite tests blob `fc677c6f20a1e83369c762b13524669c166b1b40` (read back from main).
- Exact-code HEAD `63e02f2c5219d9b8780b0b6a1e882f7154a25c70`, [Actions #41059922244](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41059922244) **SUCCESS** for Node, TypeScript, lint, source build, disposable Worker/D1 and Python.
- Superseded older competing PR #721 was closed **unmerged**: it allowed ISO timestamps that the current UI rejects. No parallel date authority was added to main.
- [Coordination issue #297](https://github.com/Oleksii-debug/scripture-archive/issues/297#issuecomment-6523512981).

`remaining_scoped_implementation=0` and `necessary_unmerged_PRs=0` for the **API UTC defect only**. No full SA-EXT-02 or live Sites release acceptance, real browser, physical Windows/NVDA, SMTP or rights verification. No deployment.
