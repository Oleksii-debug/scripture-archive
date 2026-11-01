# SA-EXT-01 — PARALLEL_EDITION_IDENTITY_OWN_DATA — scoped source closure (2026-11-01)

**Verdict: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL for this one identity-admission defect only.** The full SA-EXT-01 parent and SA-EXT-02/05/06/07 remain **OPEN**; SA-EXT-03/04 are already source-terminal. This is not product, release, publisher-rights, editorial, production, or physical accessibility acceptance.

## Reproduced source defect and repair

The canonical `public/parallel-reader.js` selected a publisher record using `translation?.id === edition.id` or `fallback?.id === edition.contentId`. An inherited `id` or dynamic accessor could pass that check while own `title/license/source` values passed the existing rights validator. This could misattribute displayed Scripture and copied citations to an unverified edition. Isolated Node reproduction of the original predicate: **4/4 representative inherited/getter cases admitted**; the own-data descriptor predicate rejects all four. No production incident is claimed.

The existing reader now admits a translation/fallback record only when its `id` is an **own data descriptor** matching the selected edition. It never invokes identity getters, keeps both chapter guards, the canonical UI and clipboard rights, and accepts ordinary JSON and null-prototype records. No parallel reader, API, D1 schema, service, language, or deployment was introduced.

## Exact integration evidence

- [Functional PR #1158](https://github.com/Oleksii-debug/scripture-archive/pull/1158) **SQUASH MERGED** into `main@d698c65e234c46a3537f74b1ee11b1c15d04055f`; tested exact PR head `6e46777a1345540106649e8d3c99cad3ac2585d3`.
- Exact integrated source blob: `public/parallel-reader.js@07d208b9d3df862d8ba0cd07eeb8be2cc9f08dc1`.
- Exact integrated regression blob: `tests/parallel-reader-own-data-identity.test.mjs@f09f53796dce12fb7ebc5bfd67a716f03e39a54f`.
- [GitHub Actions #41333342171](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41333342171): **COMPLETED SUCCESS**, exact tested head. **4285 native Node PASS / 1 SKIP / 0 FAIL**, TypeScript PASS, lint PASS (pre-existing warnings, no errors), source build PASS, **37/37 disposable Worker/D1 PASS**, **2/2 Python PASS**.
- Source-executing regressions cover 12 inherited/accessor identity negatives (fallback and declared translation, uk/ru/en), 6 valid own-data/null-prototype positives, both attempt guards, retryable status and enabled keyboard submit. Test-first GitHub run #41333263356 was cancelled by the source update: **no baseline RED CI claim**.
- Readback from `main` confirmed both blobs and merge SHA; draft [#325](https://github.com/Oleksii-debug/scripture-archive/pull/325) remains unchanged and conflicted.

## Scope and remaining work

`remaining_scoped_implementation=0`; `necessary_unmerged_scoped_PRs=0` **only for PARALLEL_EDITION_IDENTITY_OWN_DATA**. Full parent SA-EXT-01 still requires licensed, source-verified editions and human editorial acceptance, real browser/keyboard/Windows/NVDA qualification, and actual release/deployment evidence. SA-EXT-02/05/06/07 remain open. Live Sites SHA, production D1 and backup/restore, owner acceptance and release are **NOT_VERIFIED**.

No new release, production migration, 82-language expansion, payment, synthetic user, mass mailing, dating service or secret publication was performed.
