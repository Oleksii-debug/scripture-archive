# SA-EXT-01 — PARALLEL_RIGHTS_METADATA_BOUNDS — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

Date: 2026-10-31. Scope: one demonstrated, bounded defect in the canonical Bible parallel-reader's edition provenance. **The full SA-EXT-01 parent remains OPEN**, as do other unfinished parent sections. This receipt does not certify legal rights for all editions or whole-product completion.

## Function and integration

The existing public/parallel-reader.js now rejects malformed/overlong edition metadata BEFORE creating verse DOM or citation snapshots: maximum 512 UTF-16 units for edition title, maximum 4096 for license, optional attribution, source HTTPS URL, and optional license URL. Typed invalid attribution is rejected rather than silently stringified. The user receives the existing localized error status and retains a retry path after valid metadata is restored. No invented source/license, unlicensed fallback, silently truncated citation, alternative Bible reader, separate API, or changed account authorization.

- Source PR #845: https://github.com/Oleksii-debug/scripture-archive/pull/845, SQUASH MERGED, exact feature main SHA f719f999c1cc8ab9051066eb5bf658808f8c6742.
- Canonical source blob public/parallel-reader.js @ 555bf4d9aca97812955280c2c2aa946f8c6804b6.
- Committed regression blob tests/parallel-reader-provenance-bounds.test.mjs @ fe12c234eb39170671f00d8230dc93ab0e529200.
- Exact-head GitHub Actions #41168876527: https://github.com/Oleksii-debug/scripture-archive/actions/runs/41168876527, SUCCESS on head 4aba5f89e97d5e22dd76f16616420caf94052d90. Executed native Node regression suite, TypeScript, lint, source build, disposable local Worker/D1, Python validators. Source and disposable test evidence, NOT installed-site verification.
- Independently executed actual GitHub JavaScript in isolated V8: before 2/9 expected checks PASS and seven malformed-metadata checks RED; after 9/9 PASS. Cases cover oversized title, license, attribution, source and license URLs, invalid typed attribution, normal metadata and allowed maxima.
- Independently read back both integrated source/test blobs from main. necessary_unmerged_PRs=0; remaining_scoped_implementation=0 solely for this narrowly repaired issue.

**SA-EXT-01 / PARALLEL_RIGHTS_METADATA_BOUNDS — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.** Do not reassign this narrowly fixed defect without a new reproduction or requirement.

**Remaining outside this scope:** parent SA-EXT-01 licensed translation coverage and independent source rights remain OPEN. Live site scripture-archive.com SHA, migration/backup, real browser, Windows/WebView2 package, physical NVDA and release acceptance are NOT_VERIFIED. No deployment, email, additional languages, or separate 18+ product touched. Coordination https://github.com/Oleksii-debug/scripture-archive/issues/297 ; owner scope https://github.com/Oleksii-debug/scripture-archive/issues/295.
