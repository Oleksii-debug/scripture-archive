# LN normalization matrix v0.2

**Campaign:** LN — «Остання ніч»  
**Date:** 2026-08-18  
**Status:** `IN_PROGRESS — LN-07 STRUCTURAL REPAIR COMPLETE`  
**Supersedes for current audit work:** `LN_NORMALIZATION_MATRIX_v0.1.md` (retained in history)

## Purpose
Track conversion of all 185 authored v1.0 nodes into schema-v1.2 canonical records without overwriting history.

## Mission inventory

| Mission | Authored nodes | Source audit | v1.2 field scan | Stable IDs | Retrieval closure | Translation/TX1 | NVDA/nonvisual | Branch regression | Current status |
|---|---:|---|---|---|---|---|---|---|---|
| LN-01 | 13+1 | PASS | PENDING | PENDING | PENDING | PENDING | design pass / dedicated pending | PENDING | OPEN |
| LN-02 | 12+2 | PASS | PENDING | PENDING | PENDING | PENDING | design pass / dedicated pending | PENDING | OPEN |
| LN-03 | 13+2 | PASS | PENDING | PENDING | partial | PENDING | design pass / dedicated pending | PENDING | OPEN |
| LN-04 | 13+2 | PASS | PENDING | partial | high-risk chain registered | Mark TX1 design pass / normalized pending | design pass / dedicated pending | PENDING | OPEN |
| LN-05 | 13+2 | PASS | PENDING | PENDING | PENDING | Luke 22:43–44 TX1 design pass / normalized pending | design pass / dedicated pending | PENDING | OPEN |
| LN-06 | 14+2 | PASS | PENDING | PENDING | partial | PENDING | design pass / dedicated pending | PENDING | OPEN |
| **LN-07** | **13+2** | **PASS** | **STRUCTURAL PASS v1.1** | **PASS — 15/15 stable IDs** | **partial concrete closure added** | **structural PASS; no material TX1** | **design PASS / dedicated task-family audit pending** | **structural reachability PASS; end-to-end pending** | **REPAIRED — NOT YET FINAL NORMALIZED_PASS** |
| LN-08 | 14+2 | PASS | HIGH-risk omission confirmed | PENDING | PENDING | PENDING | design pass / dedicated pending | PENDING | REQUIRES_VERSIONED_REPAIR |
| LN-09 | 14+2 | PASS | PENDING | partial | high-risk chain registered | Mark TX1 design pass / normalized pending | design pass / dedicated pending | PENDING | OPEN |
| LN-10 | 13+2 | PASS | PENDING | PENDING | PENDING | PENDING | design pass / dedicated pending | PENDING | OPEN |
| LN-11 | 14+3 | PASS | PENDING | PENDING | PENDING | PENDING | linear evidence-map design PASS | PENDING | OPEN |
| LN-12 | 14+3 | PASS | PENDING | PENDING | post-campaign queues registered | inherited TX1/provenance design pass | linear final-reconstruction design PASS | PENDING | OPEN |

Total authored: **185**.

## LN-07 repair evidence

Created `docs/campaigns/LN/LN-07_ANNAS_CAIAPHAS_NIGHT_QUESTIONING_v1.1.md`.

Confirmed in v1.1:
- 13 required nodes use stable `LN07-N01`…`LN07-N13` IDs;
- historical optional N14/N15 map to `LN07-O01`/`LN07-O02` without deletion;
- mission-level v1.2 fields are explicit;
- each node has explicit identity, branching, retrieval/mastery and nonvisual control fields;
- no material TX1 grading point exists in LN-07;
- witness-specific translation-neutral answer policy is preserved;
- required route reaches synthesis and optional nodes return without trapping progress.

LN-07 is **not** marked final `NORMALIZED_PASS` yet because the dedicated campaign-wide NVDA audit, full retrieval register closure, variant eligibility closure and end-to-end branch regression are still pending.

## Remaining repair order

1. LN-08 versioned structural repair.
2. LN-04/LN-09 high-risk prediction→fulfilment/TX1 chain.
3. LN-11/LN-12 synthesis layers.
4. Remaining missions.
5. Dedicated NVDA, translation/TX1 and branch regression across the normalized corpus.

## Audit conclusion

D-001 has moved from a sampled problem to one demonstrated repair: **15 of 185 nodes now have a versioned schema-v1.2 structural normalization record in LN-07**. Campaign-wide closure remains blocked until the remaining 170 nodes are scanned/repaired as required.