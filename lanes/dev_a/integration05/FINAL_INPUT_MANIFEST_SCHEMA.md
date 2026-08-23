# FINAL INPUT MANIFEST SCHEMA — DEV-A Stage 05

DEV-A final preintegration accepts DEV-B/DEV-C inputs only after readable GitHub materializations satisfy `R06_RECORD_HASH_MATERIALIZATION_MANIFEST_v1` and their lane reports/packages are terminal and Drive-readback complete.

Pinned dimensions for every lane input: exact immutable source-package filename/Drive ID/SHA256; exact final GitHub branch/HEAD; `CONTENT_NODE_SCHEMA_v1.2`; `GROUND_TRUTH_PROVENANCE_v1`; exact node/evidence/relation counts; complete stable-ID sets; canonical per-record SHA256 indexes and aggregate hashes; zero unresolved `required_evidence`; all task types supported by the 14-type runtime contract; and only release-pass provenance classes.

Expected final candidate totals after D2+D3+D4 are authoritative: D2 386 nodes / 184 evidence; D3 360 nodes / 240 evidence; D4 450 nodes / 90 evidence / 24 OT↔NT relations; total 1196 nodes / 514 evidence / 24 relations.

## Deterministic Stage05 gate

`scripture_archive_runtime.integration_intake` validates each exact materialization against its pinned source package and GitHub identity. `scripture_archive_runtime.preintegration_gate` then requires the exact lane set `D2,D3,D4`, rejects duplicate/missing/extra lanes and node/evidence/relation collisions, enforces the 1196/514/24 totals, and runs strict provenance + canonical accepted-answer correctness over every node.

The gate may report PASS only when all 1196 nodes are strict release-safe and CORRECT, adapter-inferred truth count is zero, unsupported task types are zero, node/evidence/relation collisions are zero, and unresolved required evidence is zero. It deliberately reports `player_flow_gate: SEPARATE_REQUIRED`; actual TransportAdapter → runtime.v1 player-flow validation remains a distinct required gate and cannot be inferred from content conformance.

## CLI plan contract

Run `runtime_engine/tools/run_stage05_preintegration_gate.py --plan <plan.json> --out <report.json>` only after terminal B/C delivery. The plan is a JSON object with `inputs` and optional `policy`. Each `inputs[]` item contains `root`, `manifest_path`, and an `expectation` matching `FinalInputExpectation`: `lane`, source package filename/Drive ID/SHA256, GitHub branch/HEAD, exact node/evidence/relation counts, content schema, and provenance contract. Relative filesystem paths resolve relative to the plan file. No package/HEAD value is auto-discovered or guessed by the CLI.

Source-package or GitHub HEAD mismatch is rejected rather than silently consuming stale materialization. This contract does not authorize main merge, global AUDIT_READY, Windows/WebView2 PASS, or human NVDA PASS.
