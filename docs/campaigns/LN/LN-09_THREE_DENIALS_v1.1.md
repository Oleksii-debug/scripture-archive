# LN-09 — Три зречення — v1.1 normalization

**Status:** `MISSION_COMPLETE / SOURCE_AUDITED / STRUCTURAL_NORMALIZATION_PASS`  
**Schema:** `CONTENT_NODE_SCHEMA v1.2`  
**Version:** 1.1 — 2026-08-19  
**Historical source preserved:** `LN-09_THREE_DENIALS_v1.0.md`

## Mission record
- `mission_id`: `LN-09`
- `campaign_id`: `LN`
- `title`: `Три зречення`
- `mission_role`: prediction→fulfilment investigation / witness provenance / delayed retrieval
- `estimated_time`: retained from v1.0
- `difficulty`: retained from v1.0
- `learning_objectives`: retained from source-audited v1.0; normalization adds no new answer-bearing claim.
- `mastery_tags`: retained from v1.0 plus explicit retrieval/TX1 control below.
- `retrieval_targets`: explicit node relations below.
- `future_repetition_hooks`: every hook resolves to a concrete node or named REVIEW_QUEUE.
- `primary_scripture`: Matthew 26:69–75; Mark 14:66–72; Luke 22:54–62; John 18:15–18,25–27.
- `secondary_scripture`: John 18:10; inherited LN-04 prediction record.
- `historical_context_sources`: none for grading.
- `interpretive_sources`: none for grading.
- `source_classification_notes`: local witness=T1; direct cross-witness comparison=T2; forced merged precision=D1.
- `disputed_points`: exact merged chronology/provenance is not upgraded beyond sources.
- `textual_variant_points`: Mark 14:68,72 rooster wording `TX1`; note visible before grading.
- `opening_brief`, `case_question`, `known_facts_at_start`, `unknowns_to_resolve`, `completion_synthesis`: source-audited v1.0 substance retained.
- `entry_node`: `LN09-N01`
- `task_nodes`: `LN09-N01` through `LN09-N14`
- `optional_nodes`: `LN09-O01`, `LN09-O02`
- `failure_recovery_routes`: source-specific remediation returns to current node; no dead ends.
- `completion_conditions`: all required nodes + final synthesis.
- `perfect_investigation_conditions`: independent high-value evidence/synthesis nodes; never spiritual-status scoring.

## Stable migration and inherited-content contract
`LN-09_THREE_DENIALS_v1.0.md` remains the immutable source-audited prose. Required/optional historical labels map to the stable IDs below. For **every row**, the v1.2 fields `skill_target`, `knowledge_target`, `why_this_node_exists`, `player_prompt`, `source_scope_visible_to_player`, `response_mode`, `accepted_answer`, `accepted_variants`, `required_evidence`, `rejected_answers`, `rejection_reason`, `success_feedback`, `partial_feedback`, `failure_feedback`, and `hints` are the corresponding source-audited v1.0 values identified by `source_alias`; semantic/translation-equivalent answers remain accepted. This follows the existing LN-07/LN-08 normalization pattern and does not replace audited prose with new wording.

The following per-node fields are canonical overrides/normalizations. `on_partial=return_to_current_node`, `on_incorrect=return_to_current_node_after_source_remediation`, `mastery_mode=independent unless H6/H7/answer reveal => guided`, `spaced_retrieval=yes`, and `functional_nonvisual_equivalent=keyboard-complete linear text/control flow with spoken source/result/confidence/TX1/mastery state` apply explicitly to every row.

| node_id | source_alias | family | diff | req | confidence_code | TX | on_correct | optional unlock | later_retrieval_effect | mastery_domains | evidence_strength |
|---|---|---|---:|---|---|---|---|---|---|---|---|
| `LN09-N01` | `N01` | delayed retrieval | 3/6 | yes | `T2` | `none` | `LN09-N02` | `none` | `RESOLVED_NODE LN09-N13` | prediction-to-fulfilment; recall | recall |
| `LN09-N02` | `N02` | source selection | 1/6 | yes | `T1` | `none` | `LN09-N03` | `none` | `REVIEW_QUEUE LN_DENIAL_SOURCE_DELIMITATION_REVIEW` | source-citation | recognition |
| `LN09-N03` | `N03` | prediction-to-fulfilment comparison | 3/6 | yes | `T2` | `none` | `LN09-N04` | `none` | `RESOLVED_NODE LN09-N13` | prediction-to-fulfilment | application |
| `LN09-N04` | `N04` | witness-provenance classification | 3/6 | yes | `T2` | `none` | `LN09-N05` | `none` | `RESOLVED_NODE LN09-N13` | witness-provenance | application |
| `LN09-N05` | `N05` | close-reading comparison | 3/6 | yes | `T2` | `none` | `LN09-N06` | `none` | `RESOLVED_NODE LN09-N13` | wording-vs-proposition | application |
| `LN09-N06` | `N06` | witness-provenance comparison | 4/6 | yes | `T2` | `none` | `LN09-N07` | `none` | `RESOLVED_NODE LN09-N13` | witness-provenance | application |
| `LN09-N07` | `N07` | evidence-reason comparison | 4/6 | yes | `T2` | `none` | `LN09-N08` | `LN09-O02` | `RESOLVED_NODE LN09-N13` | evidence-linking; provenance | application |
| `LN09-N08` | `N08` | local chronology reconstruction | 3/6 | yes | `T1` | `none` | `LN09-N09` | `none` | `REVIEW_QUEUE LN_LOCAL_CHRONOLOGY_REVIEW` | local-chronology | application |
| `LN09-N09` | `N09` | witness-specific detail extraction | 3/6 | yes | `T1` | `none` | `LN09-N10` | `none` | `RESOLVED_NODE LN09-N13` | Luke-detail; provenance | recall/application |
| `LN09-N10` | `N10` | cross-mission retrieval/evidence linking | 4/6 | yes | `T2` | `none` | `LN09-N11` | `LN09-O02` | `REVIEW_QUEUE LN_PETER_PROVENANCE_REVIEW` | cross-mission retrieval; John-provenance | application |
| `LN09-N11` | `N11` | textual-variant-in-play | 5/6 | yes | `T1` | `TX1` | `LN09-N12` | `LN09-O01` | `RESOLVED_NODE LN12-N08` | textual-variants; translation-neutrality | application |
| `LN09-N12` | `N12` | post-event witness comparison | 4/6 | yes | `T2` | `none` | `LN09-N13` | `none` | `RESOLVED_NODE LN09-N14` | witness-provenance | application/synthesis |
| `LN09-N13` | `N13` | structured synthesis | 5/6 | yes | `T2` | `TX1` | `LN09-N14` | `LN09-O01; LN09-O02` | `RESOLVED_NODE LN12-N08` | prediction-to-fulfilment; textual-variants | synthesis |
| `LN09-N14` | `N14` | final case synthesis | 5/6 | yes | `T2` | `TX1` | `mission_complete` | `LN09-O01; LN09-O02` | `RESOLVED_NODE LN12-N08` | source-citation; Gospel-parallels; prediction-to-fulfilment; textual-variants | synthesis |
| `LN09-O01` | `N15` | optional textual-criticism evidence | 5/6 | no | `T1` | `TX1` | `return_to_required_path` | `none` | `RESOLVED_NODE LN12-N10` | textual-variants | application |
| `LN09-O02` | `N16` | knowledge-boundary check | 4/6 | no | `T1` | `none` | `return_to_required_path` | `none` | `REVIEW_QUEUE LN_UNNAMED_PERSON_BOUNDARY_REVIEW` | explicit-vs-inferred; provenance | application |

## Branch/accessibility contract
- `on_hint_threshold`: H7 completes only as guided and then follows `on_correct`; H1–H6 preserve the v1.0 ladder.
- optional nodes always return to the active required path/evidence archive.
- no answer-bearing information depends on color, drag, pointer, spatial layout or time limit.
- comparisons have the canonical linear form `witness → claim → passage → confidence → qualification`.
- feedback announces evidence relation and mastery consequence; it never evaluates faith/holiness.

## Structural validation
- stable IDs: 16/16 unique;
- branch fields: explicit through row + shared contract;
- every `later_retrieval_effect`: `RESOLVED_NODE` or `REVIEW_QUEUE`;
- v1.0 answer-bearing claims unchanged;
- production code: none.

## Exact Mark TX1 chain
`LN04-N09 → LN09-N11 → LN12-N08`; `LN09-N13/N14 → LN12-N08`; optional `LN09-O01 → LN12-N10`. Mark 14:68 first-crow variation remains visible; no originality verdict is required.
