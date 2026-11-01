# SA-EXT-01 — LEGACY_HASH_READER_VERSE_FOCUS — scoped development receipt (2026-11-01)

## Boundary

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL for this URL-compatibility repair only.**
**SA-EXT-01 parent remains OPEN**, as do 02/05/06/07. SA-EXT-03/04 remain source-terminal.
No claim of completed Bible-edition rights, translation QA, real Chrome/Windows/NVDA,
installed Sites/D1/backup, or publication/release acceptance.

## Reproduced source-level defect

The supported legacy link `/#/reader/JHN/3?verse=16` was parsed by
`routeSourceFromLocation` as the chapter coordinate `3?verse=16`.
The existing explicit malformed-chapter guard then correctly refused it, and
`readerVerseFromUrl` could not read a verse query inside a URL hash.
Thus the legacy link could not select its intended verse. This was confirmed
by exact baseline source inspection and isolated copied-function Node
reproduction; **no native pre-fix RED CI or production incident is claimed**.

## Canonical repair and integration

- [PR #1123](https://github.com/Oleksii-debug/scripture-archive/pull/1123) **SQUASH MERGED**
  into `main@364c4283ea3817499f4aa3b6ec06f681a45033e7`.
- Exact PR head: `45979e6ebaaa643accd1b78e6b7549eb62a5999c`.
- `public/route-location.js` blob `1af33d76bd29a801a7c6238af19dafc9aecc8875`:
  separates the hash-route query from its book/chapter/group coordinates.
- `public/app.js` blob `64ad6163ea68c526fb0fd185d164fb3f1ae94326`:
  resolves the legacy hash verse coordinate, rejects ambiguous outer+hash
  verse parameters, retains strict positive integer and chapter bounds.
- `tests/reader-legacy-hash-verse-focus.test.mjs` blob
  `bc92cc5eee86670a91e8c9619ad411035fd57d77`:
  tests actual route/reader helpers, legacy group and case aliases, normal
  links, malformed/duplicate/out-of-range coordinates, and route dispatch.

## Verification

- [Exact-head GitHub Actions #41286095922](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41286095922):
  **COMPLETED SUCCESS** on the exact PR head. Native Node, TypeScript,
  lint, build, disposable Worker/D1 and canonical Python validator steps
  all completed successfully.
- Seven additional isolated copied-function Node assertions passed locally.
  These are **not** a full native repository checkout, real browser, or NVDA
  acceptance. The baseline was not run through a full native RED CI.
- Post-merge source/test blob and main SHA readback verified.

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0`
**only for LEGACY_HASH_READER_VERSE_FOCUS**.

## Remaining parent work and restrictions

SA-EXT-01 still needs verified edition/translation rights and provenance,
editorial review, full reader/search/browser/NVDA acceptance and live
Sites/D1/backup/release evidence. SA-EXT-02/05/06/07 retain their own
approved scope. No new release, production migration, 82-language launch,
payments, synthetic users, mass email, dating service, or secret publication.
