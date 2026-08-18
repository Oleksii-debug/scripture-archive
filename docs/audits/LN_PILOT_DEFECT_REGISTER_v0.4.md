# LN pilot defect register v0.4

**Campaign:** LN — «Остання ніч»  
**Audit phase:** normalization, retrieval closure, variant eligibility, player-memory regression  
**Date:** 2026-08-18  
**Supersedes for current audit work:** `LN_PILOT_DEFECT_REGISTER_v0.3.md` (retained in history)

## Current defect summary

- Critical open: **0**
- High open: **3** (`D-001`, `D-004`, `D-005`)
- Medium open: **1** (`D-002`)
- Medium fixed by specification: **1** (`D-003`)

No critical theological/source-integrity defect has been identified.

## D-001 — Canonical node-record schema not uniformly explicit

**Severity:** HIGH  
**Status:** `OPEN — 15/185 STRUCTURALLY NORMALIZED`

Progress:
- created versioned `LN-07_ANNAS_CAIAPHAS_NIGHT_QUESTIONING_v1.1.md`;
- all 15 LN-07 nodes now have stable canonical IDs and explicit identity/branch/retrieval/mastery/accessibility controls;
- historical v1.0 remains preserved;
- LN-07 translation/TX1 structure passes; no material TX1 grading point exists there;
- structural branch reachability passes, while dedicated end-to-end regression remains pending.

**Remaining:** 170 authored nodes still need campaign-wide scan/repair as applicable. LN-08 is next confirmed repair target.

**Regression to close:** all 185 nodes explicit under current schema; no dead branches; retrieval/mastery/accessibility fields explicit; version history preserved.

## D-002 — Stable node identifiers inconsistent

**Severity:** MEDIUM  
**Status:** `OPEN — LN-07 FIXED LOCALLY`

LN-07 now has 15/15 stable IDs: required `LN07-N01…N13`, optional `LN07-O01/O02`. Campaign-wide proof remains incomplete.

**Regression:** no duplicate canonical ID across all 185 nodes; every retrieval/variant relation resolves uniquely.

## D-003 — Confidence vocabulary ambiguity

**Severity:** MEDIUM  
**Status:** `FIXED_BY_SPEC_v1.2`

No change. Canonical confidence remains T1/T2/C1/I1/D1; TX1 is adjunct only.

## D-004 — Future-retrieval hooks need campaign-wide closure proof

**Severity:** HIGH  
**Status:** `OPEN — LN-07 CONCRETE HOOKS NORMALIZED`

LN-07 now explicitly resolves local continuity and provenance-synthesis hooks at mission level and routes weak unresolved mastery to deterministic review queues. Exact later LN-08/LN-11/LN-12 destination IDs still require normalization of those missions and register update.

**Regression:** every non-none hook across all 185 nodes must resolve to RESOLVED_NODE, REVIEW_QUEUE, DEFERRED_CAMPAIGN or RETIRED with stable IDs and preserved provenance/confidence/TX1.

## D-005 — Variant relationships incomplete

**Severity:** HIGH  
**Status:** `OPEN — REGISTER EXISTS, FULL CORPUS MAPPING PENDING`

No false novelty was introduced during LN-07 repair. Wording-only paraphrase remains EXACT. LN-07 variant eligibility will be finalized after concept IDs and cross-mission destinations stabilize.

**Regression:** five-history player-memory simulation passes against normalized relation data; successful exact tasks do not recur in adjacent daily sessions; weak concepts use only legitimate audited alternatives.

## Passed safeguards retained

- prediction→fulfilment separation with Mark TX1;
- LN-07/LN-08 boundary and Luke daybreak safeguard;
- LN-10/LN-12 Pilate threshold;
- final synthesis provenance/uncertainty;
- novelty guard passes at design level.

## Current closure order

1. normalize LN-08 to v1.1;
2. update retrieval register with exact LN-07→LN-08 stable destinations;
3. normalize LN-04/LN-09 high-risk TX1 chain;
4. normalize LN-11/LN-12 synthesis layers;
5. scan remaining missions;
6. dedicated translation/TX1 and NVDA task-family audit;
7. end-to-end branch/reachability regression;
8. rerun five player histories against final normalized retrieval/variant data;
9. close pilot only after all HIGH defects are fixed and MEDIUM defects fixed/accepted.

Do not start PA or mass corpus expansion before closure.