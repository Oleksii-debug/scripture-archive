# R06 DEV4 shared answer DTO contract v1.0

Status: `CONTENT_SIDE_READY / CROSS-LANE DEV5 IMPLEMENTATION REQUIRED FOR OT_NT_LINK`

This file is a DEV4 integration contract, not a unilateral rewrite of the global runtime. It records the exact shapes used by the repaired 450-node OT/OT↔NT corpus.

## Why it exists

PRE-INTEGRATION AUDIT 01 showed that a human-readable `accepted_answer` string was not enough for deterministic runtime grading. The repaired corpus therefore carries an explicit `grading` object and a structured `accepted_answer` where the task is structured.

The authoritative machine-readable table is `R06_D4_SHARED_ANSWER_DTO_CONTRACT_v1.0.json` in the repair package.

## OT_NT_LINK/v1

Submission is one object with exactly five semantic fields:

- `ot_passage`
- `nt_passage`
- `relation_category`
- `confidence`
- `evidence_id`

The content record stores the same object in `grading.accepted_link` and lists the five keys in `grading.required_fields`.

The grader must not collapse these fields to a generic “prophecy” string. Relation category and confidence are graded separately. `DISPUTED_CONNECTION` therefore remains D1; interpretive typology/echo classes remain I1/D1 as authored. TX1 remains a separate flag.

## Translation-neutrality boundary

Free-text tasks no longer put policy prose such as “semantic equivalent” into `accepted_variants`. They use explicit `accepted_propositions` groups. Citation and provenance dimensions carry concrete aliases; structured tasks grade stable IDs/enums/sets/pairs rather than surface prose. This is deterministic and bounded: the runtime must not invent new theological synonyms.

## Integration gate

`tools/test_ot_r06_d4_d5_contract.py --runtime-root <runtime_engine> --require-otnt`

must return `INTEGRATION_RUNTIME_PASS 450/450` after DEV5 implements `OT_NT_LINK`. On the audited D5 baseline it intentionally reports `426 CORRECT + 24 UNSUPPORTED_OT_NT_LINK`, proving that the former 201 incorrect DEV4 accepted answers were repaired while the cross-lane grader gap remains explicit.
