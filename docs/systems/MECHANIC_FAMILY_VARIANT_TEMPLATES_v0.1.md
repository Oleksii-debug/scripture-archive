# MECHANIC_FAMILY_VARIANT_TEMPLATES v0.1

**Date:** 2026-08-19  
**Status:** `SYSTEM BASELINE / SOURCE-AUDIT REQUIRED PER INSTANCE`  
**Depends on:** `TASK_VARIANT_MASTERY_ACCESSIBILITY_MATRIX_v0.1.md`, `PLAYER_MEMORY_AND_SESSION_SCHEDULING_v1.0.md`

## Global invariant
A template generates a *candidate operation*, never a new biblical fact. Every instantiated variant must have a stable authored ID, a material fingerprint difference, independent source audit, explicit mastery effect, deterministic eligibility/cooldown and a complete keyboard/NVDA equivalent. Wording-only paraphrase is `EXACT`, not `VARIANT`.

### T-SOURCE — Source selection family
- safe transforms: select source unit from distractor passages; identify missing witness; delimit pre-event vs event corpus.
- material fingerprint delta required: source-set boundary or evidence operation must differ.
- permitted relations: VARIANT, PASSAGE_REVISIT, CROSS_CONTEXT.
- forbidden fake variant: same four citations with reordered options or paraphrased prompt.
- accessibility: labelled checkbox list; selected count and each checked state announced.
- real records: `LN04-N01` source prediction corpus → `LN09-N02` fulfilment corpus is CROSS_CONTEXT; `PA02-N02` is a distinct Acts witness corpus.

### T-PROV — Witness/provenance family
- safe transforms: claim→witness, witness→claim, narrator-vs-speech classification, identify imported detail, “not stated in cited witness”.
- material delta: different evidence relationship or source unit, not option order.
- permitted relations: VARIANT, PASSAGE_REVISIT, CROSS_CONTEXT, SYNTHESIS.
- forbidden: asking the same witness mapping with different nouns.
- accessibility: one witness heading at a time; linear `claim → witness → passage → confidence`.
- real records: `LN09-N04/N06/N07`, `PA01-N05`, `PA02-N11/N12/N13`.

### T-CHRON — Chronology/local-order family
- safe transforms: reconstruct explicit local order; classify local vs merged chronology; identify what a witness does not time.
- material delta: local sequence vs cross-witness uncertainty is a different operation.
- permitted: VARIANT, PASSAGE_REVISIT, SYNTHESIS.
- forbidden: reorder same items with new labels.
- accessibility: numbered positions and move-up/down; no drag-only timeline.
- real records: `LN04-N08`, `LN09-N08`, `PA02-N04/N05`.

### T-QUOTE — Quotation/allusion/cross-reference family
- safe transforms: identify explicit quoted source; isolate the portion reused; classify relation `EXPLICIT_QUOTATION`, `ALLUSION_STRONG`, etc.
- material delta: source-relation classification must differ from simple citation recall.
- permitted: VARIANT, CROSS_CONTEXT, SYNTHESIS.
- forbidden: promote traditional association to explicit quotation.
- accessibility: source A and B as sequential text blocks; relation spoken literally.
- real record: `LN04-O01` Zech 13:7 ↔ Mt 26:31 / Mk 14:27.

### T-TX — Textual-variant awareness family
- safe transforms: show variant note before response; ask which forms are accepted; audit a synthesis for hidden TX1; classify TX1 separately from confidence.
- material delta: policy application vs source-wording comparison may be VARIANT; a prompt-only rewrite is EXACT.
- permitted: VARIANT, CROSS_CONTEXT, SYNTHESIS.
- forbidden: make player guess preferred translation; treat TX1 as T1/T2 replacement; hide note until after grading.
- accessibility: literal `TX1` + plain-language note before affected control; never icon/color-only.
- real chain: `LN04-N09 → LN09-N11 → LN12-N08`; optional `LN09-O01 → LN12-N10`.

### T-SYNTH — Evidence synthesis family
- safe transforms: claim→source→confidence→qualification record; prediction→fulfilment delta; final multi-witness reconstruction.
- material delta: must combine multiple prior targets into a new evidence product.
- permitted: SYNTHESIS, CROSS_CONTEXT.
- forbidden: longer prose version of a single earlier answer.
- accessibility: repeatable linear records; no required evidence-board geometry.
- real records: `LN09-N13/N14`, `LN12-N08`, `PA02-N13/N14`.

## Deterministic candidate contract
Each candidate exposes:
- `relation_class`;
- `source_units`;
- `knowledge_target`;
- `evidence_operation`;
- `required_proposition_set`;
- `response_mode_family`;
- `provenance_confidence_target`;
- `cooldown_eligibility`;
- `source_audit_status`;
- `nonvisual_equivalent`.

If all material fingerprint fields match a recent successful task, relation=`EXACT` and normal adjacent-session eligibility=`false`.

## Player-history rerun against real LN + PA records

### H-A — strong continuous player
Recent success: `LN04-N02` independently correct yesterday; `PA01-N04` also stable.
- reject: paraphrased `LN04-N02` (`EXACT`, adjacent-session cooldown).
- eligible narrative retrieval: `LN09-N01` because it is `CROSS_CONTEXT` delayed recall before fulfilment.
- eligible continuation: `PA02-N01` consumes PA01-N04 in a new narrative context.
- next-session result: continuation/cross-context preferred; no exact Peter-prediction duplicate.

### H-B — weak evidence-provenance player
History: facts remembered, but repeated witness/source misattribution in LN09.
- raise priority: `LN09-N04`, `LN09-N06`, `LN09-N07` remediation or due review; later `PA02-N13` when prerequisites are met.
- do not repeat: unrelated mastered detail such as `PA01-N03` merely because PA is active.
- expected reason codes: `WEAK` for provenance, then `CONTINUE_CAMPAIGN`/`CROSS_LINK`.

### H-C — hint-dependent player
History: H6/H7 used on `PA02-N07` auditory boundary.
- mastery_mode becomes guided; target enters `PA_DAMASCUS_AUDITORY_BOUNDARY_REVIEW`.
- do not immediately issue wording-paraphrase of N07.
- preferred later retrieval: audited boundary operation through `PA02-O02` if unlocked, or source-provenance synthesis `PA02-N13` after prerequisites.
- feedback remains evidence-based and non-punitive.

### H-D — returning after 30+ days
History: LN prediction/TX1 and PA pre-journey objective previously stable, long absence.
- sample due items rather than dumping all overdue content.
- safe sequence example: one due provenance/TX1 check → `PA02-N01` cross-context recall → campaign continuation.
- exact recently revalidated task receives new cooldown; session still contains new/continuation content.

### H-E — small eligible pool
History: player exhausted audited rooster variants and succeeds independently.
- reject AI-generated rewording of `LN04-N09`/`LN09-N11` as novelty (`EXACT`).
- choose other eligible content such as PA campaign, another due domain, or offer explicit `USER_SELECTED_REVIEW`.
- if no eligible item exists, end/shorten the session rather than fabricate a variant.

## Simulation verdict
All five histories produce a deterministic eligible choice without fabricated novelty. The exact-repeat guard, provenance weakness, guided mastery, long-absence sampling and small-pool fallback are compatible with real normalized LN04/LN09 and authored PA01/PA02 records.

## NVDA acceptance
Every template has a canonical linear representation and keyboard-complete control. A variant fails acceptance if the visual form adds answer-bearing information not present in the linear representation.
