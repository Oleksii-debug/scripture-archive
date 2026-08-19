# PEDAGOGY_OVERLAY_PRECEDENCE v1.0

**Status:** R05 pre-production canonical rule; independent audit pending.

Purpose: preserve historical R02/R03 canonical node files byte-for-byte while allowing R05 to repair pedagogy defects without changing answer-bearing biblical/source content.

## Effective record
For a `node_id`, the effective canonical node is the base canonical node plus the matching R05 pedagogy overlay, if present.

Allowed overlay keys only:
- `success_feedback`
- `partial_feedback`
- `failure_feedback`
- `hints`
- `on_hint_threshold`
- `mastery_mode`

Everything else remains authoritative in the base node: IDs, mission, prompt, accepted/rejected answers, required evidence, confidence, TX1, branches other than `on_hint_threshold`, retrieval, mastery domains, accessibility and source scope.

## Safety rules
1. An overlay MUST NOT change an answer-bearing biblical claim or source citation field.
2. One `node_id` may have at most one overlay patch.
3. An overlay patch for an unknown base `node_id` is an error.
4. A forbidden overlay key is an error.
5. Every chunk named by `R05_PEDAGOGY_OVERLAY_INDEX.json` must exist.
6. Validator/consumer applies the overlay before pedagogy/H7 validation.
7. Historical base files remain preserved for audit traceability; overlay precedence is explicit, not silent replacement.
8. H7 reveal still records `mastery=guided`; no guided route may advance without presenting the actual answer/evidence explanation.

This mechanism is textual-preproduction metadata only and does not authorize production code.