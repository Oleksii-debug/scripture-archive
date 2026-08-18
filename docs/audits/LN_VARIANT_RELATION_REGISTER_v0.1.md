# LN variant relation register v0.1

**Campaign:** LN — «Остання ніч»  
**Audit phase:** player-memory / deduplication / variant eligibility  
**Date:** 2026-08-18  
**Status:** `IN_PROGRESS — RELATION MODEL ESTABLISHED, FULL NODE MAPPING PENDING`

## Purpose

This register defines how authored LN tasks relate to one another for adaptive review. It prevents a paraphrased duplicate from being misclassified as new content and prevents a scheduler from inventing an unreviewed “alternative” when a concept is due.

Canonical relation types:

- `EXACT` — same underlying proposition/evidence boundary and same player action; wording differences alone do not make a new task;
- `VARIANT` — same knowledge target, but a materially different source-audited action or response form;
- `PASSAGE_REVISIT` — same biblical passage is revisited for a different knowledge target;
- `CROSS_CONTEXT` — prior knowledge is required in a later narrative/contextual task;
- `SYNTHESIS` — multiple prior knowledge targets are combined in a reconstruction, comparison or defence;
- `NONE` — no safe alternate relation is currently authored.

## Hard eligibility rules

1. A successful `EXACT` task may not be selected in the adjacent daily session in normal mode.
2. Wording-only paraphrases remain `EXACT`; they are not novelty.
3. `VARIANT` requires a distinct learning action while preserving the same accepted proposition, provenance, confidence code and TX1 qualification where applicable.
4. `PASSAGE_REVISIT` may reuse a passage only when the new task targets a genuinely different question/evidence operation.
5. `CROSS_CONTEXT` is eligible despite exact-node cooldown when the old knowledge is functionally required in a new case and the player action differs.
6. `SYNTHESIS` is eligible when it combines several prior claims and does not merely re-ask one old prompt.
7. If no eligible audited alternative exists, choose other content or end/shorten the narrow session; do not generate novelty through an LLM.

## Registered high-confidence relations

| Relation ID | Origin | Related target | Type | Knowledge target | Evidence/provenance inheritance | Scheduler rule | Regression check |
|---|---|---|---|---|---|---|---|
| LN-V001 | LN04-N02 | LN09-N01 | `CROSS_CONTEXT` | Peter prediction: three denials + rooster marker | preserve Gospel witness scope; Mark wording retains TX1 where applicable | LN09 may retrieve after delay even while LN04 exact prompt is cooling down | LN09 must first retrieve prediction before exposing fulfilment evidence |
| LN-V002 | LN04 prediction corpus | LN09 Gospel-comparison nodes | `VARIANT` | distinguish common prediction core from witness-specific wording | preserve T1/T2 distinction and Mark TX1 | eligible for due/weak review before any exact LN04 repetition | no variant may silently collapse all Gospel wording into one quotation |
| LN-V003 | LN09 denial investigation | LN12 final reconstruction | `SYNTHESIS` | prediction → fulfilment → witness differences → certainty | preserve original witnesses, passages, confidence and TX1 | synthesis is eligible independently of exact-node cooldown | final reconstruction must not grade a harmonized retelling as T1 |
| LN-V004 | LN03 Judas/betrayal evidence | LN06 arrest investigation | `CROSS_CONTEXT` | Judas identity/action and witness provenance | preserve which Gospel explicitly states each detail | eligible as new-case retrieval, not as exact betrayal-table replay | arrest task must use arrest context and must not pretend imported detail is locally explicit |
| LN-V005 | LN06 arrest / Peter-Malchus evidence | LN09 third-denial evidence in John | `CROSS_CONTEXT` | relation among Peter, the ear-cutting episode and later accuser context | preserve John-specific naming/provenance | eligible when it resolves a later evidence link | later task cannot attribute John’s names to Matthew/Mark/Luke |
| LN-V006 | LN07 questioning material | LN08 accusation/testimony material | `PASSAGE_REVISIT` / boundary-controlled | distinguish questioning from false-witness/accusation material | preserve witness and daybreak boundary | same broad scene may recur because knowledge target differs | no duplication of the same legal/chronology proposition under a new label |
| LN-V007 | LN10 morning handoff | LN12 final reconstruction | `SYNTHESIS` | authority handoff to Pilate as campaign endpoint | preserve source boundaries; no later Roman-trial content | eligible as endpoint evidence in synthesis | LN12 must stop at handoff and not import later verdict/interrogation material |
| LN-V008 | any LN11 evidence-map claim | LN12 final defence | `SYNTHESIS` | claim → witness → passage → confidence → qualification | exact provenance required | eligible because LN12 changes action from mapping to defended reconstruction | LN12 cannot merely replay LN11 card-by-card |

## Exact-repeat classification rule

Two authored prompts must be marked `EXACT` if all of the following are unchanged:
- same knowledge target;
- same source/evidence boundary;
- same player operation;
- same accepted proposition;
- same difficulty demand except cosmetic wording;
- no new contextual dependency.

Changing names, sentence order, distractor order or wording does not make a task a `VARIANT`.

## Variant acceptance checklist

A candidate `VARIANT` is valid only if:
- it references a source-audited canonical node or canonical concept;
- it asks a materially different operation (e.g. identify → cite evidence; recall → compare; claim → provenance; chronology → uncertainty defence);
- accepted/rejected answers remain evidence-safe;
- confidence code does not silently upgrade;
- TX1 survives when inherited;
- nonvisual equivalent remains functionally equal;
- cooldown/eligibility is explicitly defined.

## Current gaps

1. Stable full node IDs are not yet normalized across all 185 authored nodes; some table origins therefore remain mission-design references.
2. The register contains only high-confidence cross-mission relations established during the current audit; it is not yet a complete mapping of every possible within-mission relation.
3. Full completion requires the 185-node field-completeness scan and a concept-ID layer so that variants can be grouped without relying on prose similarity.
4. No relation may be used by the future scheduler merely because two prompts look semantically similar; editorial registration is required.

## Closure criterion for D-005

D-005 may be closed only when:
- every normalized node has a concept/knowledge target identity;
- every claimed alternate is classified by one of the canonical relation types;
- no wording-only duplicate is marked `VARIANT`;
- every variant preserves source boundary, confidence and TX1;
- five-history player-memory regression passes with exact-next-day suppression;
- when no valid alternate exists, the scheduler chooses different content instead of fabricating novelty.

Until then this file represents concrete progress, not final closure.