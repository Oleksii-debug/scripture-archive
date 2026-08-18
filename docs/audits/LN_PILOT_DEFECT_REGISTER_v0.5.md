# LN pilot defect register v0.5

**Campaign:** LN — «Остання ніч»  
**Audit phase:** normalization, retrieval closure, variant eligibility, player-memory regression  
**Date:** 2026-08-18  
**Supersedes for current audit work:** `LN_PILOT_DEFECT_REGISTER_v0.4.md` (retained in history)

## Current defect summary

- Critical open: **0**
- High open: **3** (`D-001`, `D-004`, `D-005`)
- Medium open: **1** (`D-002`)
- Medium fixed by specification: **1** (`D-003`)

No critical theological/source-integrity defect has been identified.

## D-001 — Canonical node-record schema not uniformly explicit

**Severity:** HIGH  
**Status:** `OPEN — 31/185 STRUCTURALLY NORMALIZED`

Progress this revision:
- LN-08 repaired in new versioned `LN-08_TESTIMONY_AND_ACCUSATION_v1.1.md`;
- all 16 LN-08 nodes now have stable canonical IDs and explicit identity, learning-purpose, validation, branch, retrieval/mastery and accessibility controls;
- historical LN-08 v1.0 remains preserved;
- LN-08 structural branch reachability passes;
- LN-08 translation-neutral handling passes structurally; no material TX1 grading point exists there.

Cumulative progress:
- LN-07: 15/15 normalized;
- LN-08: 16/16 normalized;
- total: **31/185 = 16.8%**;
- remaining: **154** authored nodes.

**Regression to close:** all 185 nodes explicit under current schema; no dead branches; retrieval/mastery/accessibility fields explicit; version history preserved.

## D-002 — Stable node identifiers inconsistent

**Severity:** MEDIUM  
**Status:** `OPEN — 31/185 STABLE IDS PROVEN`

LN-07 and LN-08 now have complete stable ID sets:
- `LN07-N01…N13`, `LN07-O01/O02`;
- `LN08-N01…N14`, `LN08-O01/O02`.

Campaign-wide proof remains incomplete.

**Regression:** no duplicate canonical ID across all 185 nodes; every retrieval/variant relation resolves uniquely.

## D-003 — Confidence vocabulary ambiguity

**Severity:** MEDIUM  
**Status:** `FIXED_BY_SPEC_v1.2`

Canonical confidence remains `T1/T2/C1/I1/D1`; `TX1` is adjunct only.

## D-004 — Future-retrieval hooks need campaign-wide closure proof

**Severity:** HIGH  
**Status:** `OPEN — LN-07/LN-08 STABLE LINKS PARTIALLY CLOSED`

Progress:
- new `LN_RETRIEVAL_REGISTER_v0.2.md`;
- concrete `LN07-O02 → LN08-N10` daybreak retrieval proven;
- LN-07 provenance/boundary retrieval now lands in stable LN-08 nodes `LN08-O01`/`LN08-N13`;
- LN-08 review queues for temple-saying provenance and translation-neutral weakness are explicit;
- LN-08 downstream hooks to LN-10/LN-11/LN-12 are identified, but exact destination IDs await normalization of those missions.

**Regression:** every non-none hook across all 185 nodes must resolve to `RESOLVED_NODE`, `REVIEW_QUEUE`, `DEFERRED_CAMPAIGN` or `RETIRED` with stable IDs and preserved provenance/confidence/TX1.

## D-005 — Variant relationships incomplete

**Severity:** HIGH  
**Status:** `OPEN — REGISTER EXISTS, FULL CORPUS MAPPING PENDING`

No false novelty introduced during LN-08 repair. Wording-only paraphrase remains EXACT. LN-08 explicitly routes semantic translation weakness and temple-saying provenance weakness to deterministic review queues rather than asking an LLM to invent fresh questions.

**Regression:** five-history player-memory simulation passes against normalized relation data; successful exact tasks do not recur in adjacent daily sessions; weak concepts use only legitimate audited alternatives.

## Passed safeguards retained

- prediction→fulfilment separation with Mark TX1;
- LN-07/LN-08 boundary and Luke daybreak safeguard;
- John 18:19–24 provenance separation from Matthew/Mark false-witness material;
- LN-10/LN-12 Pilate threshold;
- final synthesis provenance/uncertainty;
- novelty guard passes at design level;
- LN-08 semantic answer validation does not require exact translation wording.

## Current closure order

1. normalize LN-04/LN-09 high-risk prediction→fulfilment/TX1 chain;
2. update retrieval register with their exact stable IDs;
3. normalize LN-11/LN-12 synthesis layers;
4. normalize LN-10 and close exact LN08→LN10 daybreak destination;
5. scan/repair remaining missions;
6. complete variant register;
7. dedicated translation/TX1 and NVDA task-family audits;
8. end-to-end branch/reachability regression;
9. rerun five player histories against final normalized retrieval/variant data;
10. close pilot only after all HIGH defects are fixed and MEDIUM defects fixed/accepted.

Do not start PA or mass corpus expansion before closure.