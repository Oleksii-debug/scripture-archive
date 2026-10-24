# SA-SEQ-15 / SA-08 — Scripture Archive textual sources, rights and verse navigation

**Date:** 2026-10-25. **Status:** CANDIDATE / REVIEW REQUIRED / NOT DEPLOYED.
**Repository:** `Oleksii-debug/scripture-archive`. **Starting main commit:** `93591836b53a36e0114ab2bc4bd92632128e8d96` (2026-10-24 22:49:44 UTC).
**Scope:** Scripture Archive only. Changes limited to existing reader navigation, catalog checksum manifest, tests and this evidence record. No copied modern protected translation text.

## Material sources actually inspected

- The named GitHub main commit and this branch's `public/app.js`, `public/editions.js`, `public/data/catalog.json`, `public/data/bible-build-manifest.json`, Bible corpus file tree, root `AGENTS.md` and existing `tests/` structure.
- Google Drive folder `Scripture Archive — Web Release — UK RU EN`, ZIP `scripture-archive-live-f8eba64.zip` (Drive ID `1UcW_x-BPl7WWEpYejST8SqKyTgLgA9o5`, 12,516,116 bytes, SHA-256 `12c0317ceb5d42b62f53909b548c36b0ef834bfb967c9b670c20f7a3c4cf944d`). This is an older release snapshot, NOT this branch checkout or deployed-SHA proof.
- That Drive ZIP contains `public/data/bible/uk-ohiienko/provenance.json`: 66 per-book SHA-256 values, 66/66 independently matched the bundled JSON bytes. Its upstream source commit is `a849415161c588156cae144c7ae870c54f3b9969`. This sidecar was not present among the 264 Bible book JSON paths in the checked GitHub branch tree; do not claim the branch reproduces its source-bytes provenance without verification.
- Upstream and copyright evidence: `https://ebible.org/ukr1871/`, `https://ebible.org/russyn/`, `https://ebible.org/engwebu/`, `https://worldenglish.bible/`, `https://github.com/onlydotbible/ohienko/blob/main/source/README.md`, `https://commons.wikimedia.org/wiki/File:Ivan_Ohienko_Bible.djvu`.

## Translation rights and mapping

| Language | Edition options shown | Local corpus / rights | Other choices |
| --- | --- | --- | --- |
| UK | Ohiienko; Kulish/Puliui/Nechui-Levytskyi; Khomenko; Turkoniak | `uk-ohiienko` is the 1988 Ohiienko edition transcribed at Wikisource, CC BY-SA 4.0, with Ukrainian Bible Society pre-1991 permission and edition/source/license/attribution/formatting metadata. `uk` is the 1905 historical edition (eBible `ukr1871`), Public Domain. | Khomenko and Turkoniak are **publisher links**, not copied local files. |
| RU | Synodal; New Russian Translation; contemporary Russian; Kulakovs | `ru` Synodal (eBible `russyn`) is recorded as Public Domain. | NRT, RSP and Kulakovs are **external publisher links**. |
| EN | WEB Updated; KJV; NIV; ESV | `en` WEB Updated (eBible `engwebu`) is Public Domain, subject to the WEB trademark/faithful-copy naming condition. | KJV, NIV and ESV are **external publisher links**, not locally copied. |

Important limit: MIT in the Ohiienko source repository applies to its code, **not** to the biblical text; the text is CC BY-SA 4.0 (attribution, license link and share-alike for adaptations). Permission cited there covers pre-1991 editions only. Catalog attribution and formatting statements are visible in the existing reader edition card. The above is provenance research and code inspection, not a legal opinion or independent license clearance of every external publisher's terms.

## Corpus integrity measured

- GitHub tree at initial main snapshot: 66 present book JSON paths for each of `uk`, `ru`, `en`, `uk-ohiienko`; no missing book codes in any of four groups, common 66-book code ordering consistent across default UK/RU/EN. `bible-build-manifest.json` counts **198 default** files (`66 x 3`); extra 66 Ohiienko texts make **264** actual book JSON assets. The manifest's three `locales` correctly refer to default editions, not all four local translations.
- Drive archive source: all **264 book JSONs** parsed; file `bookCode`, `editionId`, `locale`, positive chapter count matching catalog and nonempty verse slots passed. Exact totals: `uk` 66 books / 1,189 chapters / 31,082 verse slots; `ru` 66 / 1,189 / 31,169; `en` 66 / 1,189 / 31,098; `uk-ohiienko` 66 / 1,190 / 31,170. Its extra `provenance.json` is **not a book**, and 66/66 per-book SHA-256 checks matched.
- Ohiienko's four chapters of Joel (`JOL`) versus the default three are edition-specific, not to be normalized silently. Genesis verse totals also differ by edition; slot presence alone does not prove text/numbering equivalence or full verse-source fidelity. A source-by-source versification check remains necessary for production certification.
- Five synthetic damaged fixtures (wrong book, wrong locale, wrong edition, truncated chapter, empty verse) were rejected by a standalone **diagnostic contract**, not by an asserted production importer. Do not count these as actual application refusal.

## Two reproduced acceptance gaps and bounded repairs

1. **Search-result verse lost:** Prior `public/app.js` displayed e.g. `GEN 1:3` but linked only to `/reader/GEN/1`, losing verse 3, with the route scrolling to page top. This affects UK/RU/EN equivalently. `public/reader-verse-links.js` now creates `/reader/GEN/1?verse=3` only from valid chapter/verse numbers and safely focuses the existing semantic `<p class="verse" id="v3">` after the existing router renders. Duplicated, missing, zero, malformed, overflow or absent targets refuse focus. No parser, reading storage, or copyright corpus duplicated.
2. **Manifest stale:** `public/data/bible-build-manifest.json` claimed `catalogSha256=bea42bacf1d3e910fa6471cb7772a63cc11a271540ff38b839e367a0bbce38f3`, while the exact current GitHub source catalog UTF-8 bytes at branch creation yielded `5fcc8a2989acda90a324738db605e3e311a426dbd447fef840cc97f777cd5816`. The Drive ZIP catalog also mismatched the old digest, independently. Updated the manifest digest to the current GitHub catalog bytes; left its default 198-file count unchanged. Added a Node regression that computes SHA-256 directly from the repo file bytes and compares it to manifest.

## Focused tests actually executed

- Google Drive ZIP integrity: ZIP read/extraction and SHA-256 verified; 264 book assets contract checks **PASS**; Ohiienko per-file digest matches **66/66**.
- GitHub connector retrieved this candidate branch directly: V8 syntax-parse of its full `public/app.js` with import statements removed (parse-only) **PASS**; URL helper syntax/runtime checked using a minimal URLSearchParams stand-in **PASS**; canonical route construction 198/198, malformed link cases 5/5, rejected verse-query cases 7/7, semantic focus behavior PASS; actual source contains the new search-link and after-route focus calls. These isolated assertions are **not full-checkout/CI or live-browser tests**.
- A Node 22.16 isolated execution using original Drive ZIP and the byte-identical committed `reader-verse-links.js` plus regression tests gave 5 PASSED / 1 FAILED in the **old Drive release**: its hash-only `#/reader` router predates this GitHub branch, and thus the source-wiring assertion predictably failed. This is a verified old snapshot mismatch, not a green candidate qualification.
- `tests/reader-verse-links.test.mjs` includes positive and negative URL/focus tests, real four-edition Genesis/Joel fixtures, licensed/external edition metadata, current-source wiring, and raw catalog SHA-256. The exact candidate full-checkout Node suite and project build have **NOT been executed** because the container cannot resolve `github.com` for a complete Git checkout. GitHub connector was available for reads and branch writes; do not equate it with full checkout.

## Blocker, acceptance gate and NEXT

- Current browser/deployed code and live canonical SHA cannot be proven from the Drive ZIP filename or public URL. CI, branch full-checkout `npm test`, `npm run build`, real search navigation with keyboard/NVDA in UK/RU/EN, external publisher links in browser, and real save/reopen/server refusal were **NOT_EXECUTED**. No reviewed main integration or live deploy is claimed.
- Existing source conversion parity for all Ohiienko verses and historical verse numbering should be verified against the pinned 1988 source before `RIGHTS_VERIFIED` / `CORPUS_VERIFIED`; the Drive provenance sidecar is useful evidence but not automatically proof that current Git main matches.
- **NEXT:** review this focused PR; rebase on newest main if it advanced; obtain a full exact-SHA checkout; run `node --test tests/reader-verse-links.test.mjs`, `npm test`, `npm run build` (count executed, not skipped/queued); verify current catalog hash, four local editions and intentionally external publisher links; browser-test search phrase → exact verse focus including malformed deep links; verify deployed release SHA and accessibility; only then merge/deploy and record actual readback.

**Overall:** two source-level acceptance gaps corrected in an unmerged candidate. Product/library complete, legally cleared in every jurisdiction, and deployed **NOT VERIFIED**.


## 2026-10-25 — SA-08 supplemental corpus-to-reader coordinate regression

**Exact checked Git candidate before test amendment:** `c88588a44bb40d3dfd470a4c8ba3ddcea75f3b44` (PR #286); same main-base SHA `93591836b53a36e0114ab2bc4bd92632128e8d96`.
**Actually executed:** using authenticated GitHub reads from that exact ref, parsed 16 real book assets: GEN, JOL, JHN and REV in each of `uk`, `uk-ohiienko`, `ru` and `en`. Six checks per asset compared canonical catalog entry with JSON bookCode, locale, editionId, testament, chapter count and all nonempty verse slots. **96 assertions PASSED, 0 FAILED; 16/16 assets read**. These are connector-based readback assertions, not a full checkout, npm suite, HTTP/browser or source-text word-for-word equivalence test.

**Edition-specific differences preserved:** `JOL` in Ohienko has four chapters with [20,27,5,21] verse slots; historical UK has three [20,32,21]. Both contain 73 slots, while the catalog correctly names chapter counts 4 and 3 respectively. The REV count in Ohienko is 405 versus 404 in each of historical UK, RU, EN; differences are tracked as edition-specific and **not** silently normalized. Genesis UK historical has 1,530 verse slots versus 1,533 in each of other three versions, so cross-edition verse offsets cannot be assumed identical.

**Durable test added:** The existing `tests/reader-verse-links.test.mjs` now includes a single metadata-focused regression enumerating all four UI-local edition folder mappings and all 264 catalog-book JSON files. It checks book identity, language, edition, testament, chapter count, and nonblank verses, preserving the four-chapter Ohienko Joel. No duplicate production parser, storage, translation text or new architecture is introduced.

**Execution truth:** The newly added 264-book Node regression is **COMMITTED BUT NOT_EXECUTED** on the amended PR SHA because full Git checkout through the container remains unavailable (GitHub DNS lookup failure). The 16-asset connector assertions are actual executions but **cannot** qualify the entire new test suite. No main merge, live deployment, exact deployed SHA, browser navigation or Windows/NVDA PASS is claimed. Existing PR #285 also edits reader verse behavior and needs conflict/ownership reconciliation; avoid independently merging either without joint review.

**NEXT:** Obtain exact amended PR full checkout; execute `node --test tests/reader-verse-links.test.mjs`, `npm test`, `npm run build`, and a real UK/RU/EN keyboard/browser search → exact verse → reload and malformed deep link refusal. Independently review rights and source-to-text provenance, reconcile #285, then integrate only with test evidence; refresh this record with exact qualified SHA.


### Executed source-identical Node helper tests (supplement)

The 20-line `public/reader-verse-links.js` was obtained from the exact amended PR and saved with identical bytes to an isolated local `.mjs` file. `git hash-object` of that isolated file = **`aeafbcdbb7999d2c9f287d0dc31f0881d9a41e95`**, exactly the blob SHA returned by GitHub for the PR helper. Linux, Node 22.16.0: `node --check` exit 0; `node --test focused.test.mjs` **22 PASSED / 0 FAILED / 0 SKIPPED / exit 0**. Cases cover four positive Bible coordinates, seven invalid book/chapter/verse inputs, nine malformed/duplicate/overflow verse-query refusals, valid semantic focus-and-scroll and nonexistent target refusal.

Isolated focused source/test/log SHA-256: helper `d3ae4d6fdcc8b1e3e04064fba713a234dc9afb437aaa1359ccc5460733a365f0`; harness `00e18eb51fc377cde390f9a98c57441a6245445e2d48551a97bd6a15a9ba6d55`; log `de2098bcc458a69baf449d9f750ff495e3816f7cddb2e5950a9296773f1b91c4`. These executed assertions qualify **only the byte-identical URL/focus helper in isolation**. They do not count as `npm test`, full checkout, actual UI/browser, Windows/NVDA, current corpus-wide 264-book test, reviewed integration or deployment.
