# DEV3 Gospel answer DTO contract — repair 01

This is the DEV3 content-side contract for integration with the observed R06 DEV5 `runtime.v1` grader API. It does not modify DEV5 code.

- `EVIDENCE_SELECT`: `array<string>`; exact required evidence ID set.
- `SHORT_TEXT`: string; deterministic `accepted_propositions[].aliases`.
- `SPEAKER_RECIPIENT`: `{speaker:string, recipient:string}`; exact role pair. Current D5 needs permanent registry mapping; its existing `grade_matching` behavior is contract-compatible.
- `CLAIM_EVIDENCE`: `{claim:string, evidence:array<string>}`; proposition groups + required evidence IDs. This replaces the old DEV3 `evidence_id` scalar mismatch.
- `SINGLE_CHOICE` / `COMBOBOX_SELECT`: string; accepted value + concrete aliases.
- `PARALLEL_WITNESS_COMPARE`: string witness label for the current DEV3 comparison nodes; current D5 needs permanent registry mapping and is compatible with its existing `grade_single_choice` behavior.
- `LONG_TEXT`: text or JSON-safe object whose values contain all required proposition aliases.
- `MULTI_SELECT`: `array<string>` exact set.
- `ORDERING`: ordered `array<string>`.
- `MATCHING`: `object<string,string>` exact pairs.
- `COMPOSITE_MULTI_STEP`: object keyed by step ID with explicit nested grader contracts.

Translation neutrality is bounded and deterministic: canonical data now supplies concrete proposition aliases rather than generic instructions such as “semantic equivalent”. Unlisted semantic equivalence is not silently accepted by deterministic code; it remains an explicit review/integration concern.
