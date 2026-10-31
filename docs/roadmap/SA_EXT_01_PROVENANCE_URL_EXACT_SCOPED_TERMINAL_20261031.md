# SA-EXT-01 — exact source/license URL visual-alias boundary — scoped terminal

**Date:** 2026-10-31. **Status:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` for this one demonstrated source-integrity defect only. The approved SA-EXT-01 parent remains **OPEN**; this is not a rights clearance or site deployment.

## Proven original defect

`public/parallel-reader.js::safeProvenanceHttpsUrl` admitted raw codepoints U+034F, U+115F, U+1160, U+2800, U+3164, U+FFA0 and a raw backslash in HTTPS source/license paths. The WHATWG parser rewrote those bytes into %-encoded path data or path separators; a local Node 22 reproducer returned nonempty canonicalized addresses for all seven malformed inputs, rather than refusing the altered provenance.

## Implemented canonical repair

- Existing shared reader/edition provenance URL predicate now refuses the seven exact raw aliases before `new URL()`. The same helper is consumed by the primary reader, parallel reader and edition About view; no second server and no new content authority.
- `tests/parallel-provenance-unicode-control.test.mjs` adds URL rejection for seven aliases across both independent source/license rights fields, edition About markup non-disclosure, retained safe counterpart, and positive tests for ordinary/percent-encoded HTTPS.
- Existing edition identity, genuine Cyrillic/Braille rights prose, canonical three localizations, licensed Bible bytes and user account data are unchanged.

## GitHub integration & verification

- PR: https://github.com/Oleksii-debug/scripture-archive/pull/978 — **SQUASH MERGED**
- Feature `main` SHA: `0406009e72f6e59da55be9007de0a18fea6529a8` — independently re-read after merge.
- Production blob: `public/parallel-reader.js@811c22189c106c5380abd9bc12dd0dce421ab5ac`.
- Regression blob: `tests/parallel-provenance-unicode-control.test.mjs@273ff668074bd8491cd4b7974e7cdd4343559109`.
- Exact PR head: `92bdae7a6751a04ab6d3120e397e6d46a0c0d4b8`; native CI https://github.com/Oleksii-debug/scripture-archive/actions/runs/41218202105 — `completed/success`. Verified job covered Node suite, TypeScript, lint, build, disposable Worker/D1 and Python.
- Independent local *predicate-only* Node 22 check: old seven malformed inputs accepted, patched eight adverse and four valid cases passed. This is not a full browser/Windows acceptance.
- `remaining_scoped_implementation=0`; `necessary_unmerged_scoped_feature_PRs=0`.

**Release boundary:** Live deployed Sites SHA, production D1 consent migration, rights-holder clearance, physical NVDA/Windows and whole 20-section product are not verified. No deployment, data migration, email or payment actions occurred. Do not reopen this scoped defect without new reproducible evidence. SA-EXT-01 parent and other not-yet-implemented section requirements stay OPEN.
