#!/usr/bin/env python3
"""Fail-closed DEV08 Gospel evidence-board integrity validator.

The script validates materialized records only. It never authors or normalizes source
claims. Canonical aggregate hashes are pinned to the immutable D3 staging contract.
"""
from __future__ import annotations

import collections
import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
BOARD = ROOT / "evidence_board"
MATRIX = ROOT / "registries" / "witness_matrix"
EXPECTED = {
    "person": (96, "entity_id", "8246ef656e49fc4564ec47ee7c16016c33498df4c5d43bc4214f74d977407643"),
    "place": (100, "entity_id", "fa725887a9a67047f34e5ae3e204ddba05cb876e01cb5ae45e1dfc248288c63e"),
    "event": (15, "entity_id", "b0383e033bc05b5b71ff794648f6f1426033a21a58ef3fffd9af74283b35c5e3"),
    "claim": (360, "claim_id", "aa3a6a1e57fba32f344a48c74b3b5c771ea519188d2426f0e2dc29d0c0449151"),
    "evidence": (240, "evidence_id", "e908835f05b572edea82cfe35460c6aaea8fa8d829e35e308a144b9f357a0335"),
    "witnessrelation": (240, "relation_id", "b749c84525f64acc0ee8f164bb3edd4a3d3061fc525ac7d2d35c1bb5dd9c9086"),
}
WITNESSES = {"Matthew", "Mark", "Luke", "John"}
CONFIDENCE = {"T1", "T2", "C1", "I1", "D1"}


def fail(message: str) -> None:
    raise AssertionError(message)


def canonical_bytes(record: dict[str, Any]) -> bytes:
    return json.dumps(record, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def load_dir(path: Path) -> list[dict[str, Any]]:
    if not path.is_dir():
        fail(f"missing directory: {path}")
    files = sorted(path.glob("*.jsonl"))
    if not files:
        fail(f"no JSONL files: {path}")
    out: list[dict[str, Any]] = []
    for file in files:
        text = file.read_text(encoding="utf-8")
        if text and not text.endswith("\n"):
            fail(f"JSONL must end with newline: {file}")
        for line_no, line in enumerate(text.splitlines(), 1):
            if not line.strip():
                fail(f"blank JSONL line: {file}:{line_no}")
            value = json.loads(line)
            if not isinstance(value, dict):
                fail(f"non-object record: {file}:{line_no}")
            out.append(value)
    return out


def aggregate(records: list[dict[str, Any]], id_field: str) -> str:
    pairs: list[tuple[str, str]] = []
    for record in records:
        rid = record.get(id_field)
        if not isinstance(rid, str) or not rid:
            fail(f"missing/non-string {id_field}: {record!r}")
        pairs.append((rid, hashlib.sha256(canonical_bytes(record)).hexdigest()))
    payload = "".join(f"{rid}\t{digest}\n" for rid, digest in sorted(pairs))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def validate_collection(name: str) -> list[dict[str, Any]]:
    expected_count, id_field, expected_hash = EXPECTED[name]
    records = load_dir(BOARD / name)
    ids = [record.get(id_field) for record in records]
    if len(records) != expected_count:
        fail(f"{name}: expected {expected_count}, got {len(records)}")
    if len(set(ids)) != len(ids):
        dupes = [rid for rid, count in collections.Counter(ids).items() if count > 1]
        fail(f"{name}: duplicate IDs {dupes[:20]}")
    got = aggregate(records, id_field)
    if got != expected_hash:
        fail(f"{name}: aggregate mismatch expected={expected_hash} got={got}")
    return records


def load_matrix() -> dict[str, dict[str, Any]]:
    records = load_dir(MATRIX)
    if len(records) != 240:
        fail(f"witness_matrix prerequisite: expected 240, got {len(records)}")
    by_evidence: dict[str, dict[str, Any]] = {}
    for record in records:
        evidence_id = record.get("evidence_id")
        if evidence_id in by_evidence:
            fail(f"witness_matrix duplicate evidence binding: {evidence_id}")
        by_evidence[evidence_id] = record
    return by_evidence


def main() -> int:
    board = {name: validate_collection(name) for name in EXPECTED}
    matrix = load_matrix()

    evidence_by_id = {r["evidence_id"]: r for r in board["evidence"]}
    relation_by_evidence = {r["evidence_id"]: r for r in board["witnessrelation"]}
    if len(relation_by_evidence) != 240:
        fail("witnessrelation: evidence bindings are not one-to-one")
    if set(evidence_by_id) != set(matrix) or set(relation_by_evidence) != set(matrix):
        fail("evidence/witnessrelation/witness-matrix evidence ID domains differ")

    witness_counts: collections.Counter[str] = collections.Counter()
    confidence_counts: collections.Counter[str] = collections.Counter()
    tx1_evidence = 0
    comparable_fields = (
        "event_id",
        "mission_id",
        "witness",
        "passage",
        "speaker",
        "recipient",
        "place",
        "named_person",
        "explicit_detail",
        "sequence_boundary",
    )
    for evidence_id, evidence in evidence_by_id.items():
        matrix_record = matrix[evidence_id]
        relation = relation_by_evidence[evidence_id]
        for field in comparable_fields:
            if evidence.get(field) != matrix_record.get(field):
                fail(f"{evidence_id}: evidence↔matrix mismatch at {field}")
        if evidence.get("confidence_code") != matrix_record.get("confidence"):
            fail(f"{evidence_id}: confidence mismatch evidence↔matrix")
        matrix_tx1 = matrix_record.get("TX1")
        evidence_tx1 = evidence.get("textual_variant_flag")
        if matrix_tx1 != evidence_tx1:
            fail(f"{evidence_id}: TX1 mismatch evidence↔matrix")
        if matrix_tx1 == "TX1":
            tx1_evidence += 1
            if not evidence.get("tx1_source_ids"):
                fail(f"{evidence_id}: TX1 evidence lacks tx1_source_ids")
        elif evidence.get("tx1_source_ids"):
            fail(f"{evidence_id}: non-TX1 evidence has tx1_source_ids")
        if evidence.get("source_audit_status") != "DEVELOPER_SOURCE_AUDITED / INDEPENDENT_AUDIT_PENDING":
            fail(f"{evidence_id}: invalid source_audit_status")
        if evidence.get("witness") not in WITNESSES:
            fail(f"{evidence_id}: invalid witness {evidence.get('witness')!r}")
        if evidence.get("confidence_code") not in CONFIDENCE:
            fail(f"{evidence_id}: invalid confidence {evidence.get('confidence_code')!r}")

        if relation.get("relation_id") != "GW-WR-" + evidence_id.removeprefix("GW-EV-"):
            fail(f"{evidence_id}: relation suffix mismatch")
        if relation.get("boundary_text") != matrix_record.get("sequence_boundary"):
            fail(f"{evidence_id}: witnessrelation boundary != matrix sequence boundary")
        if relation.get("relation_type") != matrix_record.get("witness_relation"):
            fail(f"{evidence_id}: witnessrelation type != matrix witness_relation")
        for field in ("event_id", "mission_id", "witness", "passage"):
            if relation.get(field) != matrix_record.get(field):
                fail(f"{evidence_id}: witnessrelation↔matrix mismatch at {field}")
        if relation.get("confidence_code") != matrix_record.get("confidence"):
            fail(f"{evidence_id}: witnessrelation confidence mismatch")
        if relation.get("textual_variant_flag") != matrix_record.get("TX1"):
            fail(f"{evidence_id}: witnessrelation TX1 mismatch")

        witness_counts[evidence["witness"]] += 1
        confidence_counts[evidence["confidence_code"]] += 1

    if witness_counts != collections.Counter({w: 60 for w in WITNESSES}):
        fail(f"evidence: witness distribution mismatch {dict(witness_counts)}")
    if confidence_counts != collections.Counter({"T1": 227, "T2": 13}):
        fail(f"evidence: confidence distribution mismatch {dict(confidence_counts)}")
    if tx1_evidence != 10:
        fail(f"evidence: expected 10 TX1 evidence records, got {tx1_evidence}")

    claims = board["claim"]
    claim_ids = {r["claim_id"] for r in claims}
    if claim_ids != {f"GW-CLM-{n:04d}" for n in range(1, 361)}:
        fail("claim ID domain is not GW-CLM-0001..0360")
    node_ids: set[str] = set()
    for claim in claims:
        node_id = claim.get("node_id")
        if not isinstance(node_id, str) or not node_id:
            fail(f"{claim['claim_id']}: missing node_id")
        if node_id in node_ids:
            fail(f"claim: duplicate node binding {node_id}")
        node_ids.add(node_id)
        required = claim.get("required_evidence")
        if not isinstance(required, list) or not required:
            fail(f"{claim['claim_id']}: required_evidence missing")
        missing = set(required) - set(evidence_by_id)
        if missing:
            fail(f"{claim['claim_id']}: missing evidence refs {sorted(missing)}")
        if claim.get("confidence_code") not in CONFIDENCE:
            fail(f"{claim['claim_id']}: invalid confidence")
        if claim.get("textual_variant_flag") not in {"none", "TX1"}:
            fail(f"{claim['claim_id']}: invalid TX1 flag")

    events = board["event"]
    if any(r.get("chronology_confidence") not in {"T2", "D1"} for r in events):
        fail("event: chronology confidence must retain direct-comparison/disputed boundary")
    if any(not r.get("nonvisual_equivalent") for r in events):
        fail("event: nonvisual_equivalent required")

    for entity_name in ("person", "place"):
        for entity in board[entity_name]:
            if not entity.get("label") or not entity.get("nonvisual_equivalent"):
                fail(f"{entity.get('entity_id')}: accessible entity label/equivalent missing")

    report = {
        "validator": "DEV08_GOSPEL_EVIDENCE_BOARD_VALIDATOR_v1",
        "status": "PASS",
        "counts": {name: len(records) for name, records in board.items()},
        "aggregates": {
            name: EXPECTED[name][2] for name in EXPECTED
        },
        "cross_links": {
            "evidence_matrix_1to1": 240,
            "witnessrelation_matrix_1to1": 240,
            "claim_node_bindings": len(node_ids),
            "tx1_evidence": tx1_evidence,
        },
        "witness_counts": dict(sorted(witness_counts.items())),
        "confidence_counts": dict(sorted(confidence_counts.items())),
    }
    print(json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
