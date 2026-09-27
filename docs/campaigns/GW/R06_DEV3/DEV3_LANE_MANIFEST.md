# R06 DEV3 — Gospel Witness / Chronology lane manifest

**Lane:** DEV3 — Gospels / Jesus events / parallel witnesses / chronology / evidence  
**Branch:** `r06-dev3-gospels-witnesses`  
**Exact base HEAD:** `bbc681db9701fa39dbe757dda8f2e341ea4e3c5b`  
**Global main modified:** NO  
**Global AUDIT_READY set:** NO

## Authored candidate

DEV3 authored a separate `GW` (Gospel Witnesses) campaign candidate containing **15 coherent mission families and 360 substantive canonical CONTENT_NODE_SCHEMA v1.2 nodes**. Each mission has 24 nodes. The candidate is developer source-audited and remains independent-audit pending.

Campaign families: baptism/temptation; calling disciples; paralytic; Jairus/bleeding woman; feeding 5,000; walking on the sea; confession/transfiguration; Jerusalem entry; temple actions; Roman trial distinctions; crucifixion distinctions; burial; empty-tomb discovery; resurrection appearances; commission/closing narratives.

Hard witness rule is preserved: Matthew, Mark, Luke, and John remain separate witness scopes. Cross-witness claims are explicitly comparison tasks. Project display order is C1, not T1. Disputed merged chronology is D1. TX1 remains separate from confidence.

## Counts

- canonical nodes: 360
- missions: 15
- witness-matrix records: 240
- reusable Evidence records: 240
- Claim records: 360
- Event records: 15
- WitnessRelation records: 240
- TX1 nodes: 22
- confidence counts: T1=242, T2=108, D1=10
- exact prompt duplicates: 0
- semantic/task/evidence duplicate fingerprints: 0
- deterministic validation gates: 23/23 PASS

All requested task types are present: SINGLE_CHOICE, MULTI_SELECT, SHORT_TEXT, LONG_TEXT, COMBOBOX_SELECT, ORDERING, MATCHING, EVIDENCE_SELECT, SPEAKER_RECIPIENT, PARALLEL_WITNESS_COMPARE, CLAIM_EVIDENCE, COMPOSITE_MULTI_STEP.

## Full lane changed-file candidate

The full candidate is transferred in `DEV_LANE_SCRIPTURE_R06_D3.zip` under `CHANGED_FILES/docs/campaigns/GW/R06_DEV3/`. Integration must verify the package hashes before importing these files. This lane manifest intentionally does not overwrite shared LN/PA/platform/engine files.

Expected candidate files and SHA-256:

- `GW_MISSIONS_PART_01_v1.0.json` — `4262d8b04b810ed3df6fd363379f2bab4d06e55512d2f7548696b14c84e40c3f`
- `GW_MISSIONS_PART_02_v1.0.json` — `cbbc92c7dc24d57fceba490be26be006d346b0f872f0cd404bf54915c74c3507`
- `GW_MISSIONS_PART_03_v1.0.json` — `b28dde5e56dab357eb965f59736239a3c136675f097c4bb1aa339d8eb76464bb`
- `GW_WITNESS_MATRIX_v1.0.json` — `68dd8aa119528591ca50b29a25051fb9a1a6980274146ff622a648f375acb055`
- `GW_CHRONOLOGY_REGISTRY_v1.0.json` — `1cbe8abac67d42153839f746347ceb187d902976efc218ba5b9b1b8e07524306`
- `GW_EVIDENCE_BOARD_REGISTRY_v1.0.json` — `770fcbea7103f6fc5bb1b3620924fb065ad796b8405d1e7ec4b978170ee0de41`
- `GW_SOURCE_REGISTRY_v1.0.json` — `15bdf1afe3886689a05c49da66b9ce2dce7eb1584a4a4ad7314876d60945cf81`
- `GW_TX1_REGISTRY_v1.0.json` — `f07fa7c912204ac0da7c48c71efd934d11937664e625d9b5dd59b43e736e91c1`
- `GW_MANIFEST_v1.0.json` — `a4611f863dd7d8f634372dab67048f5111f89775a2a26a3a0e29c9108ce96589`

## Source / TX1 boundaries

Primary Scripture audit basis: World English Bible Updated (WEBU), eBible.org, with passage-level provenance records. No external historical claim is graded as Scripture in this lane.

Named TX1 traceability is recorded for:
- John 1:34 title variation; GW-01 grades only the act of seeing/testifying, not the variant title.
- Luke 23:34a; responsible editions that include, bracket, footnote, or omit the saying are not penalized.
- Mark 16:9–20; every node using the traditional longer ending exposes TX1 before grading and accepts responsible editions that bracket, footnote, or omit the longer ending.

## Integration rule

Do not merge this manifest as a substitute for the full candidate data. The integration owner should take the exact hashed files from the lane package, rerun the independent source/schema/duplicate/TX1/evidence validators, then commit the verified GW data in the integration pass. Any shared schema/runtime need is an integration request, not a DEV3 shared-file edit.
