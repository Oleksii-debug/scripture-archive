# DEV-A R06 THREE_DEV_REBALANCE_CLOSURE_04 — Integration Input Contract

Status: deterministic preintegration contract. This document does not merge `main` and does not set global `AUDIT_READY`.

## Canonical runtime/platform contracts

- Public frontend transport envelope: `scripture.transport.v1`.
- Platform→runtime compatibility checkpoint: `D1_RUNTIME_TRANSPORT_v1`.
- Runtime command API: `runtime.v1`.
- Public answer DTO: `ANSWER_DTO_v1`; canonical descriptors and validation are owned by `runtime_engine.scripture_archive_runtime.answer_contracts` and the platform surface is only a compatibility re-export.
- Ground-truth provenance: `GROUND_TRUTH_PROVENANCE_v1`.
- Content model: `CONTENT_NODE_SCHEMA_v1.2`.
- Current task-type set: 14 canonical task types. Every final input must map to a registered renderer/editor and the runtime-owned answer DTO descriptor; unsupported or mismatched DTOs fail closed.

## DEV-A exact inherited parents

- Old DEV1 platform: `r06-dev1-platform-windows-constructor` @ `072d294539ec16a3aedf519064fe31dd6b0b06f9`.
- Old DEV5 runtime: `r06-dev5-runtime-finalprep-02` @ `84d40c64cacac391baf3e06102609a32fe68b2e0`.
- DEV-A integration history begins with two-parent commit `90d0c914f4b1a54ab845d7674486f0435395ee5b`.
- Main historical checkpoint remains `bbc681db9701fa39dbe757dda8f2e341ea4e3c5b` and is not merged here.

## Required DEV-B final input

DEV-B is consumable only when its dedicated `LATEST_REPORT — DEV-B — Архів Писання` records a final package with raw Drive readback PASS and exact final D2/D3 heads. The read-only gate must receive the exact final DEV-B meta package plus the two exact content closure packages referenced by that report. No package name, hash or count is inferred from an earlier STARTED checkpoint.

Historical expected content scale is 386 Paul/Acts nodes + 360 Gospel nodes, but those counts are not accepted as final input unless they are proved by the final exact DEV-B packages/hashes.

## Required DEV-C final input

DEV-C is consumable only when its dedicated `LATEST_REPORT — DEV-C — Архів Писання` records a final package with raw Drive readback PASS and exact final D4 head. The read-only gate must receive the exact DEV-C meta package plus the exact D4 closure package referenced by that report.

Historical expected D4 scale is 450 nodes / 90 evidence / 24 OT↔NT relations / 15 dossiers, but these values are not accepted as final input unless they are proved by the final exact DEV-C package/hash.

## Deterministic read-only gate

For each supplied package:

1. Verify exact Drive file ID, filename, parent folder, byte size and SHA256 against the producing developer's final LATEST_REPORT.
2. Verify ZIP CRC and required manifest/report members before reading content.
3. Load only JSON/data files through validated content/package adapters; imported executable/script keys are forbidden.
4. Validate stable node IDs, duplicate IDs/fingerprints, required evidence references, branch/retrieval terminals and confidence/TX1 vocabulary.
5. Validate source/provenance boundaries. Canonical `accepted_answer`, `accepted_variants` and `required_evidence` are authored truth; presentation metadata is never allowed to invent grading truth.
6. Materialize every node through `GROUND_TRUTH_PROVENANCE_v1`; semantic ambiguity/mismatch fails closed rather than becoming false correctness.
7. Require all encountered task types to resolve through the 14-type registry and runtime-owned `ANSWER_DTO_v1` descriptor.
8. Run deterministic grading/correctness and strict provenance release gates against the exact hash-pinned inputs.
9. Validate application presentation mapping without node-ID-specific renderer logic and without changing runtime grading truth.
10. Re-run security boundaries: allowlisted bridge only, JSON-safe DTOs, size/depth controls, no arbitrary filesystem/system execution and no desktop-only imports in domain/runtime.
11. Record exact input package hashes and exact output counts in the gate evidence. Any missing final report, missing package, hash mismatch, CRC failure, unresolved provenance item or schema mismatch is a hard FAIL/CANNOT-RUN, not a guessed PASS.

## Current dependency rule

If DEV-B or DEV-C has only a STARTED/RUNNING report or lacks a final closure package/readback, DEV-A finishes all independent platform/runtime work and records the integration gate as pending external input. DEV-A does not wait idle and does not substitute historical packages for the missing final three-developer outputs.
