# LN retrieval register v0.2

**Campaign:** LN — «Остання ніч»  
**Date:** 2026-08-18  
**Status:** `IN_PROGRESS — LN-07/LN-08 STABLE DESTINATIONS ADDED`  
**Supersedes for current audit work:** `LN_RETRIEVAL_REGISTER_v0.1.md` (retained in history)

## Purpose
Single campaign-level proof that every authored future-retrieval promise resolves to `RESOLVED_NODE`, `REVIEW_QUEUE`, `DEFERRED_CAMPAIGN` or `RETIRED`. `UNRESOLVED` blocks `PILOT_AUDIT_COMPLETE`.

## Registered chains

| Hook ID | Origin | Knowledge / mastery target | Destination | Closure | Player-memory rule | Regression |
|---|---|---|---|---|---|---|
| LN-R001 | LN04-N01 | prediction corpus vs fulfilment corpus | LN09 source-selection / prediction→fulfilment chain | `RESOLVED_NODE` at mission level; exact IDs pending LN-04/LN-09 normalization | weak source delimitation may return; successful exact prompt stays in cooldown | fulfilment may not be revealed before prediction retrieval |
| LN-R002 | LN04-N02 | Peter + three denials + rooster marker | LN09 prediction recall | `RESOLVED_NODE` at mission level; exact origin/destination normalization pending | delayed recall; exact origin prompt suppressed | retrieve prediction before fulfilment corpus |
| LN-R003 | LN04 prediction chain | Mark second-crow wording + TX1 | LN09 Mark comparison / LN12 synthesis | `RESOLVED_NODE` at mission level; exact IDs pending | TX1 survives retrieval | TX1 visible before affected grading |
| LN-R004 | LN03 betrayal trajectory | Judas identity/departure and witness provenance | LN06 arrest investigation | `RESOLVED_NODE` at mission level; exact IDs pending | cross-context, not exact-repeat | provenance stays witness-specific |
| LN-R005 | LN09 prediction recall | weak prediction recall | LN09 synthesis | `RESOLVED_NODE` at mission level; exact IDs pending | remediation through synthesis | no uncontrolled immediate exact repeat |
| LN-R006 | LN09 denial fulfilment | prediction→fulfilment relation | LN12 final reconstruction | `RESOLVED_NODE` at mission level; exact ID pending LN09/LN12 normalization | synthesis eligible despite exact-node cooldown | prediction and fulfilment remain separate evidence layers |
| LN-R007 | LN09 witness-specific denial detail | later parallel review | `LN_POST_CAMPAIGN_REVIEW` | `REVIEW_QUEUE` | due/weak only; prefer audited variant/cross-context | no anonymous later hook |
| LN-R008 | LN12 weak final claims | any weak final mastery | `LN_POST_CAMPAIGN_REVIEW` | `REVIEW_QUEUE` | preserve concept/source/confidence/TX1/due | exact prompt still respects cooldown |
| LN-R009 | LN12 mastered claims | long-term retention | `LN_LONG_TERM_REVIEW` | `REVIEW_QUEUE` | spaced review; variant preferred | no adjacent-day successful exact repeat |
| **LN-R010** | **LN07-O02** | **Luke night-treatment → explicit daybreak boundary** | **LN08-N10** | **`RESOLVED_NODE`** | cross-context retrieval; LN07-O02 exact wording not repeated | LN08-N10 must ask for Luke 22:66 time marker and preserve T1 |
| **LN-R011** | **LN07-N12** | **John local transfer to Caiaphas / boundary before accusation block** | **LN08-O01 and LN08-N13** | **`RESOLVED_NODE`** | provenance is reused in a different task action; no exact LN07 repeat | John 18:19–24 must remain contrast-only, never false-witness source |
| **LN-R012** | **LN07-N13** | **anti-false-harmonization / witness-bounded synthesis** | **LN08-N13** | **`RESOLVED_NODE`** | cross-context provenance classification | Luke/John cannot inherit Matthew/Mark false-witness detail |
| **LN-R013** | **LN08-N04** | **temple-saying provenance weakness** | **LN_TEMPLE_SAYING_PROVENANCE_REVIEW** | **`REVIEW_QUEUE`** | only weak/due; audited alternate form preferred | wording-only paraphrase is not novelty |
| **LN-R014** | **LN08-N08** | **translation-neutral semantic validation weakness** | **LN_TRANSLATION_NEUTRAL_REVIEW** | **`REVIEW_QUEUE`** | semantic variant preferred; exact wording mismatch cannot define failure | responsible translations accepted |
| **LN-R015** | **LN08-N10** | **Luke 22:66 daybreak marker** | **LN-10 chronology work** | **`RESOLVED_NODE` at mission level; exact destination pending LN-10 normalization** | delayed retrieval; exact LN08-N10 prompt in cooldown | preserve T1 daybreak anchor |
| **LN-R016** | **LN08-N09 / LN08-N13** | **shared-core + provenance boundary** | **LN-11 evidence-map synthesis** | **`RESOLVED_NODE` at mission level; exact destination pending LN-11 normalization** | synthesis/cross-context eligible | preserve witness/source/confidence |
| **LN-R017** | **LN08-N14** | **full accusation/provenance synthesis** | **LN-11 / LN-12 synthesis** | **`RESOLVED_NODE` at mission level; exact destinations pending normalization** | synthesis, not exact repeat | final reconstruction must preserve daybreak and witness-specific claims |

## Queue definitions

### `LN_POST_CAMPAIGN_REVIEW`
For `LEARNING`, `REVIEW_DUE` or `LAPSED` knowledge. Payload must preserve concept/source/confidence/TX1, last result/hint, due state and eligible audited variants.

### `LN_LONG_TERM_REVIEW`
For `STABLE`/`MASTERED_FOR_NOW` knowledge. Exact node remains suppressed until cooldown allows; safe audited variant/passsage revisit/synthesis is preferred.

### `LN_TEMPLE_SAYING_PROVENANCE_REVIEW`
For players who merge Matthew 26:61 and Mark 14:58 into one quotation. Review must isolate witnesses before asking for shared core.

### `LN_TRANSLATION_NEUTRAL_REVIEW`
For players who treat responsible translation differences as factual disagreement. Review grades proposition/evidence, not exact English/Ukrainian string.

## Progress proof

Normalized stable-origin coverage now includes all nodes in LN-07 and LN-08: **31 of 185 authored nodes have versioned schema-v1.2 normalization records**. This does not mean all 31 create retrieval hooks; it means their `later_retrieval_effect` fields have been inspected and are explicit.

Concrete stable cross-mission destinations now proven:
- `LN07-O02 → LN08-N10`;
- `LN07-N12/LN07-N13 → LN08-O01/LN08-N13` as provenance/boundary retrieval.

Remaining exact destination work is intentionally deferred only where the destination mission itself has not yet been normalized (notably LN-09/LN-10/LN-11/LN-12).

## D-004 closure criterion
D-004 remains open until all 185 nodes are scanned, every non-none hook is registered with a permitted closure state, every concrete destination uses a stable full ID, and the five-history player-memory regression passes against final normalized variant/retrieval data.