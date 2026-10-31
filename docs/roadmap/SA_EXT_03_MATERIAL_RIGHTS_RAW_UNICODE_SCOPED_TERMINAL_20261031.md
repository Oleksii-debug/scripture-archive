# Scripture Archive — reviewed-material rights URL: scoped terminal source closure (2026-10-31)

**STATUS: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**, only for `app/api/material-review/route.ts::httpsUrl` raw-source/license URI admission. **Do not reopen/reimplement** without a new specific reproduced defect or requirement.

## Accepted scope and product wiring

- The existing canonical `/api/material-review` submission route refuses misleading raw Unicode controls (Cc, Cf, Cs, Zl, Zp, whitespace) and user-info delimiters, including empty `https://@host`, before URL canonicalization.
- The **same existing helper** also fail-closes historical stored publication rights on public library, author's history, and library-search reads. No new endpoint, copied app, release mechanism, database migration, content rewrite or language rollout was added.
- Valid HTTPS publisher paths, percent-encoded spaces and `@` within query parameters remain supported.

## Reproduction and acceptance evidence

- Prior source: old ASCII-only admission permitted U+202E/bidi and invisible URL text because WHATWG URL converted it to percent-encoded href; it also permitted empty user-info separator. A bounded 16-case Node v22.16.0 isolated behavioral comparison yielded **old 6/16, fixed 16/16**. This isolated helper run is not a full application test.
- [Functional PR #965](https://github.com/Oleksii-debug/scripture-archive/pull/965) **SQUASH MERGED** into exact functional `main@15d6f1be205a6f8832c806041d737b5fd8fc740c`. GitHub readback after merge: production blob `app/api/material-review/route.ts@0898fd19207725380712b740877403db41dfa5d7`; regression blob `tests/material-review.test.mjs@7085df5f45129a3df727fd783f95e75e0d37259d`.
- [Exact-PR-head GitHub Actions run #41203870246](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41203870246): **COMPLETED SUCCESS** on `bb910cd8dc3a9cdd2a94935b7f49ca38ab428e56`. Native Node **3,403 PASS, 0 FAIL, 1 SKIP**; disposable Worker/D1 **24 PASS, 0 FAIL**; Python **2 PASS**; TypeScript, ESLint, source build PASS. This is CI/source qualification, not physical production/NVDA evidence.
- Functional source was reread from canonical `main` after merge; **necessary_unmerged_scoped_feature_PRs=0**, **remaining_scoped_implementation=0**.

## Deliberately separate obligations

Parent SA-EXT-01 and SA-EXT-16 remain OPEN; parent SA-EXT-03 and SA-EXT-04 retain their earlier terminal development receipts. Overall 20-section product, current Sites/D1 deployment, published Bible edition rights, browser user journeys, Windows/WebView2 and physical NVDA **NOT VERIFIED / NOT CLOSED** by this scoped repair. No hosting or release changes were made.

Coordination: [#78](https://github.com/Oleksii-debug/scripture-archive/issues/78), [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).
