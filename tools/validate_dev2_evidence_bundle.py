#!/usr/bin/env python3
"""Fail-closed qualification for the composed R06 W2-24 D2 evidence bundle.

This validator intentionally treats the independently-qualified materializer output
as immutable evidence authority. It does not promote independent-audit status and
it does not make the evidence bundle player-facing content.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import Any

BUNDLE_REL = Path("docs/campaigns/PA/R06_DEV2_MATERIALIZATION_05")
DONOR_COMMIT = "e1f2e98a2c074663218de4954efa19458f8714f9"
EXPECTED_AGGREGATE = "88e197fd1c91b7787040e81bdd066d959d42b8ba64ac01acac667ffd8ad346ba"
EXPECTED_RECORD_COUNT = 184
EXPECTED_MISSION_COUNTS = {
    "PA-03": 23,
    "PA-04": 25,
    "PA-05": 37,
    "PA-06": 26,
    "PA-07": 37,
    "PA-08": 36,
}
EXPECTED_RAW_SHA256 = {
    "evidence/part_001.jsonl": "2348bec5eda878762293b3218dc30a6b458d6f61907fd541631072243329fb7e",
    "evidence/part_002.jsonl": "bd6724fc4e0951ce7aa2150d658419c1013b4f802de72252aeab0f6fe67fff82",
    "evidence/part_003.jsonl": "411985a7b3b76d81675cdc7538779b7fe68cf5c7064e83c4529af92a9898fa55",
    "evidence_hash_index.json": "59319a4c05ccfb6c548ef4aaf583dc866ac758c01af5ec243ec3d6f541a62cbe",
    "mission_metadata.json": "252c784687a083fd95a7de38ad89e1d4fcef3983d160e5b1aa3748d85f610fb3",
}
EXPECTED_CANONICAL_STATUS = (
    "AUTHOR_COMPLETE / DEVELOPER_SOURCE_AUDITED / PREINTEGRATION_REPAIRED / "
    "INDEPENDENT_AUDIT_PENDING"
)
EXPECTED_SOURCE_AUDIT_STATUS = "DEVELOPER_SOURCE_AUDITED / INDEPENDENT_AUDIT_PENDING"
REQUIRED_RECORD_STRINGS = (
    "evidence_id",
    "canonical_label",
    "claim",
    "source_passage",
    "source_audit_status",
    "provenance_notes",
    "grading_contract_version",
    "forbidden_overclaims",
)


class BundleError(ValueError):
    pass


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _canonical_sha256(value: Any) -> str:
    return _sha256_bytes(
        json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    )


def _load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise BundleError(f"cannot load JSON {path}: {exc}") from exc


def validate_bundle(repo_root: Path, *, enforce_raw_pins: bool = True) -> dict[str, Any]:
    root = repo_root / BUNDLE_REL
    if not root.is_dir():
        raise BundleError(f"missing D2 evidence bundle: {root}")

    if enforce_raw_pins:
        for rel, expected in EXPECTED_RAW_SHA256.items():
            path = root / rel
            if not path.is_file():
                raise BundleError(f"missing pinned bundle file: {rel}")
            actual = _sha256_bytes(path.read_bytes())
            if actual != expected:
                raise BundleError(f"raw SHA256 mismatch for {rel}: {actual} != {expected}")

    index = _load_json(root / "evidence_hash_index.json")
    if not isinstance(index, dict):
        raise BundleError("evidence_hash_index.json must be an object")
    if index.get("record_count") != EXPECTED_RECORD_COUNT:
        raise BundleError(f"record_count must remain {EXPECTED_RECORD_COUNT}")
    if index.get("aggregate_sha256") != EXPECTED_AGGREGATE:
        raise BundleError("aggregate SHA256 is not the qualified W2-24 authority")
    serialization = index.get("serialization")
    if serialization != {
        "encoding": "UTF-8",
        "ensure_ascii": False,
        "sort_keys": True,
        "separators": [",", ":"],
    }:
        raise BundleError("canonical evidence serialization contract changed")

    expected: dict[str, tuple[str, str]] = {}
    records_index = index.get("records")
    if not isinstance(records_index, list):
        raise BundleError("evidence index records must be a list")
    for item in records_index:
        if not isinstance(item, dict):
            raise BundleError("evidence index entry must be an object")
        evidence_id = item.get("id")
        digest = item.get("sha256")
        part = item.get("part")
        if not isinstance(evidence_id, str) or not evidence_id:
            raise BundleError("evidence index entry has invalid id")
        if evidence_id in expected:
            raise BundleError(f"duplicate evidence index id: {evidence_id}")
        if not isinstance(digest, str) or len(digest) != 64:
            raise BundleError(f"invalid indexed SHA256 for {evidence_id}")
        try:
            int(digest, 16)
        except ValueError as exc:
            raise BundleError(f"non-hex indexed SHA256 for {evidence_id}") from exc
        if part not in {"evidence/part_001.jsonl", "evidence/part_002.jsonl", "evidence/part_003.jsonl"}:
            raise BundleError(f"unexpected evidence part for {evidence_id}: {part}")
        expected[evidence_id] = (digest.lower(), part)
    if len(expected) != EXPECTED_RECORD_COUNT:
        raise BundleError(f"index must contain {EXPECTED_RECORD_COUNT} unique records")

    actual: dict[str, tuple[str, str, dict[str, Any]]] = {}
    mission_counts: Counter[str] = Counter()
    cross_links: list[tuple[str, str]] = []
    for rel in ("evidence/part_001.jsonl", "evidence/part_002.jsonl", "evidence/part_003.jsonl"):
        path = root / rel
        if not path.is_file():
            raise BundleError(f"missing evidence part: {rel}")
        for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if not line.strip():
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError as exc:
                raise BundleError(f"invalid JSONL at {rel}:{line_number}: {exc.msg}") from exc
            if not isinstance(record, dict):
                raise BundleError(f"record at {rel}:{line_number} must be an object")
            for field in REQUIRED_RECORD_STRINGS:
                if not isinstance(record.get(field), str) or not record[field].strip():
                    raise BundleError(f"{rel}:{line_number} invalid required field {field}")
            evidence_id = record["evidence_id"]
            if evidence_id in actual:
                raise BundleError(f"duplicate evidence record id: {evidence_id}")
            if record["source_audit_status"] != "SOURCE_AUDITED":
                raise BundleError(f"unexpected evidence source_audit_status for {evidence_id}")
            campaigns = record.get("usable_by_campaigns")
            if not isinstance(campaigns, list) or not all(isinstance(v, str) for v in campaigns):
                raise BundleError(f"invalid usable_by_campaigns for {evidence_id}")
            mission_ids = [value for value in campaigns if value in EXPECTED_MISSION_COUNTS]
            if len(mission_ids) != 1 or "PA" not in campaigns:
                raise BundleError(f"{evidence_id} must bind exactly one PA-03..PA-08 mission plus PA")
            mission_counts[mission_ids[0]] += 1
            links = record.get("cross_links")
            if not isinstance(links, list) or not all(isinstance(v, str) and v for v in links):
                raise BundleError(f"invalid cross_links for {evidence_id}")
            cross_links.extend((evidence_id, target) for target in links)
            actual[evidence_id] = (_canonical_sha256(record), rel, record)

    if len(actual) != EXPECTED_RECORD_COUNT:
        raise BundleError(f"bundle must contain {EXPECTED_RECORD_COUNT} unique evidence records")
    if dict(mission_counts) != EXPECTED_MISSION_COUNTS:
        raise BundleError(f"mission evidence counts changed: {dict(mission_counts)}")
    if set(actual) != set(expected):
        missing = sorted(set(expected) - set(actual))
        extra = sorted(set(actual) - set(expected))
        raise BundleError(f"evidence ID set mismatch; missing={missing[:5]} extra={extra[:5]}")
    for evidence_id, (digest, rel, _) in actual.items():
        indexed_digest, indexed_part = expected[evidence_id]
        if digest != indexed_digest:
            raise BundleError(f"canonical SHA256 mismatch for {evidence_id}")
        if rel != indexed_part:
            raise BundleError(f"indexed part mismatch for {evidence_id}: {indexed_part} != {rel}")
    unknown_links = sorted({target for _, target in cross_links if target not in actual})
    if unknown_links:
        raise BundleError(f"cross_links reference unknown evidence IDs: {unknown_links[:10]}")

    aggregate = _sha256_bytes(
        "".join(f"{evidence_id}\t{actual[evidence_id][0]}\n" for evidence_id in sorted(actual)).encode("utf-8")
    )
    if aggregate != EXPECTED_AGGREGATE:
        raise BundleError(f"recomputed aggregate mismatch: {aggregate}")

    missions = _load_json(root / "mission_metadata.json")
    if not isinstance(missions, list) or len(missions) != len(EXPECTED_MISSION_COUNTS):
        raise BundleError("mission_metadata must contain exactly PA-03..PA-08")
    seen_missions: set[str] = set()
    for item in missions:
        if not isinstance(item, dict):
            raise BundleError("mission_metadata entry must be an object")
        mission_id = item.get("mission_id")
        if mission_id not in EXPECTED_MISSION_COUNTS or mission_id in seen_missions:
            raise BundleError(f"unexpected or duplicate mission metadata id: {mission_id}")
        seen_missions.add(mission_id)
        metadata = item.get("metadata")
        if not isinstance(metadata, dict):
            raise BundleError(f"missing metadata object for {mission_id}")
        if metadata.get("canonical_status") != EXPECTED_CANONICAL_STATUS:
            raise BundleError(f"{mission_id} canonical_status changed or was promoted")
        mission = metadata.get("mission")
        if not isinstance(mission, dict) or mission.get("mission_id") != mission_id:
            raise BundleError(f"{mission_id} nested mission identity mismatch")
        if mission.get("source_audit_status") != EXPECTED_SOURCE_AUDIT_STATUS:
            raise BundleError(f"{mission_id} independent-audit status changed or was promoted")
        node_count = metadata.get("node_count")
        task_nodes = mission.get("task_nodes")
        if not isinstance(node_count, int) or node_count <= 0:
            raise BundleError(f"{mission_id} has invalid node_count")
        if not isinstance(task_nodes, list) or len(task_nodes) != node_count or len(set(task_nodes)) != node_count:
            raise BundleError(f"{mission_id} task_nodes do not match node_count")
    if seen_missions != set(EXPECTED_MISSION_COUNTS):
        raise BundleError("mission metadata set is incomplete")

    return {
        "schema": "R06_D2_W2_24_COMPOSED_EVIDENCE_QUALIFICATION_v1",
        "status": "PASS",
        "donor_commit": DONOR_COMMIT,
        "record_count": len(actual),
        "aggregate_sha256": aggregate,
        "mission_evidence_counts": dict(sorted(mission_counts.items())),
        "mission_ids": sorted(seen_missions),
        "independent_audit": "PENDING",
        "player_content_promoted": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    try:
        report = validate_bundle(args.repo_root.resolve())
    except BundleError as exc:
        print(f"D2_W2_24_EVIDENCE_QUALIFICATION_FAIL: {exc}")
        return 1
    print(json.dumps(report, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
