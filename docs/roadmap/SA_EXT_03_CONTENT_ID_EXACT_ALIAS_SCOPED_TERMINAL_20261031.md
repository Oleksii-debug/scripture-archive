# SA-EXT-03 — exact editorial content IDs: scoped terminal receipt

**Date:** 2026-10-31  
**Disposition:** CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL  
**Original parent section:** SA-EXT-03 (already CLOSED_FOR_DEVELOPMENT / TERMINAL; not reopened).  
**Scope:** One independently observed post-terminal canonical CMS identity-alias defect in `app/api/content/route.ts`.  
**Feature PR:** https://github.com/Oleksii-debug/scripture-archive/pull/971  
**Integrated main SHA:** `e05ef94ac3f49a105c5aba71564ba9cfe53a3ef2`  
**Exact integrated source blob:** `app/api/content/route.ts@3021e6f387fe64d1257999847e670b9ef8e371ed`  
**Exact integrated regression blob:** `tests/content-batch-ack.test.mjs@8e54f93ffd602a9e13312a96c58dc0600ae7d315`  
**Full source CI:** https://github.com/Oleksii-debug/scripture-archive/actions/runs/41207030795 — COMPLETED SUCCESS, PR head `1f8a3caae2093975057fa98fa1beed46a786036d`; native Node regression suite, TypeScript, lint, build without deployment, disposable Worker/D1 integration, and existing Python validators all reported SUCCESS.

## Exact original defect and correction

The existing authenticated owner CMS accepted a supplied nonblank `upsert-item.id` or `DELETE ?id=` padded with whitespace, then silently called `.trim()` before selecting/mutating D1. For example, `" record "` targeted `"record"`, despite the user having supplied a different literal key. An existing row could therefore be edited or hidden under an aliased identity.

The canonical route now rejects nonblank padded upsert identities and rejects any padded deletion key **before** lookup or write. The existing UUID generation for absent/blank upsert identity remains. Valid exact identities, existing bounds, per-owner authorization, revision history and batch acknowledgement retain the same implementation. No alternate CMS or database was introduced.

Ten additional negative cases in the **existing executed source-linked test suite** cover leading/trailing/surrounded ASCII whitespace, NBSP and newline on both upsert and hide. The existing tests for exact 100-character IDs, oversized IDs, invalid typed IDs and blank-ID behavior remain. Full GitHub Actions exact-PR-head quality suite passed; after merge GitHub readback verified both fixed source/test blobs on `main`.

## Terminal disposition and exclusions

- `remaining_scoped_implementation=0`.
- `necessary_unmerged_scoped_feature_PRs=0` following PR #971 squash merge.
- This is the final approved scope for this particular identity alias; do **not** re-author it absent a new reproduced defect or explicit approved requirement.
- **No** claim of completed SA-EXT-01..20 expansion: parent SA-EXT-03 retains its existing terminal development state; 18 other planned parent sections are still OPEN on the plan's current ledger.
- **No** physical Windows/NVDA acceptance, live Sites/D1 inspection, published website SHA, SMTP verification, owner credentials or release was performed.
- Deployment is a separate release authorization process. No change to production, no rollback action, and no migration executed.

## Central coordination

Report scoped completion in `PROJECT_STATUS.md` and existing coordination issue #297. Retain the existing canonical board #78; do not create a competing board.
