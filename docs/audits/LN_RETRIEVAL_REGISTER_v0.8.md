# LN_RETRIEVAL_REGISTER v0.8

**Date:** 2026-08-19  
**Status:** DEV R05 / independent audit pending

## Whole-pilot retrieval closure
R05 completes developer-side normalization of all 185 LN nodes and removes the two ambiguous R04 pseudo-campaign terminals.

R04 repairs retained:
- `LN02-O01` → `REVIEW_QUEUE PA_CROSS_REFERENCE_REVIEW`.
- `LN03-O01` → `REVIEW_QUEUE CROSS_TESTAMENT_RELATION_REVIEW`.

No R05 canonical node uses an anonymous `later` destination. Every serialized retrieval effect begins with one of:
`RESOLVED_NODE`, `REVIEW_QUEUE`, `DEFERRED_CAMPAIGN`, `RETIRED`.

## High-risk chains retained
- `LN04-N09 [T2+TX1] → LN09-N11 [T1+TX1] → LN12-N08 [T2+TX1]`.
- `LN09-O01 [T1+TX1] → LN12-N10 [T2+TX1]`.
- `LN05-O02 [T1+TX1] → LN12-N10 [T2+TX1]`.
- LN-06 arrest/provenance nodes resolve into `LN12-N04` or named review queues.
- LN-10 authority-handoff nodes resolve into `LN11-N12` or named review queues.
- LN-11 evidence-map nodes resolve into `LN12-N01` or named evidence-map review queues.

## Invariants
1. Retrieval never invents a novel question merely because a wording paraphrase exists.
2. TX1 remains metadata and does not manufacture `VARIANT` status.
3. Witness-local chronology remains witness-local when revisited.
4. H7 guided completion may schedule earlier review but must first reveal answer/evidence.
5. Named review queues are not represented as campaign IDs.

Developer-side D-004 is **candidate-for-closure**, pending independent AUDIT R05 rather than self-declared fixed.