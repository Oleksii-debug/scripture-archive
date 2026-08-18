# LN pilot defect register v0.3

**Campaign:** LN — «Остання ніч»  
**Audit phase:** normalization, retrieval closure, variant eligibility, player-memory regression  
**Date:** 2026-08-18  
**Supersedes for current audit work:** `LN_PILOT_DEFECT_REGISTER_v0.2.md` (retained in history)

## Current defect summary

- Critical open: **0**
- High open: **3** (`D-001`, `D-004`, `D-005`)
- Medium open: **1** (`D-002`)
- Medium fixed by specification: **1** (`D-003`)

No critical theological/source-integrity defect has been identified in the audited high-risk boundaries.

## D-001 — Canonical node-record schema is not uniformly explicit

**Severity:** `HIGH`  
**Status:** `OPEN — CONTROL MATRIX CREATED`

Progress this revision:
- created `LN_NORMALIZATION_MATRIX_v0.1.md`;
- all 12 missions are now explicitly tracked against v1.2 fields, stable IDs, retrieval, variant mapping, translation/TX1, NVDA and branch regression;
- LN-07 and LN-08 remain the first confirmed candidates for versioned normalized repair because compact-record omissions were already observed there.

**Fix required:** complete node-by-node field scan across all 185 authored nodes and create versioned mission revisions where any required v1.2 field is missing.

**Regression:** every canonical field explicit; no branch dead-end; retrieval/mastery/accessibility fields present; historical v1.0 files preserved.

## D-002 — Stable node identifier convention is inconsistent

**Severity:** `MEDIUM`  
**Status:** `OPEN`

Full canonical IDs are still not proven for all 185 nodes, including optional/conditional nodes.

**Fix:** normalize to stable full IDs (`LNxx-Nyy` / stable optional IDs), retain bare Nxx only as aliases.

**Regression:** no duplicate canonical ID; every retrieval/variant relation resolves uniquely.

## D-003 — Confidence vocabulary ambiguity in schema v1.1

**Severity:** `MEDIUM`  
**Status:** `FIXED_BY_SPEC_v1.2`

Canonical `confidence_code` is restricted to `T1/T2/C1/I1/D1`; `TX1` remains an adjunct textual-variant flag.

## D-004 — Future-retrieval hooks need campaign-wide closure proof

**Severity:** `HIGH`  
**Status:** `OPEN — REGISTER STARTED`

`LN_RETRIEVAL_REGISTER_v0.1.md` records the highest-risk chains and queue definitions. Full closure still requires a retrieval-field scan across all 185 nodes.

**Regression:** no anonymous future hook; every non-none hook resolves to `RESOLVED_NODE`, `REVIEW_QUEUE`, `DEFERRED_CAMPAIGN` or `RETIRED`; source/confidence/TX1 survive retrieval.

## D-005 — Variant relationships were not canonically registered

**Severity:** `HIGH`  
**Status:** `OPEN — REGISTER STARTED`

Progress this revision:
- created `LN_VARIANT_RELATION_REGISTER_v0.1.md`;
- canonical relation classes are now explicit: `EXACT`, `VARIANT`, `PASSAGE_REVISIT`, `CROSS_CONTEXT`, `SYNTHESIS`, `NONE`;
- high-confidence cross-mission relations have been registered for prediction→denial fulfilment, Judas→arrest, Peter/Malchus→later denial evidence, questioning→accusation boundary, morning handoff→final reconstruction, and evidence-map→final defence;
- wording-only paraphrases are explicitly forbidden from masquerading as novelty.

Full closure still requires stable IDs and concept identities across all 185 nodes.

**Regression:** re-run five player histories after normalization; successful exact tasks must not recur in adjacent daily sessions; weak concepts use only legitimate audited alternatives; if none exists, select other content rather than fabricate novelty.

## Passed safeguards retained

- prediction→fulfilment separation with Mark TX1;
- LN-07/LN-08 boundary and Luke daybreak safeguard;
- LN-10/LN-12 Pilate threshold;
- final synthesis preserves provenance and uncertainty;
- five-history novelty-guard logic passes at design level, pending normalized relation data.

## Current closure order

1. node-by-node v1.2 scan, beginning with LN-07/LN-08;
2. stable ID normalization;
3. complete retrieval register;
4. complete variant relation register;
5. translation-neutral/TX1 audit;
6. dedicated NVDA/nonvisual task-family audit;
7. branch/reachability regression;
8. five-history player-memory regression against normalized data;
9. close `PILOT_AUDIT_COMPLETE` only when all HIGH defects are fixed and MEDIUM defects are fixed or explicitly accepted.

Do not begin PA migration or large-scale corpus expansion before closure.