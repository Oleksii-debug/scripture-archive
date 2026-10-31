# SA-EXT-08 — reviewed-library inherited locale keys — scoped terminal receipt

**2026-10-31: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** — ONLY the explicitly reproduced library-page locale/prototype defect, not the complete SA-EXT-08 expansion.

## Approved user-facing scope and original defect

The existing canonical `/library` page mounts `public/workspace.js::renderWorkspace('library')`, which calls `public/material-review.js::renderReviewedLibrary` with reviewed-public materials from the existing `/api/material-review` authority. Both the route copy and search form previously used truthy dictionary lookups such as `COPY[lang] || COPY.uk`. For untrusted values `__proto__`, `constructor` or `toString`, JavaScript's inherited property was treated as an approved translation and rendered undefined title/form text; a null-prototype object could throw before the page was rendered. The former predicate was reproduced with native Node 22.16.0 before the patch. No user content or production records were touched.

## Final integrated implementation

- Existing `ownLocaleCopy` helpers are reused in BOTH canonical UI surfaces, never a second public library or language authority.
- Invalid, nonstring, inherited or unknown locales safely use existing Ukrainian copy; valid `uk`, `ru`, `en` display their correct labels. Keyboard search and the real reviewed materials backend remain unchanged.
- Three source-executing Node regressions cover inherited/malformed locale input in the public search, supported language copy and mounted `renderWorkspace('library')` route, preserving available controls and empty-state messages.
- No new edition/translation, private account write, migrations, publish action, registration, website deployment or release performed.

**Exact feature PR:** [#989](https://github.com/Oleksii-debug/scripture-archive/pull/989) **SQUASH MERGED**, integration `main@2efd12811f6dfb8740788dba9e6b3d94b9bd5d6c` (PR head `fd51361e3c412129fa3dbd824310630a3841af37`). Readback verified `main`, PR merged=true and production blobs:

- `public/material-review.js@33e142efa1d28dabf4c41c572c4f5e7f827590f1`
- `public/workspace.js@bf195b61243d95cbd1c55167010f80e834ecf4d6`
- `tests/library-reviewed-route.test.mjs@b41517c312f42753da02cb8d5bae1dbe5605b25c`

**Exact PR-head native CI:** [GitHub Actions #41220737865](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41220737865) **COMPLETED SUCCESS**. Native Node: 3488 PASS / 0 FAIL / 1 SKIP (3489 tests), disposable HTTP Worker/D1: 24 PASS / 0 FAIL, TypeScript, lint, source build and existing two Python tests PASS. This is source and disposable-runtime qualification; physical Windows/NVDA, deployed Sites SHA, real users and production D1 remain **NOT_VERIFIED**.

## Terminal scope fence

- `remaining_scoped_implementation=0`
- `necessary_unmerged_scoped_feature_PRs=0`
- `scope_status=CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`
- `parent_SA_EXT_08=OPEN`: complete licensed library corpus, rights/editions, media/books, other planned functions, real browser/NVDA and release acceptance are **not** closed by this fix.
- Reopen ONLY on a concrete reproduced defect of this UI behavior or a newly approved requirement. Do not duplicate the completed code on another branch.

Coordination: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297) and [#295](https://github.com/Oleksii-debug/scripture-archive/issues/295).
