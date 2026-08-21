# R06 DEV1 — Shared platform contract checkpoint

Contract version: `scripture.transport.v1`. Canonical content remains `CONTENT_NODE_SCHEMA_v1.2`.

The platform intentionally separates the UI from DEV5-owned engine/grading/mastery/persistence implementations. The integration seam is constructor injection through `ContentLoaderPort`, `GraderPort`, `PersistencePort`, and `TransportAdapterPort`.

## Request envelope

```json
{"api_version":"scripture.transport.v1","request_id":"stable-per-call","command":"player.load_node","payload":{"node_id":"LN01-N01"}}
```

Response envelopes are JSON-safe and never return Python objects or executable HTML as domain truth. Errors use `{code,message,details?}`.

## Security boundary

`system.*`, `content.*`, `player.*`, `authoring.*`, `keymap.*`, and `settings.*` are explicit allowlisted commands in `transport/contracts.py`. Arbitrary file paths, shell commands, dynamic Python execution and generic method names are not accepted by the WebView bridge.

## Registries

`TaskTypeRegistry`, `RendererRegistry`, `GraderRegistry`, `EditorRegistry`, `TaskTemplateRegistry`, and `ActionRegistry` are versioned registries. Platform task identifiers now cover SINGLE_CHOICE, MULTI_SELECT, SHORT_TEXT, LONG_TEXT, COMBOBOX_SELECT, ORDERING, MATCHING, EVIDENCE_SELECT, CLAIM_EVIDENCE, COMPOSITE_MULTI_STEP, SPEAKER_RECIPIENT, PARALLEL_WITNESS_COMPARE, and OT_NT_LINK. The final three have renderer/editor capacity in DEV1 because D3/D4 already materialize them; their deterministic grading remains DEV5-owned.

## Content loader

Canonical content is discovered from `docs/campaigns/**/MISSION_INDEX.json` and declared `node_files`. The loader is read-only, validates IDs/path containment and maps legacy v1.2 metadata without any `node_id`-specific UI branch. New lanes may add `task_type`, `ui_metadata`, `answer_contract`, and `visual_metadata` without rewriting the shell.

## Grader and persistence ports

`grade(node, renderable, answer) -> GradeResult` is a replaceable port. DEV1's reference grader is conservative and does not replace DEV5 runtime grading. `get_json/put_json/delete/list_keys` is the platform persistence port; DEV1's atomic JSON store is limited to platform settings/keymap/checkpoint/drafts while DEV5 owns final player-memory/mastery persistence.

## Authoring immutability

Constructor writes `DRAFT` only. `prepare_publish_candidate` produces a validated `PUBLISH_CANDIDATE` with `canonical_mutation_performed=false`, `requires_source_audit=true`, and `requires_integration_review=true`. No bridge command silently overwrites audited canonical content.

## DEV5 runtime.v1 compatibility checkpoint

Pre-integration audit identified a real platform↔runtime answer DTO mismatch. DEV1 now treats DEV5 `runtime.v1` as an explicit downstream engine boundary. `RuntimeEngineContractAdapter` maps public player commands without moving grading/mastery/scheduling into DEV1.

Structured answer DTOs aligned to DEV5 commit `6be62c4869d3870380cf40265def65d301385b7e` are:

- `MULTI_SELECT`: `choice_id[]`
- `ORDERING`: `item_id[]`
- `MATCHING`: `{left_id:right_id}`
- `EVIDENCE_SELECT`: `evidence_id[]`
- `CLAIM_EVIDENCE`: `{claim,evidence[]}` — repaired from the earlier DEV1 `evidence_ids` key
- `COMPOSITE_MULTI_STEP`: `{step_id:value}` — repaired from the earlier `{steps:{...}}` wrapper

Runtime command mapping is `player.load_node→load_task`, `player.submit_answer→submit_answer`, `player.request_hint→request_hint`, `player.next→next`, `player.save_checkpoint→save`, `player.restore_checkpoint→restore`, `player.reveal_evidence→get_evidence`. Platform-owned constructor, keymap, settings and content-list commands remain outside the engine boundary.

`SPEAKER_RECIPIENT`, `PARALLEL_WITNESS_COMPARE`, and `OT_NT_LINK` are semantic keyboard renderers in DEV1. Their final answer/grading schema is intentionally not invented here; DEV5 repair/integration must publish the authoritative deterministic contract.
