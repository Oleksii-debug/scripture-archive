# Scripture Archive — 2026-10-31 — two merged locale-accessibility scoped terminals

## Exact source and CI authorities

**Scope A — SA-EXT-01/02 / WORKSPACE_OWN_LOCALE_COPY: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.**

- Real canonical work area `public/workspace.js`: workspace, group management, saved attempt history, review scheduling, edition provenance captions now use one own-string-key locale selector. Object.prototype names, unsupported strings and wrong JSON types fall back to Ukrainian without `undefined` headings or mislocalized screen-reader labels; Ukrainian/Russian/English remain unchanged.
- Feature+regression PR [#891](https://github.com/Oleksii-debug/scripture-archive/pull/891) **SQUASH MERGED** into exact `main@0309db1bbcb6226d359cfb6f85e0467c01c4e142`, verified in the actual default-branch `public/workspace.js` and `tests/workspace-locale-own-key.test.mjs`.
- Exact-head [Actions #41178305059](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41178305059) **COMPLETED SUCCESS**, 16 job steps with the native Node test suite, TypeScript, lint, production source build, disposable Worker/D1 integration, and existing Python tests. The new real-module test exercises 12 malformed/prototype locale cases plus 3 supported languages.

**Scope B — SA-EXT-04 / MEETING_OWN_LOCALE_COPY: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.**

- Real canonical `public/group-meeting-notes.js` and `public/group-meeting-history.js`: history and editor/control labels no longer resolve `COPY.__proto__`, `COPY.constructor` etc. into inherited non-locale objects. Native markup and live-status copy retain supported three languages and Ukrainian fallback. No separate server/group implementation.
- Feature+regression PR [#894](https://github.com/Oleksii-debug/scripture-archive/pull/894) **SQUASH MERGED** into exact `main@6824ce20d476db1226dd44e8d2bac2ecfe9ee21d`. Main readback confirmed both edited production blob identities and `tests/group-meeting-locale-own-key.test.mjs`.
- Exact-head [Actions #41178417038](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41178417038) **COMPLETED SUCCESS** (16/16 successful job steps: Node, TypeScript, lint, build, disposable Worker/D1, Python). The new source-executing tests cover 12 invalid/prototype locale variants and 3 valid languages.

## Development closure invariants

For each of these **two narrowly identified defects**:
- `remaining_scoped_implementation=0`.
- `necessary_unmerged_feature_PRs=0`.
- `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.
- Repeat work on this exact defect is not required without a new reproduced failure.

**Do not mark the parents as complete.** SA-EXT-01 remains OPEN for translation rights, corpus coverage and edition provenance. SA-EXT-02 remains OPEN for the approved full mission/review corpus. SA-EXT-04 was already separately closed for development and this fix does not reopen its approved feature scope. This receipt is not evidence of live site deployment, licensed-content acceptance, real mail, physical Windows 11/NVDA/Chrome testing, account privacy migration/backup or production D1 acceptance; these are `NOT_VERIFIED`.

## Coordination

The source-only predecessor is merged [#890](https://github.com/Oleksii-debug/scripture-archive/pull/890), separately recorded in `SA_EXT_01_PARALLEL_READER_LOCALE_OWN_KEY_SCOPED_TERMINAL_20261031.md`. The concurrently authored equivalent workspace [#892](https://github.com/Oleksii-debug/scripture-archive/pull/892) is superseded by #891, not an extra required implementation. The existing coordinator is [issue #297](https://github.com/Oleksii-debug/scripture-archive/issues/297); do not duplicate the board.

