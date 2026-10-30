# SA-EXT-05/06 — SAFE_CANONICAL_BOOK_CODE_SOURCE_AND_LINKS — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Date:** 2026-10-30  
**Repository:** Oleksii-debug/scripture-archive  
**Closed scope:** only the unsafe Bible book code acceptance and reader/atlas-link construction risk in the existing canonical dossier source graph  
**Merged implementation PR:** [#783](https://github.com/Oleksii-debug/scripture-archive/pull/783)  
**Exact merge/main SHA:** `5cc884cd015b4784a20d803101e94fdfbe598830`  
**Verified implementation blob:** `public/scripture-dossiers.js@31709256c742bf187d03d70ebaa3cbe296f395f9`  
**Verified regression blob:** `tests/source-dossier-graph.test.mjs@ae55a3b139306ac755024f3481b7b2c60fbb8c29`  
**Exact-head CI:** [GitHub Actions #41072051344](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41072051344) — COMPLETED / SUCCESS at PR HEAD `5ee2a1a85d22d92441923ac7a53783c6b55fea72`.

## Reproduced missing validation
The original source graph accepted a book code `GEN" onfocus="alert(1)` when the authoring dossier and all three editions agreed, then interpolated it unescaped into an internal reader `href`. An isolated V8 source fixture produced an unwanted HTML event attribute. This was a **controlled source-injection reproduction**; there is no evidence of public-site exploitation.

## Finished implementation and acceptance
- Reused the canonical `validateDossierGraph`; no new renderer/server/book database.
- Book-code rows in each UK/RU/EN catalogue and every dossier/related source must match `^(?:[1-3])?[A-Z]{2,4}$`. Invalid authored data fails closed before both dossier and atlas HTML is assembled.
- All 66 codes in the committed real Bible catalogue remain valid.
- Extended the existing source-graph regression file with six invalid code shapes (attribute, path traversal, query, ampersand, whitespace, newline), malformed catalogue and source evidence, three languages and both real renderers.
- Exact PR head Node tests, TypeScript, ESLint, source-only build, disposable Worker/D1 integration and Python validators passed in GitHub Actions. GitHub merged PR #783 with exact SHA above; both changed source blobs were read back after merge.

`remaining_scoped_implementation=0`  
`necessary_unmerged_PRs=0`  
`scope_status=CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`

## Not closed by this receipt
Full parent sections **SA-EXT-05 and SA-EXT-06, and all other SA-EXT-01…20, remain OPEN** until their complete approved scope is implemented and accepted. Site deployment SHA, public browser, real Windows/NVDA, Scripture edition rights and human-source audits are **NOT_VERIFIED** here. No hosting, DB migration, release, secret, domain, account, or production data was changed. New improvements need a newly identified defect or an explicit approved requirement, not repeated implementation of this source repair.

Coordination: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297) and [full plan](SCRIPTURE_ARCHIVE_EXPANSION_SECTION_PLAN_2026-10-28.md).
