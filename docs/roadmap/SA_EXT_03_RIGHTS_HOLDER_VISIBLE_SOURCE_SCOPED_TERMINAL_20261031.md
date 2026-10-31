# Scripture Archive — visible material rights-holder attribution: final scoped source closure

Date: 2026-10-31. **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** applies only to the proved invisible/control Unicode rights-holder attribution defect of the canonical review/public materials flow. Do not reopen without a specific reproduced regression or approved change.

## What is complete

- Existing `/api/material-review` refuses raw control/bidi/invisible/filler Unicode in the material rights-holder field at submission, before D1 mutation. Legitimate visible names continue to save and survive editorial review.
- The **same** canonical server validates imported/legacy stored rights before returning public catalogue, author history, or library search, returning a recoverable 503 on forged attribution instead of publishing it.
- Existing `public/material-review.js` refuses poisoned rights-holder text before the public HTML is constructed, using the recoverable invalid-catalogue alert rather than showing misleading source names. No second frontend/endpoint/DB writer/release authority introduced.

## Verified exact receipts

- [Functional PR #969](https://github.com/Oleksii-debug/scripture-archive/pull/969) **SQUASH MERGED** into `main@9039d85ed24f1c9346cc0b44aa1db26f357b9ff6`; source files `app/api/material-review/route.ts` and `public/material-review.js` plus two canonical real tests.
- [Native exact-PR-head CI #41204855117](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41204855117) **COMPLETED SUCCESS** on `258bff1c5f56bf4c54eef749bef9e4d872cbda98`: native Node **3407 PASS / 0 FAIL / 1 SKIP**, disposable Worker/D1 **24 PASS / 0 FAIL**, Python **2 PASS**, TypeScript, lint, build PASS.
- Post-merge exact GitHub main readback blobs:
  - `app/api/material-review/route.ts@16905ff2c52094e3b7b54d285ea7dd067c8fdb18`
  - `public/material-review.js@8e3025602f982cd3ca4edecbaaab3364d79c94fc`
  - `tests/material-review.test.mjs@7993515b4d4213c6750678dafbe6adb727c58759`
  - `tests/material-license-url-dom.test.mjs@e4338712d4b9a87fcd36ddd6ea54fa7d2c4bb857`
- New tests exercise bad Unicode codepoints, no D1 mutation, valid editorial publication, damaged legacy rows, public-source errors and recovered legitimate accessible HTML.
- Scoped final values: `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0`. No open PR is required to finish this bounded defect.

## Retained boundaries

Original parent SA-EXT-03/04 retain prior `CLOSED_FOR_DEVELOPMENT / TERMINAL` evidence. Parents SA-EXT-01, SA-EXT-16 and the rest of 18 open parent Sections **remain OPEN**; this receipt is not a blanket product closure. Live Sites version, D1 migration/backup, production browser, physical NVDA/Windows/WebView2, content rights and release **NOT VERIFIED**; **no deployment** in this change.

Related earlier canonical repairs: functional #965 and #967; their separate terminal records were integrated in #966 and #968. Coordination #297.
