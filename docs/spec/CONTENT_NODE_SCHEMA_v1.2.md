# Архів Писання — canonical content schema v1.2

**Status:** canonical pre-production specification  
**Scope:** text/content model only; no software implementation  
**Date:** 2026-08-18  
**Supersedes:** `CONTENT_NODE_SCHEMA_v1.1.md` for new authoring and pilot-normalization work. v1.1 remains in history.

## 1. Why v1.2 exists

The first complete LN pilot exposed a structural risk: mission prose can be source-audited and pedagogically strong while individual task records still use abbreviated or inconsistent field names. That is acceptable for draft prose but not for the canonical platform-neutral content model.

v1.2 therefore tightens identity, confidence, branching, retrieval and accessibility fields without changing the game’s theological or pedagogical principles.

## 2. Stable identifiers

Every campaign, mission and task node has a globally stable identifier.

- campaign: `LN`
- mission: `LN-01`
- required node: `LN01-N01`
- optional/conditional node: `LN01-O01` unless an already-published mission has a stable `N14/N15` optional convention; normalization must map the old label to one canonical ID without silently deleting history.

Bare labels such as `N01` are allowed only as human-readable shorthand inside a mission. The canonical record must also state the full stable `node_id`.

A node ID never changes because of wording, translation, visual layout or platform.

## 3. Campaign record — required fields

- `campaign_id`
- `title_ua` and localization slots
- `scope`
- `player_promise`
- `estimated_total_time`
- `entry_requirements`
- `mission_sequence`
- `mastery_domains`
- `source_corpus`
- `theological_risk_notes`
- `accessibility_risk_notes`
- `completion_reward_type`
- `editorial_status`
- `source_audit_status`

## 4. Mission record — required fields

### Identity
- `mission_id`
- `campaign_id`
- `title`
- `mission_role`
- `estimated_time`
- `difficulty`

### Learning design
- `learning_objectives`
- `mastery_tags`
- `retrieval_targets`
- `future_repetition_hooks`

### Source model
- `primary_scripture`
- `secondary_scripture` or explicit `none`
- `historical_context_sources` or explicit `none`
- `interpretive_sources` or explicit `none`
- `source_classification_notes`
- `disputed_points`
- `textual_variant_points` or explicit `none`

### Narrative shell
- `opening_brief`
- `case_question`
- `known_facts_at_start`
- `unknowns_to_resolve`
- `completion_synthesis`

### Flow
- `entry_node`
- `task_nodes`
- `optional_nodes`
- `failure_recovery_routes`
- `completion_conditions`
- `perfect_investigation_conditions` or explicit `not used`

### Accessibility
- keyboard-complete equivalent
- screen-reader announcement requirements
- nonvisual equivalent for spatial/visual mechanics
- focus/order requirements where task structure depends on sequence
- no essential color-only, drag-only, pointer-only or spatial-only information

## 5. Task node record — required canonical fields

### A. Identity
- `node_id` — full stable ID, e.g. `LN09-N01`
- `mission_id`
- `task_family`
- `difficulty`
- `required`

### B. Learning purpose
- `skill_target`
- `knowledge_target`
- `why_this_node_exists`

A node with no distinct learning purpose must be merged or removed.

### C. Prompt and response
- `player_prompt`
- `source_scope_visible_to_player`
- `response_mode`

### D. Ground truth
- `accepted_answer`
- `accepted_variants`
- `required_evidence`
- `rejected_answers`
- `rejection_reason`
- `confidence_code`
- `textual_variant_flag`

`confidence_code` must use exactly one of the canonical codes:
- `T1` — direct scriptural statement;
- `T2` — direct comparison of explicit scriptural statements;
- `C1` — historical/contextual claim requiring an external source;
- `I1` — interpretation;
- `D1` — disputed or not responsibly reducible to one forced answer.

`TX1` is **not** a replacement confidence code. It is an adjunct `textual_variant_flag: TX1` attached when material textual-transmission variation affects the claim or validation.

### E. Feedback
- `success_feedback`
- `partial_feedback`
- `failure_feedback`

Feedback explains the evidence relationship and never scores spirituality, holiness or faith.

### F. Hint ladder
- `hints`
- `on_hint_threshold`

Hints may use H1–H7. H7 reveals the answer with explanation and records guided rather than independent mastery.

### G. Branching
Every node must explicitly state:
- `on_correct`
- `on_partial`
- `on_incorrect`
- `on_hint_threshold`
- `optional_evidence_unlock`
- `later_retrieval_effect`

If a branch does not apply, record `none` or `return_to_current_node`; do not omit the field.

Every nontrivial branch must change at least one of: information shown, order, mastery evidence, hint cost, optional evidence, or later retrieval. Cosmetic fake branches are forbidden.

### H. Mastery effect
- `mastery_domains`
- `evidence_strength`: one or more of `recognition`, `recall`, `application`, `synthesis`
- `mastery_mode`: `independent`, `guided`, or conditional rule
- `spaced_retrieval`: yes/no
- `review_queue_rule`: where weakness returns if no later authored node currently exists

A `later_retrieval_effect` may not point vaguely to “later”. It must resolve to either:
1. a concrete later node ID; or
2. an explicit post-mission/post-campaign review queue rule.

### I. Accessibility
Every node must state a functional nonvisual equivalent, including where applicable:
- keyboard operation;
- spoken/linear labels;
- ordering alternative to drag-and-drop;
- textual equivalent of map/board/graph;
- announcement of correctness, evidence, confidence and mastery consequence;
- no time-only cue unless a non-time-limited equivalent exists.

## 6. Answer-validation policy

Free responses are graded semantically, not by exact wording. Responsible translation differences that preserve the proposition are accepted.

Citation tasks grade evidentiary adequacy, not preferred translation wording.

Where a passage does not name a person, place, motive or exact order, `not stated in the cited text` is an explicitly valid answer when appropriate.

For `TX1` material, the textual-variant note must be available before any affected answer is graded. A responsible translation or textual tradition may not be penalized for bracketing, omitting or wording the variant differently.

## 7. Cross-mission retrieval contract

When mission A creates a future repetition hook, the canonical content must eventually resolve it.

Each hook has one of these statuses:
- `RESOLVED_NODE` — points to a concrete later node;
- `REVIEW_QUEUE` — no later narrative node is appropriate; schedule in explicit review;
- `DEFERRED_CAMPAIGN` — intentionally returns in a named later campaign;
- `RETIRED` — removed with editorial reason.

No unresolved anonymous retrieval hook is allowed at `PILOT_AUDIT_COMPLETE`.

## 8. Cross-mission provenance contract

A later mission may retrieve an earlier claim, but it must preserve:
- original witness;
- passage;
- confidence code;
- `TX1` qualification if present;
- uncertainty boundary if present.

Retrieval never upgrades `T2`, `D1`, `C1` or `I1` to `T1` merely because the claim became familiar.

## 9. Definition of Done — task node

A node is `AUTHOR_COMPLETE` only when all applicable v1.2 fields are explicit, the branch consequences are coherent, the mastery/retrieval effect resolves, accessibility is functionally equivalent, and no answer-bearing claim exceeds its evidence.

A node becomes `SOURCE_AUDITED` only after biblical and external answer-bearing claims have been checked against cited sources and translation/TX1 validation has been reviewed where relevant.

## 10. Definition of Done — mission

A mission is `MISSION_COMPLETE` only when:
- every required node is AUTHOR_COMPLETE;
- every canonical node has a stable full ID;
- every required branch resolves without a dead end;
- final synthesis is reachable through every valid route;
- retrieval hooks are concrete or explicitly queued;
- all answer-bearing claims are source audited;
- visual and nonvisual task forms are functionally equivalent.

## 11. Pilot normalization rule

Existing LN v1.0 mission files remain historical authored artifacts. The cross-mission audit must not silently overwrite them.

Where v1.0 missions use abbreviated fields or bare `Nxx` identifiers, the audit will create versioned normalized mission revisions (`v1.1` or later) only for files that need repair. The defect register must identify each affected file, severity, fix and regression check.

The pilot may be marked `PILOT_AUDIT_COMPLETE` only after all critical/high schema-conformance defects are repaired and all medium defects are fixed or explicitly accepted.