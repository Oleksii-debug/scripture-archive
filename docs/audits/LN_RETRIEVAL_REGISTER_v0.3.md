# LN retrieval register v0.3

**Campaign:** LN — «Остання ніч»  
**Date:** 2026-08-18  
**Status:** `IN_PROGRESS — LN04→LN09 EXACT ANCHORS PARTIALLY CLOSED`  
**Supersedes:** `LN_RETRIEVAL_REGISTER_v0.2.md` for current audit work; v0.2 remains history.

## Purpose
Provide campaign-level proof that every future-retrieval promise resolves to `RESOLVED_NODE`, `REVIEW_QUEUE`, `DEFERRED_CAMPAIGN` or `RETIRED`. `UNRESOLVED` blocks `PILOT_AUDIT_COMPLETE`.

## Newly proven exact links

### LN-R001 — prediction corpus → fulfilment corpus
- origin: `LN04-N01`
- origin task: select the four prediction passages
- destination: `LN09-N02`
- destination task: select the four fulfilment passages
- relation: `CROSS_CONTEXT`
- closure: `RESOLVED_NODE`
- regression rule: LN09 may not reveal fulfilment before the prediction-memory task `LN09-N01`; successful exact LN04 source-selection wording remains under cooldown.
- provenance retained: Mt 26:30–35; Mk 14:26–31; Lk 22:31–34; Jn 13:36–38 are prediction corpus, not fulfilment corpus.

### LN-R002 — common-core prediction → delayed recall
- origin: `LN04-N02`
- destination: `LN09-N01`
- relation: `CROSS_CONTEXT` / delayed retrieval
- closure: `RESOLVED_NODE`
- knowledge target: Peter + three denials + rooster marker as the common core of all four witnesses.
- regression rule: Mark-specific «twice» is not required as common-core wording; it remains separately qualified by `TX1`.
- player-memory rule: exact wording from LN04-N02 stays suppressed; LN09-N01 requires unaided recall first, then source reveal/hints as needed.

## Existing stable links retained from v0.2
- `LN07-O02 → LN08-N10` — Luke 22:66 daybreak boundary.
- `LN07-N12 → LN08-O01 / LN08-N13` — John local transfer/provenance boundary.
- `LN07-N13 → LN08-N13` — anti-false-harmonization retrieval.
- `LN08-N04 → LN_TEMPLE_SAYING_PROVENANCE_REVIEW` — `REVIEW_QUEUE`.
- `LN08-N08 → LN_TRANSLATION_NEUTRAL_REVIEW` — `REVIEW_QUEUE`.
- `LN08-N10 → LN-10` — mission-level destination pending LN-10 normalization.
- `LN08-N09 / LN08-N13 → LN-11` — mission-level synthesis destinations pending LN-11 normalization.
- `LN08-N14 → LN-11 / LN-12` — mission-level synthesis destinations pending normalization.

## TX1 chain status
The Mark rooster chain remains source-audited at mission level but is not yet declared exact-ID closed because every TX1-bearing origin/destination node must be inspected under schema v1.2 before the register assigns final IDs. Required invariant:

`LN-04 Mark prediction TX1 → LN-09 Mark fulfilment TX1 → LN-12 synthesis qualification`

At every hop:
- `confidence_code` remains separate from `textual_variant_flag: TX1`;
- the variant note is visible before affected grading;
- a responsible translation lacking or footnoting second-crow wording is not penalized;
- retrieval never upgrades the textual form to an unqualified universal statement.

## Progress delta in v0.3
- exact cross-mission links newly closed: **2**;
- previously exact links retained: **3 provenance/daybreak links plus review queues**;
- no authored node is newly counted as structurally normalized by this register alone;
- campaign structural-normalization count therefore remains **31/185** until versioned mission normalization is completed.

## Remaining D-004 work
1. Normalize LN-04 and LN-09 under schema v1.2 and close all their non-none `later_retrieval_effect` fields.
2. Normalize LN-11/LN-12 and replace mission-level synthesis destinations with exact stable IDs.
3. Normalize LN-10 and close the exact daybreak destination from `LN08-N10`.
4. Scan the remaining LN missions and classify every hook.
5. Re-run five-history player-memory regression against final retrieval + variant registers.

D-004 remains `HIGH / OPEN`, but the LN04→LN09 prediction-recall entry is no longer anonymous.