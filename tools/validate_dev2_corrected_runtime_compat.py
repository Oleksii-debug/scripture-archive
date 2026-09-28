#!/usr/bin/env python3
"""Read-only compatibility gate for the corrected R06 D2 Paul/Acts authority.

This gate never promotes the D2 corpus and never mutates the packaged-app content
surface. It consumes an exact external authority snapshot, proves its corrected
hash/index/evidence bindings, then runs all 386 nodes through the current-package
runtime and a deterministic preintegration content-pack round trip.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import stat
import sys
import tempfile
import zipfile
from collections import Counter
from pathlib import Path
from typing import Any, Iterable, Mapping

REPO_ROOT = Path(__file__).resolve().parents[1]
RUNTIME_ROOT = REPO_ROOT / "runtime_engine"
TOOLS_ROOT = REPO_ROOT / "tools"
for entry in (RUNTIME_ROOT, TOOLS_ROOT):
    if str(entry) not in sys.path:
        sys.path.insert(0, str(entry))

from scripture_archive_runtime.application import RuntimeApplication
from scripture_archive_runtime.content import ContentRepository
from scripture_archive_runtime.content_packs import (
    CONTENT_PACK_SCHEMA,
    CONTENT_SCHEMA_VERSION,
    MANIFEST_NAME,
    ContentPackStore,
    inspect_content_pack,
)
from scripture_archive_runtime.grading import GraderRegistry
from scripture_archive_runtime.models import Correctness
from scripture_archive_runtime.provenance import canonical_answer_dto, classify_provenance
from scripture_archive_runtime.security import ValidationError
from validate_dev2_evidence_bundle import validate_bundle as validate_composed_evidence

SCHEMA = "R06_D2_CORRECTED_RUNTIME_PREINTEGRATION_v1"
AUTHORITY_SCHEMA = "R06_D2_CORRECTED_NODE_HASH_INDEX_v1"
EXPECTED_NODE_COUNT = 386
EXPECTED_EVIDENCE_COUNT = 184
EXPECTED_NODE_AGGREGATE = "b096d316e07b2b64ac79dfb2c4a3a328e390520fba8ab021c13f7c6f9dbb38d2"
EXPECTED_EVIDENCE_AGGREGATE = "88e197fd1c91b7787040e81bdd066d959d42b8ba64ac01acac667ffd8ad346ba"
EXPECTED_STAGING_ZIP = "b681ea26d985eb754bde02a77254d40ab0920061edb9226fae7921a6740a06c0"
EXPECTED_MISSION_COUNTS = {
    "PA-03": 53,
    "PA-04": 63,
    "PA-05": 61,
    "PA-06": 43,
    "PA-07": 61,
    "PA-08": 105,
}
EXPECTED_PARTS = tuple(f"nodes/part_{index:03d}.jsonl" for index in range(1, 27))
PACKAGE_EVIDENCE_REL = (
    "evidence/part_001.jsonl",
    "evidence/part_002.jsonl",
    "evidence/part_003.jsonl",
    "evidence_hash_index.json",
    "mission_metadata.json",
)
PACK_ID = "r06-d2-paul-acts-preintegration"
PACK_VERSION = "0.6.0-d2pre.1"


class CompatibilityError(ValueError):
    pass


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _canonical_bytes(value: Any) -> bytes:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def _load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise CompatibilityError(f"cannot load JSON {path}: {exc}") from exc


def _require_regular(path: Path, label: str) -> None:
    if path.is_symlink() or not path.is_file():
        raise CompatibilityError(f"missing or unsafe regular file: {label}")


def _reject_symlinks(root: Path) -> None:
    if root.is_symlink() or not root.is_dir():
        raise CompatibilityError(f"missing or unsafe authority root: {root}")
    for path in root.rglob("*"):
        if path.is_symlink():
            raise CompatibilityError(
                f"symlink forbidden in authority snapshot: {path.relative_to(root)}"
            )


def _load_evidence_ids(authority_root: Path) -> set[str]:
    index = _load_json(authority_root / "evidence_hash_index.json")
    if not isinstance(index, Mapping):
        raise CompatibilityError("evidence_hash_index.json must be an object")
    if index.get("record_count") != EXPECTED_EVIDENCE_COUNT:
        raise CompatibilityError("evidence record_count changed")
    if index.get("aggregate_sha256") != EXPECTED_EVIDENCE_AGGREGATE:
        raise CompatibilityError("evidence aggregate changed")
    records = index.get("records")
    if not isinstance(records, list):
        raise CompatibilityError("evidence index records must be a list")
    ids: set[str] = set()
    for row in records:
        if not isinstance(row, Mapping):
            raise CompatibilityError("evidence index row must be an object")
        evidence_id = row.get("id")
        digest = row.get("sha256")
        if not isinstance(evidence_id, str) or not evidence_id:
            raise CompatibilityError("invalid evidence id")
        if evidence_id in ids:
            raise CompatibilityError(f"duplicate evidence id: {evidence_id}")
        if not isinstance(digest, str) or len(digest) != 64:
            raise CompatibilityError(f"invalid evidence SHA256: {evidence_id}")
        ids.add(evidence_id)
    if len(ids) != EXPECTED_EVIDENCE_COUNT:
        raise CompatibilityError("evidence ID cardinality changed")
    return ids


def load_corrected_nodes(authority_root: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    _reject_symlinks(authority_root)
    index = _load_json(authority_root / "D2_CORRECTED_NODE_HASH_INDEX.json")
    if not isinstance(index, Mapping):
        raise CompatibilityError("corrected node hash index must be an object")
    if index.get("schema") != AUTHORITY_SCHEMA:
        raise CompatibilityError("unexpected corrected node hash-index schema")
    if index.get("record_count") != EXPECTED_NODE_COUNT:
        raise CompatibilityError("corrected node record_count changed")
    if index.get("aggregate_sha256") != EXPECTED_NODE_AGGREGATE:
        raise CompatibilityError("corrected node aggregate changed")
    if index.get("historical_staging_zip_sha256") != EXPECTED_STAGING_ZIP:
        raise CompatibilityError("historical staging provenance pin changed")
    if index.get("source_truth_changed") is not False:
        raise CompatibilityError("corrected authority claims source-truth mutation")
    if "INDEPENDENT_AUDIT_PENDING" not in str(index.get("status", "")):
        raise CompatibilityError("corrected authority improperly promotes audit status")

    rows = index.get("records")
    if not isinstance(rows, list):
        raise CompatibilityError("corrected index records must be a list")

    expected: dict[str, tuple[str, str]] = {}
    indexed_parts: set[str] = set()
    for row in rows:
        if not isinstance(row, Mapping):
            raise CompatibilityError("corrected index row must be an object")
        node_id = row.get("id")
        digest = row.get("sha256")
        part = row.get("part")
        if not isinstance(node_id, str) or not node_id:
            raise CompatibilityError("corrected index row has invalid id")
        if node_id in expected:
            raise CompatibilityError(f"duplicate corrected index node: {node_id}")
        if not isinstance(digest, str) or len(digest) != 64:
            raise CompatibilityError(f"invalid corrected SHA256: {node_id}")
        if part not in EXPECTED_PARTS:
            raise CompatibilityError(f"unexpected corrected part for {node_id}: {part}")
        expected[node_id] = (digest.casefold(), str(part))
        indexed_parts.add(str(part))

    if len(expected) != EXPECTED_NODE_COUNT:
        raise CompatibilityError("corrected index unique-node count changed")
    if indexed_parts != set(EXPECTED_PARTS):
        raise CompatibilityError("corrected index does not cover all 26 canonical parts")

    nodes: dict[str, dict[str, Any]] = {}
    mission_counts: Counter[str] = Counter()
    for part in EXPECTED_PARTS:
        path = authority_root / part
        _require_regular(path, part)
        for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if not line.strip():
                continue
            try:
                node = json.loads(line)
            except json.JSONDecodeError as exc:
                raise CompatibilityError(f"invalid node JSONL at {part}:{line_number}") from exc
            if not isinstance(node, dict):
                raise CompatibilityError(f"node at {part}:{line_number} must be an object")
            node_id = node.get("node_id")
            if not isinstance(node_id, str) or not node_id:
                raise CompatibilityError(f"node at {part}:{line_number} has invalid node_id")
            if node_id in nodes:
                raise CompatibilityError(f"duplicate corrected node_id: {node_id}")
            indexed = expected.get(node_id)
            if indexed is None:
                raise CompatibilityError(f"unindexed corrected node: {node_id}")
            digest = _sha256_bytes(_canonical_bytes(node))
            if digest != indexed[0]:
                raise CompatibilityError(f"corrected record SHA256 mismatch: {node_id}")
            if indexed[1] != part:
                raise CompatibilityError(f"corrected part mismatch: {node_id}")
            mission_id = node.get("mission_id")
            if mission_id not in EXPECTED_MISSION_COUNTS:
                raise CompatibilityError(f"unexpected D2 mission_id: {mission_id}")
            mission_counts[str(mission_id)] += 1
            nodes[node_id] = node

    if set(nodes) != set(expected):
        missing = sorted(set(expected) - set(nodes))
        extra = sorted(set(nodes) - set(expected))
        raise CompatibilityError(
            f"corrected node ID set mismatch missing={missing[:5]} extra={extra[:5]}"
        )
    if dict(sorted(mission_counts.items())) != EXPECTED_MISSION_COUNTS:
        raise CompatibilityError(f"mission node counts changed: {dict(mission_counts)}")

    aggregate = _sha256_bytes(
        "".join(
            f"{node_id}\t{_sha256_bytes(_canonical_bytes(nodes[node_id]))}\n"
            for node_id in sorted(nodes)
        ).encode("utf-8")
    )
    if aggregate != EXPECTED_NODE_AGGREGATE:
        raise CompatibilityError(f"recomputed corrected aggregate mismatch: {aggregate}")

    return [nodes[node_id] for node_id in sorted(nodes)], dict(index)


def _verify_evidence_binding(
    nodes: Iterable[Mapping[str, Any]],
    *,
    authority_root: Path,
    repo_root: Path,
) -> tuple[int, dict[str, Any]]:
    evidence_ids = _load_evidence_ids(authority_root)
    missing: list[tuple[str, str]] = []
    for node in nodes:
        required = node.get("required_evidence")
        if not isinstance(required, list) or not all(isinstance(value, str) for value in required):
            raise CompatibilityError(f"{node.get('node_id')}: invalid required_evidence")
        for evidence_id in required:
            if evidence_id not in evidence_ids:
                missing.append((str(node.get("node_id")), evidence_id))
    if missing:
        raise CompatibilityError(f"nodes reference unknown evidence IDs: {missing[:10]}")

    package_root = repo_root / "docs/campaigns/PA/R06_DEV2_MATERIALIZATION_05"
    for rel in PACKAGE_EVIDENCE_REL:
        authority_path = authority_root / rel
        package_path = package_root / rel
        _require_regular(authority_path, f"authority/{rel}")
        _require_regular(package_path, f"package/{rel}")
        if authority_path.read_bytes() != package_path.read_bytes():
            raise CompatibilityError(f"current-package evidence drift: {rel}")

    evidence_report = validate_composed_evidence(repo_root)
    if evidence_report.get("status") != "PASS":
        raise CompatibilityError("current-package D2 evidence validator did not PASS")
    if evidence_report.get("record_count") != EXPECTED_EVIDENCE_COUNT:
        raise CompatibilityError("current-package evidence count changed")
    if evidence_report.get("aggregate_sha256") != EXPECTED_EVIDENCE_AGGREGATE:
        raise CompatibilityError("current-package evidence aggregate changed")
    if evidence_report.get("independent_audit") != "PENDING":
        raise CompatibilityError("current-package evidence audit status was promoted")
    return len(evidence_ids), evidence_report


def _runtime_compatibility(nodes: list[dict[str, Any]]) -> dict[str, Any]:
    try:
        repository = ContentRepository(nodes, adapt_legacy=True, lane="D2")
    except (ValidationError, ValueError, TypeError) as exc:
        raise CompatibilityError(f"current runtime rejected corrected D2 corpus: {exc}") from exc
    tasks = repository.all()
    if len(tasks) != EXPECTED_NODE_COUNT:
        raise CompatibilityError("runtime repository did not retain all corrected nodes")

    grader = GraderRegistry()
    app = RuntimeApplication(repository)
    provenance_counts: Counter[str] = Counter()
    self_grade_failures: list[str] = []
    runtime_load_failures: list[str] = []

    for node_id in sorted(tasks):
        task = tasks[node_id]
        decision = classify_provenance(task.raw)
        provenance_counts[decision.provenance_class] += 1
        if not decision.release_pass:
            raise CompatibilityError(
                f"{node_id}: current runtime provenance rejects corrected node: {decision.reason}"
            )
        try:
            answer = canonical_answer_dto(task.raw)
            result = grader.grade(task, answer)
        except Exception as exc:
            raise CompatibilityError(f"{node_id}: self-grade raised {type(exc).__name__}: {exc}") from exc
        if result.correctness is not Correctness.CORRECT or result.score != 1.0:
            self_grade_failures.append(node_id)
        try:
            response = app.load_task(node_id)
            rendered = response.get("task", {})
            if rendered.get("node_id") != node_id:
                runtime_load_failures.append(node_id)
            if not str(rendered.get("functional_nonvisual_equivalent", "")).strip():
                runtime_load_failures.append(node_id)
        except Exception as exc:
            raise CompatibilityError(f"{node_id}: runtime load raised {type(exc).__name__}: {exc}") from exc

    if self_grade_failures:
        raise CompatibilityError(f"runtime self-grade failed: {self_grade_failures[:10]}")
    if runtime_load_failures:
        raise CompatibilityError(f"runtime task render failed: {runtime_load_failures[:10]}")

    return {
        "repository_nodes": len(tasks),
        "self_grade_correct": EXPECTED_NODE_COUNT,
        "runtime_load_pass": EXPECTED_NODE_COUNT,
        "provenance_classes": dict(sorted(provenance_counts.items())),
    }


def _json_bytes(value: Any) -> bytes:
    return (
        json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"
    ).encode("utf-8")


def write_preintegration_pack(\n    nodes: list[dict[str, Any]],\n    destination: Path,\n    *,\n    expected_node_count: int = EXPECTED_NODE_COUNT,\n) -> dict[str, Any]:
    destination = destination.expanduser().resolve()
    destination.parent.mkdir(parents=True, exist_ok=True)
    payload = _json_bytes({"nodes": nodes})
    payload_name = "content/nodes.json"
    manifest = {
        "schema": CONTENT_PACK_SCHEMA,
        "pack_id": PACK_ID,
        "version": PACK_VERSION,
        "content_schema_version": CONTENT_SCHEMA_VERSION,
        "entry_points": [payload_name],
        "files": {payload_name: _sha256_bytes(payload)},
    }
    manifest_bytes = _json_bytes(manifest)
    with zipfile.ZipFile(
        destination,
        "w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=9,
    ) as archive:
        for name, data in ((MANIFEST_NAME, manifest_bytes), (payload_name, payload)):
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (stat.S_IFREG | 0o644) << 16
            archive.writestr(info, data)

    inspection = inspect_content_pack(destination)
    if inspection.node_count != EXPECTED_NODE_COUNT:
        raise CompatibilityError("content-pack inspector did not see all corrected nodes")
    if inspection.manifest.pack_id != PACK_ID or inspection.manifest.version != PACK_VERSION:
        raise CompatibilityError("content-pack identity drifted")

    with tempfile.TemporaryDirectory() as temp:
        store = ContentPackStore(Path(temp) / "store")
        installed = store.install(destination)
        if installed.node_count != EXPECTED_NODE_COUNT:
            raise CompatibilityError("content-pack store install lost corrected nodes")
        store.activate(PACK_ID, PACK_VERSION)
        if store.active_versions().get(PACK_ID) != PACK_VERSION:
            raise CompatibilityError("content-pack activation did not select D2 preintegration pack")
        installed_payload = (
            Path(temp)
            / "store"
            / "packs"
            / PACK_ID
            / PACK_VERSION
            / payload_name
        )
        roundtrip = ContentRepository.from_json_files(
            [installed_payload],
            adapt_legacy=True,
            lane="D2",
        )
        if len(roundtrip.all()) != EXPECTED_NODE_COUNT:
            raise CompatibilityError("installed content pack runtime reload lost corrected nodes")

    return {
        "pack_id": PACK_ID,
        "version": PACK_VERSION,
        "archive_sha256": _sha256_bytes(destination.read_bytes()),
        "payload_sha256": manifest["files"][payload_name],
        "node_count": inspection.node_count,
        "file_count": inspection.file_count,
    }


def run(authority_root: Path, pack_out: Path) -> dict[str, Any]:
    authority_root = authority_root.expanduser().resolve()
    nodes, index = load_corrected_nodes(authority_root)
    evidence_count, evidence_report = _verify_evidence_binding(
        nodes,
        authority_root=authority_root,
        repo_root=REPO_ROOT,
    )
    runtime_report = _runtime_compatibility(nodes)
    pack_report = write_preintegration_pack(nodes, pack_out)
    return {
        "schema": SCHEMA,
        "status": "COMPATIBILITY_PASS / PROMOTION_BLOCKED",
        "authority": {
            "node_count": len(nodes),
            "corrected_node_aggregate_sha256": index["aggregate_sha256"],
            "evidence_count": evidence_count,
            "evidence_aggregate_sha256": evidence_report["aggregate_sha256"],
            "historical_staging_zip_sha256": EXPECTED_STAGING_ZIP,
            "source_truth_changed": False,
            "independent_audit": "PENDING",
        },
        "current_package_runtime": runtime_report,
        "preintegration_content_pack": pack_report,
        "promotion_allowed": False,
        "promotion_blockers": [
            "final-head D2 hosted qualification must be terminal green",
            "independent D2 QA verdict must be recorded",
            "current-package composition must occur on its canonical lineage after those gates",
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--authority-root", type=Path, required=True)
    parser.add_argument("--pack-out", type=Path, required=True)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    try:
        report = run(args.authority_root, args.pack_out)
    except (CompatibilityError, ValidationError) as exc:
        failure = {"schema": SCHEMA, "status": "FAIL", "error": str(exc)}
        payload = json.dumps(failure, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
        if args.report:
            args.report.parent.mkdir(parents=True, exist_ok=True)
            args.report.write_text(payload, encoding="utf-8")
        print(payload, end="", file=sys.stderr)
        return 1
    payload = json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(payload, encoding="utf-8")
    print(payload, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
