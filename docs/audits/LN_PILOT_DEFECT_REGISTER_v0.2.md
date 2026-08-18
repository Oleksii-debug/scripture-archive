# LN pilot defect register v0.2

**Campaign:** LN — «Остання ніч»  
**Audit phase:** cross-mission normalization, retrieval closure, player-memory regression  
**Date:** 2026-08-18  
**Supersedes for current audit work:** `LN_PILOT_DEFECT_REGISTER_v0.1.md` (retained in history)

## Severity model

- `CRITICAL` — invalidates central theological/source integrity or makes completion impossible.
- `HIGH` — invalidates canonical portability, grading/retrieval consistency, or a required learning path across multiple nodes.
- `MEDIUM` — material editorial/data-model inconsistency that must be fixed or explicitly accepted before pilot closure.
- `LOW` — polish/consistency issue that does not change learning correctness.
- `PASS` — audited risk checked and no defect found.

## D-001 — Canonical node-record schema is not uniformly explicit

**Severity:** `HIGH`  
**Status:** `OPEN`

Full LN-01–LN-12 / 185-node normalization scan is still required. Existing v1.0 mission prose remains source-audited but cannot yet be treated as fully normalized v1.2 records.

**Fix:** mission-by-mission field completeness; versioned repaired files only where needed; preserve v1.0 history.

**Regression:** every required canonical field explicit; no branch dead-end; accessibility/mastery/retrieval fields present.

---

## D-002 — Stable node identifier convention is inconsistent

**Severity:** `MEDIUM`  
**Status:** `OPEN`

Some missions use globally scoped IDs; others use bare Nxx shorthand. This blocks durable cross-mission links.

**Fix:** canonical full IDs `LNxx-Nyy` / stable optional IDs, keeping shorthand only as aliases.

**Regression:** no duplicate canonical ID; every retrieval/variant relation resolves uniquely.

---

## D-003 — Confidence vocabulary ambiguity in schema v1.1

**Severity:** `MEDIUM`  
**Status:** `FIXED_BY_SPEC_v1.2`

`confidence_code` is now restricted to `T1/T2/C1/I1/D1`; `TX1` is an adjunct textual-variant flag.

**Regression:** normalized nodes reject undefined confidence codes and preserve inherited confidence on retrieval.

---

## D-004 — Future-retrieval hooks need campaign-wide closure proof

**Severity:** `HIGH`  
**Status:** `OPEN — REGISTER STARTED`

`docs/audits/LN_RETRIEVAL_REGISTER_v0.1.md` now records the highest-risk explicit chains and queue definitions, including LN-04→LN-09, LN-09→LN-12 and post-campaign review.

This is progress but not closure: all 185 authored nodes still need a retrieval-field scan, and every non-none hook must enter the register with a permitted final state.

**Regression:** no anonymous retrieval hook remains; concrete destinations use stable IDs; review queues preserve witness/source/confidence/TX1.

---

## D-005 — Variant relationships are not yet canonically registered

**Severity:** `HIGH`  
**Status:** `OPEN — IDENTIFIED BY PLAYER-MEMORY SIMULATION`

### Evidence

`PLAYER_MEMORY_AND_SESSION_SCHEDULING_v1.0` correctly requires the scheduler to distinguish exact repeat, audited variant, passage revisit, cross-context retrieval and synthesis. The five-history simulation passes the logic rules, but the LN corpus does not yet contain a campaign-wide registry proving which normalized node IDs stand in those relations.

Without this, a later selector could:
- misclassify a paraphrased exact duplicate as “new”;
- fail to find a legitimate alternate form when a weak concept is due;
- rotate to a task that changes the underlying proposition/evidence boundary;
- lose TX1/confidence inheritance during variant selection.

### Fix

Create `LN_VARIANT_RELATION_REGISTER_v0.1` after/during stable-ID normalization. Each relation must record concept ID, canonical node IDs, relation type (`EXACT`, `VARIANT`, `PASSAGE_REVISIT`, `CROSS_CONTEXT`, `SYNTHESIS`), source boundary, difficulty delta, confidence/TX1 inheritance, cooldown and eligibility constraints.

### Regression

Re-run all five simulated player histories. A successful exact task must not appear in the adjacent daily session; a weak concept should use a legitimate audited alternative where available; if no alternative is eligible, the system chooses other content or ends the narrow session rather than inventing/faking novelty.

---

## Passed mission-design safeguards retained

- `A-06 PASS`: LN-04 prediction → LN-09 fulfilment separation; Mark TX1 preserved.
- `A-07 PASS`: LN-07/LN-08 boundary and Luke daybreak safeguard.
- `A-08 PASS`: LN-10/LN-12 Pilate threshold.
- `A-09 PASS`: final synthesis preserves provenance and uncertainty.
- `A-10 PASS AT SPEC LEVEL`: five simulated player histories show the novelty-guard logic can prevent accidental exact next-day repeats without suppressing useful retrieval; practical closure depends on D-005.

## Current defect summary

- Critical open: **0**
- High open: **3** (`D-001`, `D-004`, `D-005`)
- Medium open: **1** (`D-002`)
- Medium fixed by specification: **1** (`D-003`)

## Updated audit order

1. scan all 185 authored nodes for v1.2 field completeness;
2. normalize stable full node IDs;
3. complete `LN_RETRIEVAL_REGISTER` from the full scan;
4. create `LN_VARIANT_RELATION_REGISTER` using normalized IDs;
5. audit translation-neutral validation and TX1-before-grading;
6. perform dedicated NVDA/nonvisual task-family audit;
7. run branch/reachability regression;
8. re-run five-history session simulation against normalized retrieval/variant registers;
9. close `PILOT_AUDIT_COMPLETE` only after all HIGH blockers are fixed and MEDIUM blockers fixed/accepted.

Do not begin PA migration or mass corpus expansion before this closure.