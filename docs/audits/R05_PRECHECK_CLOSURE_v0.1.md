# R05 GitHub precheck closure — developer report v0.1

**Round:** DEV R05 corrective resubmission  
**Independent audit:** pending

## Findings consumed
The developer consumed the R05 GitHub precheck addenda and the authoritative Drive handoff. PRE-R05-001..004 were corrected first; `AUDIT_R05_GITHUB_RECHECK_ADDENDUM_02.zip` then identified PRE-R05-005 HIGH: the main canonical validator had to consume the semantic/evidence correction sidecars itself rather than relying on a separate correction-only validator.

## Developer corrections
1. **PRE-R05-001 — right-ear/healing provenance**
   - Effective LN11-N02/N03/N07 records state that **John 18:10 and Luke 22:50 both explicitly identify the right ear**.
   - John 18:10 additionally names Simon Peter and Malchus.
   - Luke 22:51 is the healing-specific fact in the assigned comparison.
   - Matthew 26:51 and Mark 14:47 remain ear references without right-side detail.
   - Matching evidence corrections cover EVR-R05-0062, 0063 and 0067.

2. **PRE-R05-002 — TX1 contradiction**
   - Effective LN11-N04 and EVR-R05-0064 use `textual_variant_flag=TX1`.
   - The player-visible source scope begins with a pre-grading TX1 notice for Mark-specific rooster wording and points to the existing R05 TX1 traceability file.

3. **PRE-R05-003 — D1/T2 contradiction**
   - Effective LN11-N09 and EVR-R05-0069 use `confidence_code=D1`.
   - The wording separates the direct Luke 22:66 daybreak anchor from the D1/not-established merged cross-Gospel chronology.

4. **PRE-R05-004 — project order mislabeled T1**
   - Effective LN11-N01 and EVR-R05-0061 use `confidence_code=C1`.
   - The node identifies its sequence as a project/campaign contract rather than a direct Scriptural proposition.

5. **PRE-R05-005 — canonical consumer ignored correction layers**
   - `tools/validate_canonical_missions_and_nodes.py` now loads `PRE_R05_SEMANTIC_CORRECTIONS_v1.0.json` and applies it to each base node **before** any pedagogy overlay.
   - The same main validator now loads the 93-record evidence registry, applies `R05_EVIDENCE_PROVENANCE_CORRECTIONS_v0.1.json`, validates correction targets and validates the effective evidence records.
   - Effective precedence is deterministic: `base canonical record → semantic correction → pedagogy overlay`; evidence uses `base evidence record → evidence correction`.
   - The main validator enforces the exact PRE-R05 contract for LN11-N01/N02/N03/N04/N07/N09 and EVR-R05-0061/0062/0063/0064/0067/0069, including C1/TX1/D1 pair consistency.
   - `tools/test_r05_effective_canonical_state.py` is an executable positive/negative regression. Its good fixture proves all 6 node and 6 evidence targets are consumed by the main validator; negative fixtures prove a broken LN11-N04 TX1 correction and broken EVR-R05-0069 D1 correction are rejected.

## Precedence and traceability
Historical R05 shards remain byte-preserved. Corrections are explicit sidecar layers governed by `R05_SEMANTIC_CORRECTION_PRECEDENCE_v1.0.md`. The older pedagogy overlay rule remains unchanged and is applied after semantic correction. No silent historical replacement is introduced.

## Validation contract
The main validator now reports counts for mission indexes, JSON nodes, semantic corrections, pedagogy overlays, evidence indexes, evidence records, evidence corrections, PRE-R05 node targets and PRE-R05 evidence targets. For the intended R05 tree the acceptance target is:
- 10 mission indexes;
- 154 JSON canonical nodes;
- 6 semantic corrections;
- 63 pedagogy overlays;
- 1 evidence index / 93 evidence records / 6 evidence corrections;
- PRE-R05 node targets 6/6;
- PRE-R05 evidence targets 6/6;
- 0 validation errors.

Static validation does not substitute for independent semantic/source audit. PRE-R05-005 is **developer-closed / independent audit pending** until the exact corrected R05 package is delivered and re-audited.
