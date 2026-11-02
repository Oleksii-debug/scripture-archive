# SA-EXT-01 / PARALLEL_SILENT_CITATION_SELECTION — scoped source closure (2026-11-02)

**Scope:** Only the stale second-edition citation after a programmatic `<select>` value change, with no native `change` event. This is **not** a terminal acceptance of SA-EXT-01 or the overall Scripture Archive product.

## Actual repair

- The existing canonical `public/parallel-reader.js` now retires the old licensed verse DOM and citation when Cite is clicked after a silent publisher selection change.
- The same retirement applies if the selection changes while the citation's asynchronous chapter guard is pending; clipboard copying is suppressed and the existing accessible `role=status` announces the changed selection.
- Existing native selection handling, double chapter guard for rendering, citation guard, publisher identity/rights lease, and uk/ru/en controls are preserved. No new API, DB or service.
- Three new native Node test groups cover immediate silent selection change, in-flight guard change and unchanged selection in each of the three languages.

## Immutable evidence

- Code + regression tests: [PR #1189](https://github.com/Oleksii-debug/scripture-archive/pull/1189), **SQUASH MERGED** into `main@5d915578fda82f869eb22b411fbb4ed8f2eb3254`.
- Exact-head [GitHub Actions #41390127054](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41390127054), head `eb08e188149fea127ec5b9c4cb65b5fd33640e64`, **COMPLETED SUCCESS**: native Node 4402 PASS / 1 SKIP / 0 FAIL; 37/37 disposable Worker/D1 PASS; Python 2/2 PASS; TypeScript, lint and source build PASS. Lint: 13 warnings, 0 errors.
- Source and test files read back from the exact PR head; GitHub reports merged=true and post-merge `main` matched the merge SHA.
- Full native local checkout, physical Windows/Chrome/NVDA, independent publisher rights/editorial acceptance and live Sites/D1/backup/release remain **NOT_VERIFIED**. This is not a claim of local native or production PASS.

## Remaining work / no premature closure

`remaining_scoped_implementation=0` and `necessary_unmerged_scoped_PRs=0` **only for PARALLEL_SILENT_CITATION_SELECTION**. Parent SA-EXT-01/02/05/06/07 **OPEN**; SA-EXT-03/04 source-terminal by current owner order. Existing conflicted draft #325 was not modified or merged. Continue with other unclosed approved UI/API/DB requirements and independent end-to-end acceptance.

No 82-language expansion, release publication, production migration, payments, synthetic users, bulk mail or dating product was launched.

## Additional rejected-guard recovery closure (same scoped feature)

A negative review found a second route through the same stale-citation defect: if the asynchronous citation chapter guard **rejects** while the selected edition has changed without an event, the earlier error handler returned without retiring the old verse DOM. The existing guard error branch now retires the stale text and announces the publisher change; a genuine guard outage for an unchanged edition still invokes fail-closed. Two new regression groups exercise the changed edition in uk/ru/en and unchanged-edition outage.

- [PR #1191](https://github.com/Oleksii-debug/scripture-archive/pull/1191) **SQUASH MERGED** `main@603b186c2ead1231343fd30dfc8c57fa3115ca36`.
- [Exact-head CI #41390591726](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41390591726) **COMPLETED SUCCESS**: 4404 Node PASS / 1 SKIP / 0 FAIL; 37/37 disposable Worker/D1 PASS; 2/2 Python PASS; TypeScript/lint/build PASS (13 lint warnings, 0 errors).
- Same scope and remaining parent obligations as above. No new production, publisher rights or physical NVDA acceptance.
