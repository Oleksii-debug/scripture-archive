# R06 Stage05 Integration Delivery Readiness Contract v1

Schema: `R06_STAGE05_DELIVERY_READINESS_INPUT_v1` → `R06_STAGE05_DELIVERY_READINESS_RESULT_v1`.

Purpose: keep the final 1196-node integration gate fail-closed while DEV-B and DEV-C are still materializing content. This is an orchestration/readiness contract only. It does not classify biblical truth, change content, infer provenance, or replace `validate_materialization_manifest()` / `validate_final_input()`.

A lane is ready only when all required conditions are simultaneously true:

1. Its dedicated `LATEST_REPORT` is explicitly terminal and raw/report readback is PASS.
2. The report explicitly allows integration consumption.
3. Every required branch is pinned in the report and exactly equals the freshly fetched live GitHub HEAD.
4. Every required versioned ZIP exists, has non-empty Drive ID + exact SHA256, raw Drive readback PASS and ZIP CRC/integrity PASS.
5. Each package pins every branch HEAD required by its package role, and those pins equal live GitHub.
6. Record-hash readable materialization verification is PASS.
7. Terminal `validate_final_input` validation is PASS.

Failure is explicit and machine-readable. Current blocker codes include:
`REPORT_NOT_TERMINAL`, `REPORT_READBACK_MISSING`, `INTEGRATION_NOT_ALLOWED`, `REPORT_HEAD_MISSING`, `LIVE_HEAD_MISSING`, `REPORT_HEAD_STALE`, `PACKAGE_MISSING`, `PACKAGE_EVIDENCE_INVALID`, `PACKAGE_READBACK_MISSING`, `PACKAGE_INTEGRITY_UNVERIFIED`, `PACKAGE_HEAD_MISSING`, `PACKAGE_HEAD_STALE`, `MATERIALIZATION_MANIFEST_UNVERIFIED`, `FINAL_INPUT_UNVERIFIED`, `REQUIRED_LANE_MISSING`, `UNEXPECTED_LANE_OBSERVATION`.

Malformed/ambiguous observations are rejected rather than normalized silently. Git heads must be exact 40-hex SHAs. Package digests must be exact SHA256. Placeholder strings such as `__D2_HEAD__` therefore cannot accidentally pass readiness.

Stage05 required terminal inputs for the current three-lane routing:

- DEV-B: D2 branch + D3 branch; `DEV_LANE_SCRIPTURE_R06_D2_CLOSURE_03.zip`; `DEV_LANE_SCRIPTURE_R06_D3_CLOSURE_03.zip`; `DEV_LANE_SCRIPTURE_R06_3DEVB_MATERIALIZATION_05.zip`.
- DEV-C: D4 branch; `DEV_LANE_SCRIPTURE_R06_3DEVC_INTEGRATION_05.zip`.

Only a `ready_for_final_1196_gate=true` delivery-readiness result authorizes DEV-A to invoke the already-separate `preintegration_gate.py` against exact terminal manifests. Delivery readiness does not duplicate or weaken that content/runtime gate. It does not authorize merging `main`, declaring R06 PASS/AUDIT_READY, or claiming Windows/NVDA acceptance.
