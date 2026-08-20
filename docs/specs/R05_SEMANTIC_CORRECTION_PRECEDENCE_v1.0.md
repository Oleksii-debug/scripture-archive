# R05 semantic correction precedence v1.0

**Status:** R05 pre-production canonical rule; independent audit pending.

## Purpose
The R05 GitHub precheck found four source/confidence/TX1 defects after the historical R05 base shards had already been integrated. This layer preserves those historical shards byte-for-byte while making the corrected effective records explicit and machine-checkable.

## Effective node
For an affected `node_id`, the effective R05 canonical node is:

1. the base node from `LN-11_CANONICAL_v1.2/nodes_r05_part_*.json`;
2. plus the matching patch from `PRE_R05_SEMANTIC_CORRECTIONS_v1.0.json`.

The semantic correction wins only for keys explicitly present in its patch. Unpatched keys remain authoritative in the base node.

For an affected evidence record, the effective record is the base `R05_EVIDENCE_PROVENANCE_REGISTRY_v0.1_part_*.json` record plus the matching patch from `R05_EVIDENCE_PROVENANCE_CORRECTIONS_v0.1.json`.

## Precedence relative to pedagogy overlays
The existing `PEDAGOGY_OVERLAY_PRECEDENCE_v1.0` remains unchanged. Order is:
1. base canonical record;
2. semantic precheck correction, if present;
3. pedagogy overlay, if present and applicable.

R05 semantic corrections are currently restricted to LN-11 and do not overlap the R05 pedagogy overlay missions LN-04/LN-05/LN-09/LN-12.

## Closure invariants
- PRE-R05-001: right ear is explicit in both John 18:10 and Luke 22:50; healing is Luke 22:51-specific in the assigned comparison; Matthew 26:51 and Mark 14:47 do not specify the right side.
- PRE-R05-002: any effective record grading Mark-specific rooster wording exposes TX1 before grading and uses `textual_variant_flag=TX1`.
- PRE-R05-003: the unresolved merged cross-Gospel chronology in LN11-N09/EVR-R05-0069 is D1; Luke 22:66 remains a direct witness-local anchor inside the claim.
- PRE-R05-004: project-defined campaign ordering in LN11-N01/EVR-R05-0061 is C1 project/context metadata, not T1 direct Scripture.
- Historical base shards remain preserved for audit traceability; no silent replacement is allowed.
- Any consumer/auditor using R05 must evaluate effective records after this correction layer.

This is textual-preproduction metadata only and does not authorize production code.
