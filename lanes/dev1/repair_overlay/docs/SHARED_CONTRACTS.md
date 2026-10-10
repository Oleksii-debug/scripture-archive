# R06 DEV1 — Shared platform contract — FINAL_INTEGRATION_PREP_02

Platform transport: `scripture.transport.v1`. Shared runtime-facing transport checkpoint: `D1_RUNTIME_TRANSPORT_v1`. Canonical content: `CONTENT_NODE_SCHEMA_v1.2`. Answer contract: `ANSWER_DTO_v1`.

DEV1 owns semantic presentation, renderer/editor registries, constructor UI, keymap, desktop/web transport adapters and the bridge boundary. DEV5 owns deterministic grading, branching, mastery, scheduler and player-memory truth. The frontend MUST NOT maintain a second grader truth.

## ANSWER_DTO_v1
Every player submission is a JSON object with `schema: "ANSWER_DTO_v1"`, canonical `task_type`, and only the fields defined below. DEV1 mirrors the exact descriptors from DEV5 FINALPREP02 HEAD `513b6d240fd9ef29af5f4cd5126267a7d30ec8fb`.

- SINGLE_CHOICE / COMBOBOX_SELECT / PARALLEL_WITNESS_COMPARE: `{choice}`
- MULTI_SELECT: `{choices[]}`
- SHORT_TEXT / LONG_TEXT / ARGUMENT: `{text}`
- ORDERING: `{items[]}`
- MATCHING: `{pairs:[{left,right}]}`
- EVIDENCE_SELECT: `{evidence_ids[]}`
- CLAIM_EVIDENCE: `{claim,evidence_ids[]}`
- SPEAKER_RECIPIENT: `{speaker,recipient}`
- OT_NT_LINK: `{ot_passage,nt_passage,relation_category,confidence,evidence_id}`
- COMPOSITE_MULTI_STEP: `{steps:[{step_id,answer}]}` where each `answer` is an object.

Unknown fields, task-type mismatch, wrong schema and malformed structured values fail closed at the runtime adapter boundary. Legacy grading metadata may be retained separately for migration/reference-grader compatibility; it is not a public answer DTO and is not canonical grading truth.

## Registries and presentation
`TaskTypeRegistry`, `RendererRegistry`, `GraderRegistry`, `EditorRegistry`, `TaskTemplateRegistry`, and `ActionRegistry` are versioned. All 14 current task types have keyboard-linear semantic renderer/editor capacity. `GraderRegistry` records ownership as `DEV5/runtime`.

`TaskPresentationMapper` normalizes task-type aliases, returns the shared `answer_contract_descriptor`, and preserves any historical node `answer_contract` separately as `legacy_answer_contract`. It maps declarative option/evidence/ordering/matching/composite metadata from current D2/D3/D4 package shapes without node-ID-specific logic.

## Transport and security
Public request example:
```json
{"api_version":"scripture.transport.v1","request_id":"stable-per-call","command":"player.submit_answer","payload":{"node_id":"...","answer":{"schema":"ANSWER_DTO_v1","task_type":"SHORT_TEXT","text":"..."}}}
```
Runtime command mapping remains `player.load_node→load_task`, `player.submit_answer→submit_answer`, `player.request_hint→request_hint`, `player.next→next`, `player.save_checkpoint→save`, `player.restore_checkpoint→restore`, `player.reveal_evidence→get_evidence`. The bridge remains explicit-allowlist only: no arbitrary file paths, shell, OS commands, dynamic Python execution or generic method invocation.

## Accessibility and portability
All essential controls use semantic HTML/forms/labels/buttons and keyboard operation. Ordering uses explicit Up/Down buttons, not drag-only interaction. Status, evidence, confidence/TX1 and next actions have textual equivalents. Domain/content/grading ports do not depend on `window.pywebview`; desktop bridge is one transport adapter and future HTTP/JSON/WebSocket is another.

## Authoring boundary
Constructor writes DRAFT only. Publish-candidate preparation does not silently mutate audited canonical content and requires source/integration review.
