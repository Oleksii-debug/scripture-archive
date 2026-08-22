# FINAL INPUT MANIFEST SCHEMA — DEV-A Stage 05

DEV-A final preintegration accepts DEV-B/DEV-C inputs only after readable GitHub materializations satisfy `R06_RECORD_HASH_MATERIALIZATION_MANIFEST_v1`.

Pinned dimensions: exact immutable source-package filename/Drive ID/SHA256; exact final GitHub branch/HEAD; `CONTENT_NODE_SCHEMA_v1.2`; `GROUND_TRUTH_PROVENANCE_v1`; exact node/evidence/relation counts; complete stable-ID sets; canonical per-record SHA256 indexes and aggregate hashes; zero cross-lane node/evidence ID collisions; zero unresolved `required_evidence`; all task types supported by the 14-type runtime contract; and only release-pass provenance classes.

Expected final candidate totals after D2+D3+D4 are authoritative: D2 386 nodes / 184 evidence; D3 360 nodes / 240 evidence; D4 450 nodes / 90 evidence / 24 OT↔NT relations; total 1196 nodes / 514 evidence.

Implementation: `scripture_archive_runtime.integration_intake`. Source-package or HEAD mismatch is rejected rather than silently consuming stale materialization.
