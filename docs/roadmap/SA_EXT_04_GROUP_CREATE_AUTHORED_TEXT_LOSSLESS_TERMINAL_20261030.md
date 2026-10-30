# SA-EXT-04 — GROUP_CREATE_AUTHORED_TEXT_LOSSLESS — scoped terminal receipt (2026-10-30)

**Status:** CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL. **Remaining implementation for this precisely bounded defect:** 0. **Full SA-EXT-04 and all SA-EXT-01…20 parent sections remain OPEN**; this is neither a production-release nor browser/NVDA certificate.

## Proven defect
Canonical `POST /api/groups?action=create` previously passed the owner-authored `name` (100), `church` (160), `country` (80), `city` (80), and `description` (600) through `clean(...).trim().slice(...)`, potentially creating a group with shortened text while returning 201. This silently changed user-provided community content.

## Final integrated implementation
- Existing canonical route `app/api/groups/route.ts` preflights the five normalized authored string limits before the first group, membership, or cohort D1 mutation; oversize input receives `400 invalid_group`.
- Existing owner permissions, privacy, local edition/visibility, invitation and cohort operations are retained; no new backend or schema.
- Regression tests added to the existing `tests/groups-numeric-input-boundary.test.mjs`: five overlong inputs with zero writes, exact-limit persistence for all five authored fields, and harmless whitespace normalization at the 100-character name limit.
- **Source PR:** https://github.com/Oleksii-debug/scripture-archive/pull/641 (SQUASH MERGED).
- **Exact integrated feature main SHA:** `1542ed737a39ad2710021ae380af18ad00f39bb1`.
- **Read-back Git blobs on merged main:** `app/api/groups/route.ts@d8c653cfb2f25c0cc775716305755177506951ce` and `tests/groups-numeric-input-boundary.test.mjs@eb1c59386e0190db53e0c6fa2e98fde20d32b1f6`.

## Executed verification (separate from release acceptance)
- **Exact-head GitHub Actions:** https://github.com/Oleksii-debug/scripture-archive/actions/runs/41042546145 ; commit `a42c67ba924bb58625e57925de534dca60dccd64`; **completed SUCCESS**.
- Independent job log readback: native Node **1517 pass / 0 fail / 1 skip of 1518**; disposable Wrangler Worker/D1 **22/22 pass**; Python **2 passed**; TypeScript, lint and production-source build steps successful. These are CI executions of the exact PR head, not a separately executed local checkout or a deployed instance.
- The merged source and test blob SHAs were read back from GitHub `main`, with merge commit verified. No deployed Sites SHA, browser keyboard/NVDA, real-user mutation, email, scheduler or release has been claimed.

## Remaining approved work
Continue full SA-EXT-04 (group journeys, consent, scheduling, interaction, browser accessibility and hosted acceptance) and other SA-EXT-01…20 parent requirements through the central #297 and #78 controls. The independent Worker reliability issue #618 requires repeated exact-head qualification; one green disposable run is not a blanket reliability guarantee. This *specific* data-loss repair must not be reimplemented without a new reproducible regression or changed approved requirement.
