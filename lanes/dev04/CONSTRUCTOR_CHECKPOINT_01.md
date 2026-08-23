# DEV04 Constructor Checkpoint 01 — reconciled

Branch: `r06-swarm-dev04-constructor`
Legacy parent recovered before first write: `9bf256d2817fde97fb2fb1cb5b279de33749748e`
Draft PR: #64, base `r06-3dev-a-materialization-integration-05` (not main)

## Live gap and reconciliation
The materialized GitHub repair overlay had `PlatformApplication` importing `AuthoringService` while the `authoring/` package itself was absent. An initial DEV04 implementation closed that missing import but used a new `record` envelope. Before handoff, the immutable resolved DEV1 Drive package `DEV_LANE_SCRIPTURE_R06_D1_CLOSURE_03.zip` was recovered and inspected. It proved that the already-tested constructor contract uses top-level `campaign`, `mission`, and `node` objects and that `frontend/authoring.js` depends on that shape.

The initial incompatible shape was therefore rejected, not handed off. DEV04 restored the proven envelope and layered hardening on it.

## Implemented on top of the proven DEV1 contract
- versioned campaign / mission / node draft envelopes;
- canonical-schema-complete blank campaign and mission structures;
- TaskTypeRegistry-backed node creation and all existing renderer/editor compatibility preserved;
- create/list/load/save/delete plus fork-from-existing-record service operations;
- optimistic revision checks that reject stale draft writes;
- stable canonical identity pinning for edit/fork workflows;
- CONTENT_NODE_SCHEMA v1.2 required-node validation;
- H1–H7 validation, explicit branch fields, mastery/retrieval fields and functional nonvisual equivalent checks;
- `T1/T2/C1/I1/D1` confidence validation with TX1 retained only as a separate textual-variant flag;
- declarative task-payload validation for choice, ordering, matching, evidence-select and composite task families;
- pure keyboard-linear Move up / Move down collection reorder primitive, with no coordinates/drag dependency;
- preview through the existing `TaskPresentationMapper`, including focus target and concise text announcement contract;
- size-bounded JSON-only import/export; imported script-like text remains inert data and receives a new draft identity;
- draft→publish-candidate flow that never mutates canonical files and emits source-audit/integration/stable-ID gates plus an explicit change record.

## Exact validation against immutable resolved DEV1 source
Source used for regression: Drive package `DEV_LANE_SCRIPTURE_R06_D1_CLOSURE_03.zip`, package metadata/previous readback already recorded by DEV1.

After overlaying the reconciled DEV04 files on that exact resolved source:
- `python -m compileall -q scripture_archive_platform tests`: PASS;
- `python -m unittest discover -s tests -v`: 50 outcomes = 49 PASS + 1 expected repository-checkout SKIP;
- existing DEV1 `test_authoring.py`: all 4 PASS;
- new DEV04 constructor hardening tests: all 7 PASS;
- `node --check frontend/authoring.js`: PASS;
- `node --check frontend/renderers.js`: PASS;
- `python tools_smoke.py`: PASS (scratch workspace intentionally lacks full repository campaign root; smoke verifies graceful validation response).

The old exact-head GitHub-hosted DEV1 workflow and the current PR workflow both exhibit the previously documented pre-step runner failure with empty step lists / unavailable logs. This is not called green CI and is not used as proof of correctness.

## Ownership / safety
No biblical proposition, accepted answer, cited source, canonical content file, grading truth, mastery/scheduler state or main branch was changed. Constructor import is data-only and performs no script/code execution. Publish preparation explicitly reports `canonical_mutation_performed = false`.

## Accessibility boundary
The domain exposes keyboard-linear reorder and preview focus/announcement contracts and preserves the proven semantic authoring frontend shape. Automated/static evidence is not a human NVDA PASS.

## Remaining DEV04 work
1. expose delete/fork/task-template/reorder operations through the existing allowlisted application/transport command surface;
2. add canonical read-only fork adapter so an editor can start from a real existing campaign/mission/node without constructor filesystem access;
3. harden matching/evidence/composite editor contracts and draft-level cross-reference validation;
4. coordinate the semantic authoring workspace with DEV02 and visual styling with DEV03 without taking ownership of their DOM/CSS lanes;
5. keep rerunning exact resolved-source regressions after each constructor slice.
