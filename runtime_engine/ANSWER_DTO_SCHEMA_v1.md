# Scripture Archive — ANSWER_DTO_v1

UI/runtime submission contract. JSON-safe, platform-neutral, and independent of WebView/Windows APIs.

Every DTO may include `schema: ANSWER_DTO_v1` and `task_type`. Canonical fields by task type:

- SINGLE_CHOICE / COMBOBOX_SELECT / PARALLEL_WITNESS_COMPARE: `choice`.
- MULTI_SELECT: `choices[]`.
- SHORT_TEXT / LONG_TEXT / ARGUMENT: `text`.
- ORDERING: `items[]`.
- MATCHING: `pairs[{left,right}]`.
- EVIDENCE_SELECT: `evidence_ids[]`.
- CLAIM_EVIDENCE: `claim`, `evidence_ids[]`.
- SPEAKER_RECIPIENT: `speaker`, `recipient`.
- OT_NT_LINK: `ot_passage`, `nt_passage`, `relation_category`, `confidence`, `evidence_id`.
- COMPOSITE_MULTI_STEP: `steps[{step_id,answer}]` where each nested `answer` is JSON data for the declared step contract.

The runtime validates DTO shape and never executes imported content. Translation-neutral free-response grading remains bounded by explicit canonical proposition aliases; the runtime does not invent synonyms, Bible facts, chronology, or theological consensus.

Legacy D2/D3/D4 data may be passed through `package_adapters`. Adapter-derived contracts are marked `runtime_adapter.derived=true`; this is compatibility evidence, not a claim that legacy content pedagogy or schema debt has been editorially repaired.
