# DEV04 Constructor Checkpoint 01

Branch: `r06-swarm-dev04-constructor`
Parent recovered before first write: `9bf256d2817fde97fb2fb1cb5b279de33749748e`

## Gap closed
The current platform `application/service.py` already imports and calls `scripture_archive_platform.authoring.service.AuthoringService`, but the materialized platform tree had no `authoring/` package. This checkpoint materializes that missing dependency rather than creating a parallel constructor stack.

## Implemented
- versioned campaign / mission / node draft envelopes;
- create/list/load/save/delete and fork-from-existing-record operations;
- optimistic draft revision checking to reject stale writes;
- stable canonical identity pinning for edits;
- TaskTypeRegistry-backed node templates;
- declarative collection add/remove and keyboard-linear move-up/move-down reorder primitives;
- CONTENT_NODE_SCHEMA v1.2 validation for required node fields, H1–H7, explicit branches, mastery/retrieval fields and functional nonvisual equivalent;
- confidence validation limited to T1/T2/C1/I1/D1 with TX1 kept separate;
- task-type-specific validation for choice and ordering payloads;
- preview through the existing `TaskPresentationMapper` contract;
- JSON-only size-bounded export/import where import creates a new local draft lineage rather than overwriting an existing draft;
- draft-to-publish-candidate flow with immutable change record and explicit flags that no canonical write occurred and answer-bearing changes still require source audit/integration.

## Safety / ownership
No biblical proposition, accepted answer, cited source, grading truth, scheduler state or canonical campaign file was modified. The service does not perform filesystem writes to canonical content. It uses the injected storage port already expected by the platform application.

## Accessibility boundary
The constructor domain exposes a keyboard-linear reorder primitive and preview `focus_target`/text announcement contract. This is engineering support for DEV02 semantic UI integration, not a human NVDA PASS.

## Local validation before GitHub write
`python -m unittest discover -s tests -v`: 8/8 constructor tests passed after one stable-identity fork defect was found and fixed.
`python -m py_compile`: authoring service and test module passed.

## Remaining DEV04 work
- wire finer-grained authoring edit commands into the allowlisted transport/application command surface where needed;
- add canonical-record fork/read-only source adapter rather than making constructor reach into repo paths;
- expand task-type-specific editor validation for matching/evidence/composite fields;
- coordinate semantic authoring workspace with DEV02 and visuals with DEV03 without rewriting their DOM/CSS ownership;
- run full overlay/application regression once missing sibling platform pieces (notably persistence/keymap materialization) are available in the live integration base.
