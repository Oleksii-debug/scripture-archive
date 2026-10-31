# SA-EXT-04 — Late BFCache reauthorization and private group re-entry: scoped terminal

Date: 2026-10-31. Status: **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**, scoped solely to the verified group-detail lifecycle defect. Not a full SA-EXT-04 parent close or Sites deployment acceptance.

## Original exact-source defect and proof

At old `main@35a9e1cea94bdd3b04275b53dbbdb0ff3997f138`, the real `public/app.js` had a `pageshow` completion callback that unconditionally called `route()`, even after the same page was hidden a second time. Exact production lifecycle source was executed in V8 with the sequence `pagehide → pageshow → pending getSession → pagehide → late getSession completion`: **one `route()` call while hidden (expected RED)**. An intervening group re-render could also issue a private GET while server reauthorization was pending.

## Accepted implementation

- [PR #818](https://github.com/Oleksii-debug/scripture-archive/pull/818), exact tested head `412b8448b2875adb8a2697fc65ef28dc29ba6a69`, **SQUASH MERGED** into `main@a544e0caa862453ae51499cc4573ccb5ee1b8b3a`.
- Production `public/app.js` blob `e7c1cfc672a87996338a618874396a19b49f958a`: a separate restore lifecycle generation; synchronous hidden-page retirement; private group reentry blocked while hidden or awaiting server session; stale callbacks cannot reopen the router.
- Source-executing `tests/group-detail-bfcache-privacy.test.mjs` blob `b9138b027a903aa022924e6d5cd24366d589ff3a`: adds three focused cases covering two exits with delayed auth, group-route suppression before reauthorization, and cancellation after leaving for another page. Original #815 tests are preserved.
- The exact repaired lifecycle source was independently executed in V8: **0** hidden `route()` calls under the previously failing ordering (expected GREEN).
- [Exact-head GitHub Actions #41163569190](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41163569190): **completed SUCCESS**. All observed job steps completed successfully: real native Node tests, TypeScript, ESLint, source build, disposable Worker/D1 integration, and two existing Python validation steps.
- Post-merge GitHub readback confirmed actual `main@a544e0caa862453ae51499cc4573ccb5ee1b8b3a`, PR merged/closed, and both exact source/test blobs as above.

For this **narrow defect only**: `remaining_scoped_implementation=0`; `necessary_unmerged_prs=0`. Do not reopen it without a concrete new reproducer.

## Separate not-verified obligations

The full SA-EXT-04 parent and SA-EXT-01…20 are **OPEN**. Real Chrome BFCache/physical NVDA, latest published scripture-archive.com SHA and production database/mail acceptance are **NOT_VERIFIED** by this source fix. No Sites release, data/schema change, or owner migration was performed. Keep these in #297 and their existing release owners.