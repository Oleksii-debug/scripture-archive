# SA-EXT-08 — structured rights disclosure (scoped final acceptance, 2026-10-31)

**STATUS: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.** This receipt closes only `LIBRARY_STRUCTURED_RIGHTS_DISCLOSURE`, not the parent SA-EXT-08 or the entire Scripture Archive product.

## Exact integration
- Source PR: https://github.com/Oleksii-debug/scripture-archive/pull/922
- PR head: `3ec727f96591949734619073be7f94c2dba94a2f`
- Confirmed GitHub SQUASH MERGED: `main@c7f423df9bfc5eefd00bf8aa0970dcdb054225c6`
- GitHub Actions exact-head run: https://github.com/Oleksii-debug/scripture-archive/actions/runs/41188738369 — **completed SUCCESS**; one `source-and-disposable-integration` job completed SUCCESS with all steps successful.
- Recorded CI: Node **2,989 PASS, 0 FAIL, 1 SKIP**; Worker/D1 disposable **22/22 PASS** with migrations 0000–0015; TypeScript/lint/build and the canonical Python standalone validators **PASS**. These are hosted-CI claims grounded in the executed run and PR record, not physical user acceptance.

## Implemented, not merely documented
1. New submissions to the existing editorial-review API and user form now require a bounded rights-holder/status and enumerated basis (`original`, `permission`, `open_license`, `public_domain`), with a public HTTPS licence URL required for `open_license`.
2. The existing canonical author history, editor queue/audit and public reviewed-library views disclose rights metadata, publication locale and editorial review date; no secondary library or approval system was introduced.
3. Migration `drizzle/0015_material_rights_metadata.sql` preserves legacy records as explicitly unknown (`null`), without inventing a copyright owner or permissions; SQL triggers reject incomplete new structured records.
4. Server-side reads fail closed for invalid stored rights metadata, and the existing editorial takedown remains the removal authority.
5. Integration tests cover public flow, legacy upgrade and failure/privacy cases; no arbitrary external licensed text is bundled by this change.

## Remaining, separate obligations
- `remaining_scoped_implementation=0`; `necessary_unmerged_scoped_feature_PRs=0` **for this feature only**.
- The **parent SA-EXT-08 remains OPEN** for full approved library/media/catalogue scope, lawful rights verification, and separate release acceptance.
- `PRODUCTION_SITE_SHA_VERIFIED=NO`, `PHYSICAL_NVDA_PASS=NOT_VERIFIED`, `WINDOWS_PACKAGE=NOT_VERIFIED`, `DEPLOYED=NO` for this scoped merge. Do not deploy as part of this receipt.
- Original source/rights records remain authoritative; do not assign this completed subfunction again without a new requirement or concrete reproduced defect.
