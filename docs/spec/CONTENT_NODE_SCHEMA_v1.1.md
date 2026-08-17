# Архів Писання — canonical content schema v1.1

**Status:** canonical pre-production specification  
**Scope:** text/content model only; no software implementation  
**Date:** 2026-08-17

## 1. Purpose

This document defines the minimum structure required for every authored campaign, mission and task node. It exists so that content can later be implemented on any platform without rewriting the game design.

The schema is conceptual. It is not production code and must not be treated as a commitment to JSON, SQL, WordPress, Windows, Web or any other implementation.

## 2. Campaign record

Every campaign must define:

- `campaign_id` — stable identifier;
- `title_ua` and future-localization title slots;
- `scope` — biblical book, period, person, theme or event;
- `player_promise` — what the player will understand or be able to reconstruct after completion;
- `estimated_total_time`;
- `entry_requirements`;
- `mission_sequence`;
- `mastery_domains`;
- `source_corpus`;
- `theological_risk_notes`;
- `accessibility_risk_notes`;
- `completion_reward_type` — knowledge/progression only, never spiritual status;
- `editorial_status` and `source_audit_status`.

## 3. Mission record

A mission is complete only when all applicable fields below are authored.

### Identity

- `mission_id`
- `campaign_id`
- `title`
- `subtitle` if needed
- `mission_role` — tutorial / investigation / synthesis / retrieval / final case
- `estimated_time`
- `difficulty`

### Learning design

- `learning_objectives`
- `mastery_tags`
- `retrieval_targets` from earlier missions
- `future_repetition_hooks`

### Source model

- `primary_scripture`
- `secondary_scripture`
- `historical_context_sources` if any
- `interpretive_sources` if any
- `source_classification_notes`
- `disputed_points`

### Narrative shell

- `opening_brief`
- `case_question`
- `known_facts_at_start`
- `unknowns_to_resolve`
- `completion_synthesis`

### Flow

- `entry_node`
- ordered or branching `task_nodes`
- `optional_nodes`
- `failure_recovery_routes`
- `completion_conditions`
- `perfect-investigation_conditions` if used

### Accessibility

- keyboard-complete equivalent for every interaction;
- screen-reader announcement requirements;
- nonvisual equivalent for maps, evidence boards and ordering;
- no essential color-only, drag-only or spatial-only information;
- text-first alternatives for every visual mechanic.

## 4. Task node record

Every task node must define the following.

### A. Identity

- `node_id`
- `mission_id`
- `task_family`
- `difficulty`
- `required` — yes/no

### B. Learning purpose

- `skill_target`
- `knowledge_target`
- `why_this_node_exists`

A node that has no learning purpose must be removed, even if it is entertaining.

### C. Prompt

- `player_prompt`
- `source_scope_visible_to_player`
- `response_mode` — citation selection / free response / ordering / classification / evidence linking / comparison / multiple choice / other approved family

### D. Ground truth

- `accepted_answer`
- `accepted_variants`
- `required_evidence`
- `rejected_answers`
- `rejection_reason`
- `confidence` — direct text / strong inference / interpretation / disputed

### E. Feedback

- `success_feedback`
- `partial_feedback`
- `failure_feedback`

Feedback must explain the evidence relationship. It must not use shame, spiritual judgment or fabricated certainty.

### F. Hint ladder

Each applicable node may use up to seven levels:

1. restate the investigation goal;
2. narrow the biblical book;
3. narrow the chapter or passage range;
4. identify the evidence type to look for;
5. expose a partial relation or keyword without giving the answer;
6. expose the decisive passage reference;
7. reveal the answer with explanation and mark the node as guided rather than independently mastered.

Hints reduce mastery confidence but never block completion.

### G. Branching

- `on_correct`
- `on_partial`
- `on_incorrect`
- `on_hint_threshold`
- `optional_evidence_unlock`
- `later_retrieval_effect`

Every branch must alter information, order, mastery evidence, hint cost, optional evidence or later retrieval. Cosmetic fake branches are forbidden.

### H. Mastery effect

Each node records:

- domains affected;
- evidence strength: `recognition`, `recall`, `application`, `synthesis`;
- independent/guided flag;
- whether the concept should return through spaced retrieval.

## 5. Source confidence model

Every answer-bearing claim must be labelled internally as one of:

### T1 — direct scriptural statement
The cited passage explicitly states the claim.

### T2 — direct comparison
The claim follows from comparing two or more explicit scriptural statements, without adding an external premise.

### C1 — historical/contextual claim
Requires a source outside the biblical text.

### I1 — interpretation
A reasoned theological, denominational or scholarly interpretation.

### D1 — disputed
Responsible sources disagree, or the evidence does not justify a single forced answer.

The game must never silently convert C1, I1 or D1 into T1.

## 6. Answer-validation policy

Free responses must accept semantic equivalents rather than only one wording. Translation differences must not be penalized when they preserve the same proposition.

Citation tasks should grade the evidentiary adequacy of a passage, not whether the player chose the exact preferred translation.

Where a passage does **not** name a person, place or motive, `not stated in the cited text` is a valid and often desirable answer.

The system must teach players to distinguish:

- explicit statement;
- supported inference;
- plausible guess;
- unsupported assertion.

## 7. Branching patterns approved for authoring

1. **Evidence-order branch** — player chooses which witness/text to investigate first.
2. **Confidence branch** — player can commit now or gather more evidence.
3. **Hint branch** — guided route trades mastery confidence for continued progress.
4. **Optional-evidence branch** — side evidence deepens understanding but is not required.
5. **Correction branch** — unsupported conclusion triggers a targeted source-check rather than a dead end.
6. **Synthesis branch** — different correctly gathered evidence sets produce different routes to the same final synthesis.
7. **Retrieval branch** — weakness detected now schedules a later retrieval node.
8. **Dispute branch** — where evidence permits multiple responsible reconstructions, the player examines the limits of certainty instead of being forced into a false answer.

## 8. Definition of Done for a task node

A task node is `AUTHOR_COMPLETE` only if:

- the prompt is clear;
- the answer and variants are explicit;
- required evidence is identified;
- wrong-answer handling is authored;
- hint route is authored where needed;
- branch consequences are coherent;
- mastery effect is defined;
- source confidence is labelled;
- accessibility equivalent is described;
- no claim exceeds its source evidence.

A node becomes `SOURCE_AUDITED` only after its biblical and any external claims have been checked against the cited sources.

## 9. Definition of Done for a mission

A mission is `MISSION_COMPLETE` only after every required node is AUTHOR_COMPLETE, the full flow can be traversed without dead ends, the final synthesis can be reached through every valid branch, and all answer-bearing claims have been source audited.

## 10. Current canonical use

This schema supersedes informal node descriptions in the v1.0 baseline. Existing baseline content should be migrated into this structure progressively, beginning with campaign `LN` («Остання ніч»).
