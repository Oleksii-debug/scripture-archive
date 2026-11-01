# SA-EXT-05/06 — DOSSIER_CATALOG_OWN_DATA_PROVENANCE — scoped source terminal (2026-11-01)

**Scope:** only the catalogue-own-data boundary of the existing `public/scripture-dossiers.js` dossier/atlas/standalone-search functions. **Not** a terminal claim for SA-EXT-05 or SA-EXT-06, not a release.

## Reproduced source-level defect and minimal repair

The previous `validateDossierGraph` checked `Object.hasOwn` on catalogue `books`, language inventory, array slots and `code/title/chapters`, then read those properties. Own JavaScript getters could execute while checking a Scripture source, change publisher book names/limits, or throw before an accessible error. The standalone dossier search also read dynamic catalogue titles. This is a defensive source-integrity finding; the shipped JSON catalogue itself is not asserted to contain hostile getters.

[Functional PR #1164](https://github.com/Oleksii-debug/scripture-archive/pull/1164) **SQUASH MERGED** into `main@3e46e626f5ac81a71bf3760049f9148c935c3078`. Test-first commit `866fbc11e9e95024db2d4e67d0dff3590c68042d`; repaired candidate `001673fd8e668a25366e05deb12f308e368dfdfb`. Source blob `public/scripture-dossiers.js@435998a17cd06041096c5d437dd20799a0a2c4d1`; new regression blob `tests/dossier-catalog-accessor-authority.test.mjs@beb884ad3b8a6a76040f2108cfa53ec92d943538`.

The canonical validator now requires own data descriptors for the root catalogue, language inventories, array book indices and each book's code/title/chapter count before rendering any reader/source links. Standalone book-name search reads only own data descriptors. Existing dossier/atlas UI, canonical reader URLs, three languages and null-prototype/JSON records remain supported. No new API, D1 schema, service, historical/geographic assertions or content source.

## Executed verification

[Exact candidate GitHub Actions #41343483190](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41343483190): **COMPLETED SUCCESS** at head `001673fd8e668a25366e05deb12f308e368dfdfb`: native Node **4298 PASS / 0 FAIL / 1 SKIP**, TypeScript PASS, lint **0 errors / 13 warnings**, source build PASS, disposable Worker/D1 **37/37 PASS**, canonical Python validators **2/2 PASS**. New tests cover six hostile getter locations, no getter execution, fail-closed role=alert/no reader links in uk/ru/en, standalone search and valid null-prototype provenance. GitHub readback verified source/test blobs and functional squash-merge SHA. This does not substitute for full native local checkout or physical browser/NVDA acceptance.

## Remaining approved work

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **only for DOSSIER_CATALOG_OWN_DATA_PROVENANCE**. Parent **SA-EXT-05 and SA-EXT-06 OPEN**, as are SA-EXT-01/02/07; SA-EXT-03/04 remain source-terminal. Remaining parent scope includes expanded traceable dossier corpus and independent scholarly/denominational review, genuine licensed geographic/archaeological material, complete accessible atlas/chronology, real Chrome/Windows/NVDA, editorial rights and live Sites/D1/backup/release qualification. No 82-language rollout, release publication, production migrations, payments, synthetic users, mass mail or dating.
