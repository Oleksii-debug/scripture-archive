# R06 SWARM DEV09 — OT / OT↔NT checkpoint — 2026-08-23

Status: WORK_IN_PROGRESS / NOT CLOSURE_READY

Branch: `r06-swarm-dev09-ot-otnt`
Legacy parent verified before first write: `r06-3dev-c-d4-materialization-05@998087dfa52408d2c1a9ab067373a75e8d493764`
Main merge: NO.

## Immutable truth authority

Drive closure: `DEV_LANE_SCRIPTURE_R06_D4_CLOSURE_03.zip`
Drive file ID: `1LSrCc1M8DcqRBwpO2NAVmcB9EzazgMDq`
Closure SHA-256: `c4e8dfe4ea62df2c3d52b810fb2413b31d6dcfd4cc711320beae3258ac6a981a`
Transport payload SHA-256: `e8b008c31462d7ed9388a7a84f73bb8666c8449181000751e9da45c2468779c9`
Canonical node-record aggregate SHA-256: `ffb5fc49efaa42e4cd5b5a665f3b027a427a03498758b6622bb91649ea0dce5f`

Truth set is preserved, not regenerated:
- missions: 15
- nodes: 450
- evidence: 90
- OT↔NT relations: 24
- dossiers: 15
- duplicate fingerprints: 0
- `OT_NT_LINK` authored truth: 24/24

Independent acceptance is still pending; these counts are developer/source-audited truth counts, not auditor-accepted promotion.

## Source / confidence integrity verified in this run

Closure validators passed locally against the immutable Drive bytes.
Overall D4 node confidence distribution remains:
- T1: 256
- T2: 161
- I1: 27
- D1: 6

For the 24 OT↔NT relations specifically:
- T2: 18
- I1: 5
- D1: 1
- T1: 0

No relation was strengthened for transport. Relation taxonomy, interpretive boundaries, rejected-overclaim guards, TX1 flags, evidence references and nonvisual equivalents remain authored data.

`tools/dev09_validate_d4_otnt_runtime_contract.py` adds a fail-closed integration gate requiring:
- 24/24 relation↔`OT_NT_LINK` bijection;
- exact five-field `ANSWER_DTO_v1` truth shape;
- canonical `accepted_answer` == authored `grading.ot_nt_link`;
- relation passage/category/confidence parity;
- no T1 promotion;
- TX1 parity;
- interpretive-boundary and rejected-overclaim presence;
- functional nonvisual equivalent presence.

`tools/dev09_materialize_d4_readable.py` preserves the already fetched-back N001–N009 records and is prepared to write only missing N010–N450 after exact per-record hash agreement.

## Physical readable-materialization state

GitHub readable layer currently contains physical node records N001–N009 only. Full hash registries for N001–N450, missions, entity registries, evidence, relations and dossiers are already present.

Live searches of D4/DEV-C/materialization branches found no later physical N010+ readable source in Git history. The only complete byte authority remains the immutable Drive closure / repository transport payload.

A temporary PR-triggered Actions path was tested twice. Run `32639487134` failed before usable job steps/log data were produced, and older DEV-C PR materialization runs failed in the same event window. The temporary DEV09 workflow files were removed after the experiment and draft PR #66 was closed unmerged. No main path remains open.

Therefore this checkpoint does NOT claim readable-materialization closure and does NOT authorize a Drive closure/integration package.

## Next required gate

1. Materialize exact N010–N450 bytes into the DEV09 isolation branch without changing authored truth.
2. Verify every one of 450 canonical record hashes against the existing hash registries and verify aggregate `ffb5fc49efaa42e4cd5b5a665f3b027a427a03498758b6622bb91649ea0dce5f`.
3. Exact remote fetch-back of the materialized files.
4. Rerun D4 validators plus `dev09_validate_d4_otnt_runtime_contract.py`.
5. Recheck DEV05 runtime and DEV10 integration contracts at their then-live heads.
6. Only after those gates, produce versioned DEV09 closure/integration package, Drive upload/readback, and terminal handoff. Main remains NO.
