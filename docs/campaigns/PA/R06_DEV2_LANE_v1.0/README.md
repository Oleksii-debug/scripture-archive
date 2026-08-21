# R06 DEV2 — Paul / Acts content lane

Lane owner: WORK-DEVELOPER #2  
Scope: PAUL / ACTS / PA-03…PA-08 / Pauline evidence content only.  
Base HEAD: `bbc681db9701fa39dbe757dda8f2e341ea4e3c5b`  
Branch: `r06-dev2-paul-acts-content`

This isolated lane does not edit the Windows frontend, Gospel lane, OT lane, engine lane, global CURRENT_HANDOFF, or global release status.

## Materialization
- `PA_R06_D2_SOURCE_FACTS_v1.0.json` is represented here as mission-scoped source-fact files for readable review.
- Full CONTENT_NODE_SCHEMA v1.2 materialization is carried in the Drive package `DEV_LANE_SCRIPTURE_R06_D2.zip/CHANGED_FILES/` with deterministic hashes recorded in `MATERIALIZATION_HASHES_v1.0.json`.
- `PA_R06_D2_MANIFEST_v1.0.json` records exact counts.
- `validate_dev2_lane.py` validates the extracted materialized lane package.

## Source-boundary rules
Narrator, Paul's later Acts speeches, embedded letters, and epistolary autobiography remain distinct. Omission is not denial. Acts 11:20 recipient identity and Acts 15:34 are quarantined from forced grading pending separate textual-variant audit. No answer-bearing node in this lane depends on TX1 material.

## Count
386 new authored/source-audited canonical task nodes: PA-03 53; PA-04 63; PA-05 61; PA-06 43; PA-07 61; PA-08 105. New reusable evidence records: 184. Independent audit acceptance: pending.
