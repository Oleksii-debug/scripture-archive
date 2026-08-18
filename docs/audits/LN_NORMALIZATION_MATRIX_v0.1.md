# LN normalization matrix v0.1

**Campaign:** LN — «Остання ніч»  
**Date:** 2026-08-18  
**Status:** `IN_PROGRESS — MISSION-LEVEL NORMALIZATION CONTROL SURFACE`

## Purpose

This matrix is the control surface for converting 185 authored v1.0 nodes into normalized canonical records under `CONTENT_NODE_SCHEMA_v1.2` without overwriting historical mission files.

A mission can reach `NORMALIZED_PASS` only after every authored node in that mission has been checked for:

- stable full `node_id`;
- explicit `mission_id`;
- task family / difficulty / required state;
- learning purpose fields;
- prompt / source scope / response mode;
- accepted variants / required evidence / rejected answers;
- canonical `confidence_code` and `textual_variant_flag`;
- feedback and hint fields;
- all branch fields, including explicit `none` where not used;
- mastery and spaced-retrieval fields;
- retrieval closure;
- functional nonvisual equivalent;
- translation-neutral answer validation;
- TX1-before-grading where applicable.

## Mission inventory and current status

| Mission | Authored nodes | Source audit | v1.2 full field scan | Stable IDs | Retrieval closure | Variant mapping | Translation/TX1 | NVDA/nonvisual | Branch regression | Normalization status |
|---|---:|---|---|---|---|---|---|---|---|---|
| LN-01 | 13 + 1 | PASS | PENDING | PENDING | PENDING | PENDING | PENDING | DESIGN_PASS / dedicated audit pending | PENDING | OPEN |
| LN-02 | 12 + 2 | PASS | PENDING | PENDING | PENDING | PENDING | PENDING | DESIGN_PASS / dedicated audit pending | PENDING | OPEN |
| LN-03 | 13 + 2 | PASS | PENDING | PENDING | partial cross-mission registration | partial | PENDING | DESIGN_PASS / dedicated audit pending | PENDING | OPEN |
| LN-04 | 13 + 2 | PASS | PENDING | partial full IDs in audit refs | high-risk chain registered | partial | Mark TX1 design-pass / normalized audit pending | DESIGN_PASS / dedicated audit pending | PENDING | OPEN |
| LN-05 | 13 + 2 | PASS | PENDING | PENDING | PENDING | PENDING | Luke 22:43–44 TX1 design-pass / normalized audit pending | DESIGN_PASS / dedicated audit pending | PENDING | OPEN |
| LN-06 | 14 + 2 | PASS | PENDING | PENDING | partial cross-mission registration | partial | PENDING | DESIGN_PASS / dedicated audit pending | PENDING | OPEN |
| LN-07 | 13 + 2 | PASS | HIGH-risk schema omission sample confirmed | PENDING | PENDING | boundary relation registered | PENDING | DESIGN_PASS / dedicated audit pending | PENDING | REQUIRES_VERSIONED_REPAIR |
| LN-08 | 14 + 2 | PASS | HIGH-risk schema omission sample confirmed | PENDING | PENDING | boundary relation registered | PENDING | DESIGN_PASS / dedicated audit pending | PENDING | REQUIRES_VERSIONED_REPAIR |
| LN-09 | 14 + 2 | PASS | PENDING | partial full IDs in audit refs | high-risk chain registered | partial | Mark TX1 design-pass / normalized audit pending | DESIGN_PASS / dedicated audit pending | PENDING | OPEN |
| LN-10 | 13 + 2 | PASS | PENDING | PENDING | PENDING | synthesis relation registered | PENDING | DESIGN_PASS / dedicated audit pending | PENDING | OPEN |
| LN-11 | 14 + 3 | PASS | PENDING | PENDING | PENDING | synthesis relation registered | PENDING | linear evidence-map design PASS | PENDING | OPEN |
| LN-12 | 14 + 3 | PASS | PENDING | PENDING | post-campaign queues registered | synthesis relations registered | inherited TX1/provenance design-pass | linear final-reconstruction design PASS | PENDING | OPEN |

Total authored: **160 required + 25 optional/conditional = 185**.

## Normalization decision rules

### `OPEN`
Mission is source-audited but has not yet completed every v1.2 control column.

### `REQUIRES_VERSIONED_REPAIR`
Audit already has evidence that v1.0 compact records omit required canonical fields. Create a v1.1-or-later normalized mission file; do not overwrite v1.0.

### `NORMALIZED_PASS`
Every node is explicit under v1.2, retrieval/variant references resolve with stable IDs, translation/TX1 checks pass, accessibility equivalence passes and branch regression reaches completion without dead ends.

## Repair order

1. LN-07 and LN-08 first because the cross-mission audit already identified compact-schema omissions there.
2. LN-04 and LN-09 next because they carry the highest-risk prediction→fulfilment/TX1 retrieval chain.
3. LN-11 and LN-12 next because they synthesize earlier claims and can amplify inherited defects.
4. LN-01–LN-06 and LN-10 complete the corpus scan.

## Audit discipline

- Do not infer `PASS` from good prose alone.
- Do not mark stable IDs complete until every node, including optional/conditional nodes, has a unique canonical full ID.
- Do not mark retrieval complete until every non-none hook is in `LN_RETRIEVAL_REGISTER` with a permitted closure state.
- Do not mark variant mapping complete until every claimed alternate relation is in `LN_VARIANT_RELATION_REGISTER`.
- Do not mark NVDA complete merely because a mission mentions keyboard access; run a task-family audit that proves functional equivalence.
- Do not mark branch regression complete until all required valid routes reach mission completion and no optional branch traps focus/progress.

## Current conclusion

The pilot is correctly held at `PILOT_AUDIT_IN_PROGRESS`. The content itself is authored and source-audited, but the normalization proof is still incomplete. This matrix provides the auditable path to closure and prevents mission-count completion from being confused with canonical readiness.