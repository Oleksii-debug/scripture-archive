# R0.4 HTML_NONVOID_SLASH_AND_BOUND_READINESS — TERMINAL

**Status:** CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL. **Not** a claim of R0.4 parent closure, production release or verified accessibility.

**Problem reproduced on accepted upstream:** After concurrently merged source fix #1071, live main `lib/community-smoke.mjs@bb9e1a3c1f7f09df615c46139e31366c1d1112af` could return readiness `true` when the only navigable markers appeared after `<div hidden/>`, `<script/>`, or inside >4096 nested non-void elements. HTML `text/html` treats `<div/>` and `<script/>` as opening non-void/raw tags, not valid self-closing tags.

**Source convergence:** Rather than merge conflicting #1076 atop independently accepted #1071, closed #1076 without merge, preserving the accepted #1071 implementation. Repaired only the true remaining incorrect slash semantics and bounded existing `openTags` stack (4096), preserving direct hidden/inert/aria-hidden/inline-style handling and canonical six GET probes.

**Feature GitHub PR:** [#1080](https://github.com/Oleksii-debug/scripture-archive/pull/1080), **SQUASH MERGED**, feature `main@78cf3572a47dfdc5bc9cf8099c87ffb8c0f6bc76`.
**Canonical source blob:** `lib/community-smoke.mjs@ac03448ad5377a045e2fda42517a36d64f9ebc50`.
**Regression blob:** `tests/community-shell-html-nonvoid.test.mjs@3883f2303b9a562c9d717e135c2ac432241ec9be`.
**Isolated RED/GREEN:** 9/9 old false-ready negatives; 9/9 patched rejects; 5/5 validated positive controls. Committed native tests additionally include 4095 nested in-bounds and one recovery; 16 tests in total.
**Hosted exact-head CI:** [#41246380151](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41246380151) **COMPLETED SUCCESS**, SHA `2789117a9f4459318ce74a1d435ade5fabcafdb4`; native Node **3803 PASS/0 FAIL/1 SKIP**, disposable Worker/D1 **35 PASS**, Python **2 PASS**, TypeScript/lint/source-build all SUCCESS.
**Git readback:** source/test Git blobs and merged PR verified on exact feature main; `compare(feature, main)` returned `identical`, behind=0 ahead=0 at closure start.
**Remaining scope implementation:** `0`. **Necessary unmerged source PRs for this specific scope:** `0`.
**Separation:** Existing R0.4 and SA-EXT parents, release #689, installed Cloudflare Sites/Worker version, production D1 and migration ledger, authentic browser/NVDA/Windows, real accounts and backups are **OPEN / NOT_VERIFIED**. No live mutation, deployment, scheduler start, email, payments or account data changed. Reopen only for specific new reproduced defect or approved new requirement.
