#!/usr/bin/env python3
"""Fail-closed DEV08 validator for readable Gospel registries.

This validator does not create or repair source truth. It verifies that the readable
GitHub materialization preserves the immutable D3 materialization contract.
"""
from __future__ import annotations

import argparse
import collections
import hashlib
import json
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parent
EXPECTED = {
    "witness_matrix": {
        "count": 240,
        "aggregate": "3bf9326213e97e22ccdf2429bf10722c7df4d521457ca1a72dbb96f5430f9261",
        "id_field": "matrix_id",
        "path": ROOT / "registries" / "witness_matrix",
    },
    "sources": {
        "count": 63,
        "aggregate": "9a775d162a68a8858bcb410d1d4160f2363949dcab807b12d30a2bc1c2dc0466",
        "id_field": "source_id",
        "path": ROOT / "registries" / "sources",
    },
    "chronology": {
        "count": 15,
        "aggregate": "98c115fe5fd2b887a14207d3e16e67f5fca62f80ab684ba5b4d370443c2ceb79",
        "id_field": "chronology_id",
        "path": ROOT / "registries" / "chronology",
    },
    "tx1": {
        "count": 3,
        "aggregate": "d872e71bdc2e6c96bcc5867c703e0726d00ac5272e8afefe0c2aced5c8ab0d92",
        "id_field": "tx_id",
        "path": ROOT / "registries" / "tx1",
    },
}
ALLOWED_WITNESSES = {"Matthew", "Mark", "Luke", "John"}
ALLOWED_CONFIDENCE = {"T1", "T2", "C1", "I1", "D1"}


def fail(message: str) -> None:
    raise AssertionError(message)


def canonical_bytes(record: dict[str, Any]) -> bytes:
    return json.dumps(
        record,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def load_jsonl_dir(path: Path) -> tuple[list[dict[str, Any]], list[str]]:
    if not path.is_dir():
        fail(f"missing directory: {path}")
    records: list[dict[str, Any]] = []
    files = sorted(path.glob("*.jsonl"))
    if not files:
        fail(f"no JSONL files: {path}")
    for file in files:
        text = file.read_text(encoding="utf-8")
        if text and not text.endswith("\n"):
            fail(f"JSONL must end with newline: {file}")
        for line_no, line in enumerate(text.splitlines(), 1):
            if not line.strip():
                fail(f"blank JSONL line: {file}:{line_no}")
            try:
                value = json.loads(line)
            except json.JSONDecodeError as exc:
                fail(f"invalid JSON: {file}:{line_no}: {exc}")
            if not isinstance(value, dict):
                fail(f"record is not object: {file}:{line_no}")
            records.append(value)
    return records, [file.relative_to(ROOT).as_posix() for file in files]


def aggregate(records: Iterable[dict[str, Any]], id_field: str) -> str:
    pairs: list[tuple[str, str]] = []
    for record in records:
        record_id = record.get(id_field)
        if not isinstance(record_id, str) or not record_id:
            fail(f"missing/non-string {id_field}: {record!r}")
        record_sha = hashlib.sha256(canonical_bytes(record)).hexdigest()
        pairs.append((record_id, record_sha))
    payload = "".join(f"{record_id}\t{sha}\n" for record_id, sha in sorted(pairs))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def validate_collection(name: str) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    spec = EXPECTED[name]
    records, files = load_jsonl_dir(spec["path"])
    ids = [record.get(spec["id_field"]) for record in records]
    if len(records) != spec["count"]:
        fail(f"{name}: expected {spec['count']} records, got {len(records)}")
    if len(set(ids)) != len(ids):
        dupes = [k for k, v in collections.Counter(ids).items() if v > 1]
        fail(f"{name}: duplicate IDs: {dupes[:20]}")
    got = aggregate(records, spec["id_field"])
    if got != spec["aggregate"]:
        fail(f"{name}: aggregate mismatch expected={spec['aggregate']} got={got}")
    return records, {
        "count": len(records),
        "unique_ids": len(set(ids)),
        "aggregate_sha256": got,
        "files": files,
        "status": "PASS",
    }


def validate_witness_matrix(records: list[dict[str, Any]]) -> dict[str, Any]:
    expected_ids = {f"GW-WM-{n:04d}" for n in range(1, 241)}
    actual_ids = {record["matrix_id"] for record in records}
    if actual_ids != expected_ids:
        fail(
            "witness_matrix: ID domain mismatch "
            f"missing={sorted(expected_ids - actual_ids)[:20]} "
            f"unexpected={sorted(actual_ids - expected_ids)[:20]}"
        )

    witness_counts: collections.Counter[str] = collections.Counter()
    confidence_counts: collections.Counter[str] = collections.Counter()
    tx1_count = 0
    evidence_ids: set[str] = set()
    by_id = {record["matrix_id"]: record for record in records}

    for record in records:
        matrix_id = record["matrix_id"]
        witness = record.get("witness")
        confidence = record.get("confidence")
        tx1 = record.get("TX1")
        evidence_id = record.get("evidence_id")
        if witness not in ALLOWED_WITNESSES:
            fail(f"{matrix_id}: invalid witness {witness!r}")
        if confidence not in ALLOWED_CONFIDENCE:
            fail(f"{matrix_id}: invalid confidence {confidence!r}")
        if tx1 not in {"none", "TX1"}:
            fail(f"{matrix_id}: TX1 must be independent flag, got {tx1!r}")
        if tx1 == "TX1":
            tx1_count += 1
            if not record.get("tx1_note"):
                fail(f"{matrix_id}: TX1 requires tx1_note")
        elif record.get("tx1_note") not in {None, "none"}:
            fail(f"{matrix_id}: non-TX1 record unexpectedly has tx1_note")
        if not isinstance(record.get("not_stated"), str) or not record["not_stated"].strip():
            fail(f"{matrix_id}: missing not_stated boundary")
        if not isinstance(record.get("sequence_boundary"), str) or not record["sequence_boundary"].strip():
            fail(f"{matrix_id}: missing sequence_boundary")
        if not isinstance(evidence_id, str) or not evidence_id.startswith("GW-EV-"):
            fail(f"{matrix_id}: invalid evidence_id {evidence_id!r}")
        if evidence_id in evidence_ids:
            fail(f"{matrix_id}: duplicate evidence binding {evidence_id}")
        evidence_ids.add(evidence_id)
        suffix = matrix_id.removeprefix("GW-WM-")
        if evidence_id != f"GW-EV-{suffix}":
            fail(f"{matrix_id}: evidence suffix mismatch: {evidence_id}")
        witness_counts[witness] += 1
        confidence_counts[confidence] += 1

    if witness_counts != collections.Counter({w: 60 for w in ALLOWED_WITNESSES}):
        fail(f"witness_matrix: witness distribution mismatch: {dict(witness_counts)}")
    if confidence_counts != collections.Counter({"T1": 227, "T2": 13}):
        fail(f"witness_matrix: confidence distribution mismatch: {dict(confidence_counts)}")
    if tx1_count != 10:
        fail(f"witness_matrix: expected 10 TX1 records, got {tx1_count}")

    sentinels = {
        "GW-WM-0090": lambda r: r.get("witness") == "Luke"
        and r.get("witness_relation") == "NO_DIRECT_PARALLEL_IN_ASSIGNED_SCOPE"
        and "Not stated in the cited text" in r.get("not_stated", ""),
        "GW-WM-0107": lambda r: r.get("witness") == "Luke"
        and r.get("passage") == "Luke 9:28"
        and "about eight days" in r.get("explicit_detail", ""),
        "GW-WM-0141": lambda r: r.get("witness") == "John"
        and r.get("witness_relation") == "RELATED_TEMPLE_ACTION_DISTINCT_PLACEMENT"
        and "does not assert" in r.get("not_stated", ""),
        "GW-WM-0167": lambda r: r.get("witness") == "Mark"
        and r.get("passage") == "Mark 15:25"
        and "Do not force" in r.get("sequence_boundary", ""),
        "GW-WM-0171": lambda r: r.get("witness") == "Luke"
        and r.get("TX1") == "TX1"
        and bool(r.get("tx1_note")),
        "GW-WM-0213": lambda r: r.get("witness") == "Mark"
        and r.get("TX1") == "TX1"
        and "longer ending" in r.get("tx1_note", "").lower(),
    }
    for matrix_id, predicate in sentinels.items():
        if matrix_id not in by_id or not predicate(by_id[matrix_id]):
            fail(f"witness_matrix: source-safety sentinel failed: {matrix_id}")

    return {
        "witness_counts": dict(sorted(witness_counts.items())),
        "confidence_counts": dict(sorted(confidence_counts.items())),
        "tx1_records": tx1_count,
        "unique_evidence_bindings": len(evidence_ids),
        "source_safety_sentinels": sorted(sentinels),
        "status": "PASS",
    }


def validate_sources(records: list[dict[str, Any]]) -> dict[str, Any]:
    source_ids = {record["source_id"] for record in records}
    scripture = 0
    tx_reference = 0
    for record in records:
        source_class = record.get("source_class")
        status = record.get("status")
        witness = record.get("witness")
        if witness not in ALLOWED_WITNESSES:
            fail(f"{record['source_id']}: unexpected witness {witness!r}")
        if source_class == "PRIMARY_SCRIPTURE":
            scripture += 1
            if status != "DEVELOPER_SOURCE_AUDITED":
                fail(f"{record['source_id']}: primary source is not DEVELOPER_SOURCE_AUDITED")
        elif source_class == "TEXTUAL_VARIANT_REFERENCE":
            tx_reference += 1
            if status not in {"DEVELOPER_TX_SOURCE_CHECKED", "DEVELOPER_TX_BOUNDARY_RECORDED"}:
                fail(f"{record['source_id']}: invalid textual-variant source status {status!r}")
            if not record.get("grading_boundary"):
                fail(f"{record['source_id']}: textual-variant grading_boundary missing")
        else:
            fail(f"{record['source_id']}: unexpected source_class {source_class!r}")
    if scripture != 60 or tx_reference != 3:
        fail(f"sources: expected 60 primary + 3 TX references, got {scripture} + {tx_reference}")
    return {
        "unique_source_ids": len(source_ids),
        "primary_scripture": scripture,
        "textual_variant_reference": tx_reference,
        "status": "PASS",
    }


def validate_chronology(records: list[dict[str, Any]]) -> dict[str, Any]:
    if any(record.get("forced_single_answer") is not False for record in records):
        fail("chronology: disputed/local sequences must not be forced to one answer")
    for record in records:
        reconstruction = record.get("historical_reconstruction")
        if not isinstance(reconstruction, dict) or reconstruction.get("status") != "NOT_ASSERTED_AS_CANONICAL_FACT":
            fail(f"{record['chronology_id']}: historical reconstruction boundary missing")
    return {"forced_single_answer_true": 0, "status": "PASS"}


def validate_tx1(records: list[dict[str, Any]], source_ids: set[str]) -> dict[str, Any]:
    for record in records:
        if record.get("confidence_relation") != "TX1 is separate from T1/T2/D1.":
            fail(f"{record['tx_id']}: TX1/confidence separation text changed")
        if not record.get("grading_rule"):
            fail(f"{record['tx_id']}: grading_rule missing")
        missing_sources = set(record.get("source_ids", [])) - source_ids
        if missing_sources:
            fail(f"{record['tx_id']}: missing source references {sorted(missing_sources)}")
    return {"tx1_registry_records": len(records), "status": "PASS"}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true", help="emit JSON report")
    args = parser.parse_args()

    report: dict[str, Any] = {
        "validator": "DEV08_GOSPEL_REGISTRY_VALIDATOR_v1",
        "root": ROOT.as_posix(),
        "collections": {},
        "checks": {},
    }
    loaded: dict[str, list[dict[str, Any]]] = {}
    for name in ("witness_matrix", "sources", "chronology", "tx1"):
        records, result = validate_collection(name)
        loaded[name] = records
        report["collections"][name] = result

    report["checks"]["witness_matrix"] = validate_witness_matrix(loaded["witness_matrix"])
    report["checks"]["sources"] = validate_sources(loaded["sources"])
    report["checks"]["chronology"] = validate_chronology(loaded["chronology"])
    report["checks"]["tx1"] = validate_tx1(
        loaded["tx1"], {record["source_id"] for record in loaded["sources"]}
    )
    report["status"] = "PASS"

    if args.json:
        print(json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2))
    else:
        print("DEV08_GOSPEL_REGISTRY_VALIDATOR_PASS")
        for name, result in report["collections"].items():
            print(f"{name}: count={result['count']} aggregate={result['aggregate_sha256']}")
        print(
            "witnesses="
            + json.dumps(report["checks"]["witness_matrix"]["witness_counts"], sort_keys=True)
            + f" tx1_matrix_records={report['checks']['witness_matrix']['tx1_records']}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
