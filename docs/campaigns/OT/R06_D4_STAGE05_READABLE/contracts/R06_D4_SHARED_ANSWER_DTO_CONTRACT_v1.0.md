# R06 DEV4 shared answer DTO contract v1.0 — FINALPREP 02

Status: `FINALPREP_CONTENT_AUTHORED_TRUTH_READY`

This file defines the final DEV4 content-side contract aligned with DEV5 `ANSWER_DTO_v1`. It does not create a second grader truth.

## Canonical OT_NT_LINK ground truth

For every `OT_NT_LINK` node, the authored production ground truth is:

`grading.ot_nt_link`

with exactly these five semantic fields:

- `ot_passage`
- `nt_passage`
- `relation_category`
- `confidence`
- `evidence_id`

The player's submission uses the same five-field `ANSWER_DTO_v1` shape. DEV5 `grade_ot_nt_link` consumes `grading.ot_nt_link` directly.

The previous `grading.accepted_link` field is not production truth in FINALPREP 02. For provenance, its former value may appear only inside `grading.legacy_compatibility.value`, marked `LEGACY_MIGRATION_ONLY` and `release_ground_truth=false`.

## Release rule

A package adapter may normalize legacy structure, but it MUST NOT invent or synthesize `grading.ot_nt_link` for release conformance. If canonical authored truth is absent, the release gate fails.

The strict DEV4 gate is:

`tools/test_ot_r06_d4_d5_contract.py --runtime-root <runtime_engine> --require-otnt`

Expected result: `INTEGRATION_RUNTIME_PASS 450/450`.

## Relation safety

The five-field DTO does not collapse relation semantics. `relation_category` remains one of the canonical OT↔NT relation categories and `confidence` remains independently graded. `TX1` remains separate from confidence. `DISPUTED_CONNECTION` stays D1 where authored; interpretive connections remain I1/D1 as authored.

## Translation-neutrality

Free-text tasks use explicit proposition/alias data rather than one exact English sentence. Structured tasks use stable IDs/enums/sets/pairs. The runtime must not invent theological synonyms, manuscript history, chronology, or consensus.
