# SA-EXT-16 / LOCAL_WRANGLER_REJECTED_ORIGIN_BODY_FENCE — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

Date: 2026-10-30. Scope: **only** the reproducible disposable local Wrangler Worker/D1 test-harness error triggered by body-bearing, early rejected-Origin requests before a subsequent authorized HTTP mutation; **not** a Cloudflare SDK bug fix or production Worker lifecycle guarantee.

**Status:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` for this precise tested class; `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0`; parent **SA-EXT-16 and all full SA-EXT-01…20 remain OPEN**. GitHub issue [#618](https://github.com/Oleksii-debug/scripture-archive/issues/618) now closed for this qualified scoped CI-harness class, with historical failures and root-cause distinctions retained.

## Actual merged integration

- [PR #654](https://github.com/Oleksii-debug/scripture-archive/pull/654), `main@0b81f8b4c63e89b5e534c71491bf67aab913274d`: `scripts/disposable-worker-diagnostic.mjs`, `tests/disposable-worker-diagnostic.test.mjs`, `scripts/test-integration.mjs`. On a failed **local** Worker test, probe only the three existing anonymous GET endpoints with a bounded timeout; log only status/schema booleans, never sensitive content, body, headers, cookies or errors. Never retry POST/PUT.
- [PR #657](https://github.com/Oleksii-debug/scripture-archive/pull/657), `main@ec74617516ade148a89b897856991783f68db043`: avoid sending a nonempty JSON body in early rejected-Origin consent test request while preserving exact 403; a real compiled production `app/api/account/route.ts` route test verifies nonempty forged-origin JSON is still rejected before auth/D1.
- [PR #659](https://github.com/Oleksii-debug/scripture-archive/pull/659), **integrated `main@22c3adeeeadb751ade9987c78d31251758645bf8`**: same local HTTP-test adjustment for material review POST, account progress PUT and attempts chapter POST; all retain status 403. Added `tests/material-review-origin-preflight.test.mjs` executing the actual compiled production review POST with *nonempty* cross-origin JSON, requiring 403 and 0 auth/0 D1. Existing `tests/account-write-failclosed.test.mjs` and `tests/attempt-availability-boundary.test.mjs` separately execute the real body-bearing 403 contract.

Verified current main blobs at receipt drafting: `scripts/disposable-worker-diagnostic.mjs@5ba1e38d71eba37a223147a2f544b40d912fdaff`, `scripts/test-integration.mjs@129b03347d853d1589c48af2f5aeb940109d2d34`, `tests/material-review-origin-preflight.test.mjs@e4a1a7729103fb40f670dccfaed242e201462a78`, `tests/api-flow.test.mjs@c377d6934f6f01fb3723c52f3339105cd9892f36`. No app routing, auth policy, database schema, user state, release workflow or deployment changes in #657/#659.

## Exact-head success, negative evidence preserved

On the **same exact premerge #659 head `9258d2872ee234b1a77d158697170fa9d6edb9da`**, [Actions 41048793211](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41048793211) ran three independently provisioned real local Worker+D1 cold jobs:

| Cold job | Native Node | Disposable local Worker/D1 | TypeScript/lint/build/Python |
|---|---|---|---|
| `124039416853` | **1610 PASS / 0 FAIL / 1 expected SKIP** | **22/22 PASS** | PASS / PASS / PASS / 2/2 PASS |
| `124040314803` | **1610 PASS / 0 FAIL / 1 expected SKIP** | **22/22 PASS** | PASS / PASS / PASS / 2/2 PASS |
| `124041352317` | **1610 PASS / 0 FAIL / 1 expected SKIP** | **22/22 PASS** | PASS / PASS / PASS / 2/2 PASS |

Before this remediation the *same-head second cold runs* of #654 and #657 reproduced HTTP 503 on an authorized mutation immediately following a rejected body-bearing Origin probe, despite three anonymous GET checks responding 200. See [#618 diagnostic evidence](https://github.com/Oleksii-debug/scripture-archive/issues/618#issuecomment-6521487802). The exact mechanism of upstream Wrangler/Miniflare is still a hypothesis, not proven. These failures have **not** been deleted, ignored or converted into PASS; no state-changing request is retried.

## Non-claims and next independent requirements

This receipt **does not** assert `RELEASE_VERIFIED`, production Cloudflare Sites SHA, live HTTP/browser, real SMTP/DNS recovery, user roles on deployed D1, physical Windows/NVDA, 82 languages, or full SA-EXT-16 and SA-EXT-01…20 terminal. This is a scoped local test harness closure. A newly reproducible 503 on current exact source remains a new actionable regression; independent final release acceptance stays in [central board #297](https://github.com/Oleksii-debug/scripture-archive/issues/297). Do not redevelop this same scoped fix without new concrete evidence.
