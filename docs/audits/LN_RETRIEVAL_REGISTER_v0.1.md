# LN retrieval register v0.1

**Campaign:** LN — «Остання ніч»  
**Audit phase:** retrieval closure / player-memory integration  
**Date:** 2026-08-18  
**Status:** `IN_PROGRESS — EXPLICIT CHAINS REGISTERED, FULL NODE SCAN PENDING`

## Purpose

This register is the single campaign-level proof surface for authored future-retrieval promises. It connects mission-authored hooks to either a concrete later canonical node or a deterministic review queue compatible with `PLAYER_MEMORY_AND_SESSION_SCHEDULING_v1.0`.

Allowed closure states:
- `RESOLVED_NODE`
- `REVIEW_QUEUE`
- `DEFERRED_CAMPAIGN`
- `RETIRED`

`UNRESOLVED` is permitted only while this audit is in progress and blocks `PILOT_AUDIT_COMPLETE`.

## Registered explicit chains

| Hook ID | Origin | Knowledge / mastery target | Destination | Closure status | Player-memory rule | Regression requirement |
|---|---|---|---|---|---|---|
| LN-R001 | LN04-N01 | distinguish prediction corpus from later fulfilment corpus | LN09-N02 source-selection / LN09 prediction→fulfilment sequence | `RESOLVED_NODE` | failed source delimitation enters weak/source-citation state; no successful exact repeat next day | LN-09 must not reveal fulfilment before prediction retrieval |
| LN-R002 | LN04-N02 | common-core prediction: Peter + three denials + rooster marker | LN09-N01 | `RESOLVED_NODE` | concept is due for delayed recall; exact LN04-N02 prompt stays under cooldown | LN09-N01 must test recall before fulfilment corpus is opened |
| LN-R003 | LN04 prediction chain | Mark second-crow wording + `TX1` qualification | LN09 Mark comparison / final synthesis | `RESOLVED_NODE` | textual-variant flag survives retrieval; responsible translation cannot be marked wrong | TX1 must be visible before affected grading |
| LN-R004 | LN03 betrayal trajectory | Judas identity/departure and witness provenance | LN06 arrest/betrayal investigation | `RESOLVED_NODE` at mission-design level; exact destination node normalization pending | retrieve concept through new arrest context, not exact LN03 prompt | source provenance must remain witness-specific |
| LN-R005 | LN09-N01 | weak recall of prediction before fulfilment | LN09-N13 synthesis | `RESOLVED_NODE` | weakness is eligible for same-mission synthesis after remediation; no uncontrolled immediate exact repeat | N13 must consume the concept through synthesis rather than verbatim repetition |
| LN-R006 | LN09 denial-fulfilment mastery | Peter prediction→fulfilment relation | LN12 final reconstruction / defence | `RESOLVED_NODE` at mission-design level; stable destination node normalization pending | later synthesis may retrieve the concept regardless of exact-node cooldown because task action/context differs | final reconstruction must preserve prediction and fulfilment as separate evidence layers |
| LN-R007 | LN09 witness-specific denial details | later Gospel-parallel use | campaign review queue until named later campaign/node exists | `REVIEW_QUEUE` | schedule only when due/weak; prefer a source-audited variant or cross-context task | no anonymous “later” wording at pilot closure |
| LN-R008 | LN12 post-campaign weak claims | any mastery dimension failing final reconstruction | `LN_POST_CAMPAIGN_REVIEW` queue | `REVIEW_QUEUE` | queue stores concept/source/confidence/TX1 and due state; exact task remains subject to cooldown | review must preserve original provenance and confidence code |
| LN-R009 | LN12 mastered claims | long-term retention after pilot | `LN_LONG_TERM_REVIEW` queue | `REVIEW_QUEUE` | spaced review after stability interval; preferential variant rotation; never repeat only because pool is small | successful exact node cannot recur in adjacent daily sessions |

## Queue definitions

### `LN_POST_CAMPAIGN_REVIEW`
For knowledge that remains `LEARNING`, `REVIEW_DUE` or `LAPSED` after mission completion. Required payload:
- concept ID / temporary normalized concept label;
- originating node ID;
- witness/source passage;
- confidence code;
- TX1 flag if any;
- last result and hint level;
- due state;
- eligible audited variants if known.

### `LN_LONG_TERM_REVIEW`
For `STABLE` / `MASTERED_FOR_NOW` knowledge. Exact-node repetition is suppressed until cooldown permits it; another audited variant, passage revisit or synthesis task is preferred.

## Important distinction

A campaign hook is editorial content logic. A player review entry is personal state. One authored hook can create different review timing for different players. The LLM is never the authority deciding whether a hook is due or whether an exact task is still in cooldown.

## Current gaps

1. This register closes the high-risk chains already explicit in mission design but is not yet a proof that all 185 authored nodes have been scanned.
2. LN03→LN06 and LN09→LN12 are resolved at mission-design level but need stable destination node IDs during schema-v1.2 normalization.
3. Many v1.0 node records use compact `mastery` / `later retrieval` prose; each must be inspected and either mapped here or explicitly recorded as `none`.
4. Canonical variant IDs do not yet exist for every concept that requests variant rotation.

## Closure criterion for D-004

D-004 may be closed only when:
- all 185 authored nodes have a retrieval-field completeness result;
- every non-`none` hook appears in this register;
- every hook is `RESOLVED_NODE`, `REVIEW_QUEUE`, `DEFERRED_CAMPAIGN` or `RETIRED`;
- every concrete destination uses a stable full node ID;
- the five-history player-memory regression passes after normalized variant eligibility is defined.

Until then D-004 remains `OPEN`, with this register representing concrete progress rather than final closure.