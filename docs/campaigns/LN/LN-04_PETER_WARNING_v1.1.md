# LN-04 — Попередження Петрові — v1.1 normalization

**Status:** `MISSION_COMPLETE / SOURCE_AUDITED / STRUCTURAL_NORMALIZATION_PASS`  
**Schema:** `CONTENT_NODE_SCHEMA v1.2`  
**Version:** 1.1 — 2026-08-19  
**Historical source preserved:** `LN-04_PETER_WARNING_v1.0.md`

## Mission record
- `mission_id`: `LN-04`
- `campaign_id`: `LN`
- `title`: `Попередження Петрові`
- `mission_role`: parallel-witness investigation / prediction evidence / delayed retrieval
- `estimated_time`: retained from v1.0
- `difficulty`: retained from v1.0
- `learning_objectives`: retained from source-audited v1.0; normalization adds no new answer-bearing claim.
- `mastery_tags`: retained from v1.0 plus explicit retrieval/TX1 control below.
- `retrieval_targets`: explicit node relations below.
- `future_repetition_hooks`: every hook resolves to a concrete node or named REVIEW_QUEUE.
- `primary_scripture`: Matthew 26:30–35; Mark 14:26–31; Luke 22:31–34; John 13:36–38.
- `secondary_scripture`: Zechariah 13:7 optional.
- `historical_context_sources`: none for grading.
- `interpretive_sources`: none for grading.
- `source_classification_notes`: local witness=T1; direct cross-witness comparison=T2; forced merged precision=D1.
- `disputed_points`: exact merged chronology/provenance is not upgraded beyond sources.
- `textual_variant_points`: Mark rooster-count wording `TX1`; note visible before grading.
- `opening_brief`, `case_question`, `known_facts_at_start`, `unknowns_to_resolve`, `completion_synthesis`: source-audited v1.0 substance retained.
- `entry_node`: `LN04-N01`
- `task_nodes`: `LN04-N01` through `LN04-N13`
- `optional_nodes`: `LN04-O01`, `LN04-O02`
- `failure_recovery_routes`: source-specific remediation returns to current node; no dead ends.
- `completion_conditions`: all required nodes + final synthesis.
- `perfect_investigation_conditions`: independent high-value evidence/synthesis nodes; never spiritual-status scoring.

## Stable migration and inherited-content contract
`LN-04_PETER_WARNING_v1.0.md` remains the immutable source-audited prose. Required/optional historical labels map to the stable IDs below. For **every row**, the v1.2 fields `skill_target`, `knowledge_target`, `why_this_node_exists`, `player_prompt`, `source_scope_visible_to_player`, `response_mode`, `accepted_answer`, `accepted_variants`, `required_evidence`, `rejected_answers`, `rejection_reason`, `success_feedback`, `partial_feedback`, `failure_feedback`, and `hints` are the corresponding source-audited v1.0 values identified by `source_alias`; semantic/translation-equivalent answers remain accepted. This follows the existing LN-07/LN-08 normalization pattern and does not replace audited prose with new wording.

The following per-node fields are canonical overrides/normalizations. `mission_id=LN-04`, `on_partial=return_to_current_node`, `on_incorrect=return_to_current_node_after_source_remediation`, `on_hint_threshold=H7 guided then follow on_correct`, `mastery_mode=independent unless H6/H7/answer reveal => guided`, `spaced_retrieval=yes`, `review_queue_rule=use the named REVIEW_QUEUE when later_retrieval_effect is REVIEW_QUEUE; for RESOLVED_NODE, queue only if the resolved destination remains weak`, and `functional_nonvisual_equivalent=keyboard-complete linear text/control flow with spoken source/result/confidence/TX1/mastery state` apply explicitly to every row.

| node_id | source_alias | task_family | difficulty | required | confidence_code | textual_variant_flag | on_correct | optional_evidence_unlock | later_retrieval_effect | mastery_domains | evidence_strength |
|---|---|---|---:|---|---|---|---|---|---|---|---|
| `LN04-N01` | `N01` | source selection | 1/6 | yes | `T1` | `none` | `LN04-N02` | `none` | `RESOLVED_NODE LN09-N02` | source-citation; provenance | recognition/application |
| `LN04-N02` | `N02` | parallel comparison | 2/6 | yes | `T2` | `none` | `LN04-N03` | `none` | `RESOLVED_NODE LN09-N01` | Gospel-parallels; prediction | synthesis |
| `LN04-N03` | `N03` | witness-detail comparison | 2/6 | yes | `T2` | `none` | `LN04-N04` | `LN04-O01` | `REVIEW_QUEUE LN_GROUP_WARNING_REVIEW` | cross-reference; attribution | application |
| `LN04-N04` | `N04` | evidence classification | 2/6 | yes | `T2` | `none` | `LN04-N05` | `none` | `REVIEW_QUEUE LN_WITNESS_ATTRIBUTION_REVIEW` | witness-provenance | application |
| `LN04-N05` | `N05` | character evidence | 2/6 | yes | `T2` | `none` | `LN04-N06` | `none` | `REVIEW_QUEUE LN_PETER_CONFIDENCE_REVIEW` | Peter; recall | recall |
| `LN04-N06` | `N06` | witness-specific extraction | 3/6 | yes | `T1` | `none` | `LN04-N07` | `LN04-O02` | `REVIEW_QUEUE LN_LUKE_PETER_DETAIL_REVIEW` | Luke-detail; provenance | recall/application |
| `LN04-N07` | `N07` | character evidence | 2/6 | yes | `T1` | `none` | `LN04-N08` | `none` | `REVIEW_QUEUE LN_LUKE_PETER_DETAIL_REVIEW` | witness-detail | recall |
| `LN04-N08` | `N08` | dialogue reconstruction | 3/6 | yes | `T1` | `none` | `LN04-N09` | `none` | `REVIEW_QUEUE LN_LOCAL_CHRONOLOGY_REVIEW` | local-chronology; John-detail | application |
| `LN04-N09` | `N09` | textual-variant aware comparison | 4/6 | yes | `T2` | `TX1` | `LN04-N10` | `none` | `RESOLVED_NODE LN09-N11` | textual-variants; translation-neutrality | application |
| `LN04-N10` | `N10` | attribution matrix | 3/6 | yes | `T2` | `TX1` | `LN04-N11` | `none` | `REVIEW_QUEUE LN_WITNESS_ATTRIBUTION_REVIEW` | attribution; textual-variants | application |
| `LN04-N11` | `N11` | claim audit | 4/6 | yes | `T2` | `none` | `LN04-N12` | `none` | `RESOLVED_NODE LN04-N13` | evidence-classification; uncertainty | application/synthesis |
| `LN04-N12` | `N12` | constrained synthesis | 4/6 | yes | `T2` | `none` | `LN04-N13` | `none` | `RESOLVED_NODE LN04-N13` | anti-false-harmonization; synthesis | synthesis |
| `LN04-N13` | `N13` | final case reconstruction | 5/6 | yes | `T2` | `TX1` | `mission_complete` | `LN04-O01; LN04-O02` | `RESOLVED_NODE LN09-N13` | Peter-warning; synthesis; textual-variants | synthesis |
| `LN04-O01` | `N14` | optional cross-reference investigation | 4/6 | no | `T2` | `none` | `return_to_required_path` | `none` | `REVIEW_QUEUE LN_OT_CROSS_REFERENCE_REVIEW` | cross-reference | application |
| `LN04-O02` | `N15` | optional linguistic evidence | 5/6 | no | `T1` | `none` | `return_to_required_path` | `none` | `REVIEW_QUEUE LN_LANGUAGE_NOTE_REVIEW` | language-note literacy | application |

## Branch/accessibility contract
- `on_hint_threshold`: H7 completes only as guided and then follows `on_correct`; H1–H6 preserve the v1.0 ladder.
- optional nodes always return to the active required path/evidence archive.
- no answer-bearing information depends on color, drag, pointer, spatial layout or time limit.
- comparisons have the canonical linear form `witness → claim → passage → confidence → qualification`.
- feedback announces evidence relation and mastery consequence; it never evaluates faith/holiness.

## Structural validation
- stable IDs: 15/15 unique;
- branch fields: explicit through row + shared contract;
- every `later_retrieval_effect`: `RESOLVED_NODE` or `REVIEW_QUEUE`;
- v1.0 answer-bearing claims unchanged;
- production code: none.

## Exact Mark TX1 chain
`LN04-N09 → LN09-N11 → LN12-N08`; optional deep-dive `LN09-O01 → LN12-N10`. TX1 never replaces T1/T2 and responsible translations are not penalized.
