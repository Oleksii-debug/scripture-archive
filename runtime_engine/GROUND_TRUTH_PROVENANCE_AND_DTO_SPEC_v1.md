# Scripture Archive — Ground Truth Provenance + ANSWER_DTO Specification v1

Runtime answer schema: `ANSWER_DTO_v1`  
Provenance schema: `GROUND_TRUTH_PROVENANCE_v1`  
Canonical content schema: `CONTENT_NODE_SCHEMA v1.2`

## Canonical truth rule

`accepted_answer`, `accepted_variants`, and `required_evidence` are canonical ground-truth fields. A deterministic, mechanically equivalent projection from these fields into an `ANSWER_DTO_v1` submission is normalization, not invention. `task_payload`, options, option position/order, UI labels, and other presentation fields are never answer truth.

If canonical truth and an authored task-specific grading representation both exist, they must be equivalent. Any conflict is `MISMATCH_FAIL`. Any mapping that is not unique is `AMBIGUOUS_FAIL`.

## Provenance classes

- `AUTHORED_DIRECT_PASS`: authored task-specific grading representation exists and is equivalent to canonical truth.
- `CANONICAL_LOSSLESS_NORMALIZATION_PASS`: DTO is projected losslessly from canonical fields without a semantic guess.
- `LEGACY_EXPLICIT_NORMALIZATION_PASS`: documented explicit legacy authored representation is losslessly equivalent; migration provenance/warning is retained.
- `ADAPTER_INFERENCE_FAIL`: truth would have to come from presentation/heuristic data such as `task_payload.correct`, option index/order, UI labels, or guessed semantics.
- `MISMATCH_FAIL`: canonical and task-specific authored truth disagree.
- `AMBIGUOUS_FAIL`: canonical projection is missing, incomplete, or not uniquely determined.

Only the first three classes are provenance-release-passing, and only when the normal grader also returns `CORRECT`.

## Canonical projections by task type

- `SINGLE_CHOICE`, `COMBOBOX_SELECT`, `PARALLEL_WITNESS_COMPARE`: canonical non-empty `accepted_answer` string → `{choice}`.
- `MULTI_SELECT`: canonical accepted list → `{choices[]}`.
- `SHORT_TEXT`, `LONG_TEXT`, `ARGUMENT`: canonical text or deterministic structured-object serialization → `{text}`. Explicit proposition graders must accept the canonical answer.
- `ORDERING`: canonical accepted list → `{items[]}` with order preserved.
- `MATCHING`: canonical mapping/pair list → `{pairs[{left,right}]}`.
- `EVIDENCE_SELECT`: canonical accepted evidence list, cross-checked with `required_evidence` → `{evidence_ids[]}`.
- `CLAIM_EVIDENCE`: canonical claim plus canonical evidence, cross-checked with `required_evidence` → `{claim,evidence_ids[]}`.
- `SPEAKER_RECIPIENT`: canonical `{speaker,recipient}` → same fields. Legacy `grading.accepted_pairs` is allowed only when exactly equivalent.
- `OT_NT_LINK`: canonical five fields (`ot_passage`, `nt_passage`, `relation_category`, `confidence`, `evidence_id`) → same DTO. `grading.ot_nt_link` is the preferred direct authored representation; legacy `accepted_link` is compatibility only when exactly equivalent.
- `COMPOSITE_MULTI_STEP`: top-level canonical accepted object must be keyed by authored `grading.steps` IDs. Step task types provide structure only; step truth must equal the top-level canonical value. Missing step structure or uncontracted keys fail closed.

## Integration boundary

The deterministic materializer verifies input SHA-256, ZIP path safety, duplicate members, canonical node schema, lossless provenance, node/evidence counts, duplicate/conflicting stable IDs, required-evidence resolution, and deterministic output hashes. It emits a per-lane ground-truth hash index and never derives answer truth from presentation payloads.

## D1 platform contract

D1 consumes `D1_RUNTIME_TRANSPORT_v1`, `ANSWER_DTO_v1`, and this provenance contract. The frontend must not maintain a second grader truth. Domain/game/content remain free of `pywebview`, `win32`, or Windows-only imports.
