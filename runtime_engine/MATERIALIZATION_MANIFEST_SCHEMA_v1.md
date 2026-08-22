# R06 Stage 05 record-hash materialization manifest v1

Schema: `R06_RECORD_HASH_MATERIALIZATION_MANIFEST_v1`.

The immutable Drive source ZIP and its SHA256 remain byte-level source evidence. GitHub may split large collections only at record boundaries and must preserve every JSON record exactly at data/semantic level.

Canonical per-record hashing uses UTF-8 JSON with `ensure_ascii=false`, recursively sorted object keys, compact separators `,` and `:`, `allow_nan=false`, unchanged values, and no trailing newline in the record-hash input. SHA256 of those bytes is the record hash. Collection aggregate SHA256 is computed over canonical JSON for the stable-ID-sorted array of `{id,sha256}` records.

Required manifest fields: `schema`, `canonical_json_method`, `lane`, `campaign_id`, `content_schema`, `provenance_contract`, `source_package` (`filename`, `drive_id`, `sha256`), `github` (`branch`, `head`), `counts`, and `collections`.

Each collection declares `container_key`, `id_fields`, exact `count`, connector-safe `parts`, complete `record_hashes`, and `aggregate_sha256`. `allow_generated_keys` is allowed only for source records that genuinely lack a stable identifier; the generated key is manifest metadata and never mutates the record. Each part is directly readable UTF-8 JSON and contains complete records. Optional `record_ids` must exactly match readback order.

Fail closed on unsafe paths, non-UTF-8/invalid JSON, oversized parts, duplicate IDs, missing/extra IDs, per-record hash mismatch, aggregate/count mismatch, source-package mismatch, GitHub HEAD mismatch, unsupported schema/task type/provenance, unresolved required evidence, adapter-inferred truth, semantic mismatch, or ambiguity.

`ReadableMaterializationLoader` exposes verified split records to the semantic platform without depending on historical giant-file boundaries. This contract does not publish constructor drafts and does not authorize merging `main`.
