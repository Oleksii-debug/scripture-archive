from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Mapping


D2_SCHEMA = "SCRIPTURE_ARCHIVE_RECORD_SPLIT_MATERIALIZATION_v1"
MAX_JSONL_BYTES = 512 * 1024


class D2MaterializationLoadError(ValueError):
    pass


def _canonical_bytes(value: Any) -> bytes:
    try:
        return json.dumps(
            value,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
            allow_nan=False,
        ).encode("utf-8")
    except (TypeError, ValueError) as exc:
        raise D2MaterializationLoadError(f"D2 record is not canonical JSON serializable: {exc}") from exc


def _sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _load_json(path: Path) -> Any:
    if path.is_symlink() or not path.is_file():
        raise D2MaterializationLoadError(f"D2 authority file missing or unsafe: {path.name}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise D2MaterializationLoadError(f"cannot parse D2 authority file {path.name}: {exc}") from exc


def _hex_sha256(value: Any, label: str) -> str:
    if not isinstance(value, str) or len(value) != 64:
        raise D2MaterializationLoadError(f"{label} must be SHA256 hex")
    try:
        int(value, 16)
    except ValueError as exc:
        raise D2MaterializationLoadError(f"{label} must be SHA256 hex") from exc
    return value.lower()


def _load_jsonl_records(directory: Path, id_field: str) -> tuple[dict[str, dict[str, Any]], dict[str, str]]:
    if directory.is_symlink() or not directory.is_dir():
        raise D2MaterializationLoadError(f"D2 collection directory missing or unsafe: {directory.name}")
    records: dict[str, dict[str, Any]] = {}
    hashes: dict[str, str] = {}
    files = sorted(directory.glob("*.jsonl"))
    if not files:
        raise D2MaterializationLoadError(f"D2 collection has no JSONL shards: {directory.name}")
    for path in files:
        if path.is_symlink() or not path.is_file():
            raise D2MaterializationLoadError(f"D2 shard is unsafe: {path.name}")
        size = path.stat().st_size
        if size <= 0 or size > MAX_JSONL_BYTES:
            raise D2MaterializationLoadError(f"D2 shard size is invalid: {path.name} ({size})")
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError) as exc:
            raise D2MaterializationLoadError(f"cannot read D2 shard {path.name}: {exc}") from exc
        for line_number, raw in enumerate(text.splitlines(), 1):
            if not raw.strip():
                continue
            try:
                record = json.loads(raw)
            except json.JSONDecodeError as exc:
                raise D2MaterializationLoadError(
                    f"invalid D2 JSONL at {path.name}:{line_number}: {exc.msg}"
                ) from exc
            if not isinstance(record, dict):
                raise D2MaterializationLoadError(f"D2 record at {path.name}:{line_number} is not an object")
            record_id = record.get(id_field)
            if not isinstance(record_id, str) or not record_id.strip() or record_id != record_id.strip():
                raise D2MaterializationLoadError(
                    f"D2 record at {path.name}:{line_number} has invalid {id_field}"
                )
            if record_id in records:
                raise D2MaterializationLoadError(f"duplicate D2 {id_field}: {record_id}")
            records[record_id] = record
            hashes[record_id] = _sha256(_canonical_bytes(record))
    return records, hashes


def _legacy_aggregate(record_hashes: Mapping[str, str]) -> str:
    payload = "".join(
        f"{record_id}\t{record_hashes[record_id]}\n" for record_id in sorted(record_hashes)
    ).encode("utf-8")
    return _sha256(payload)


class LegacyD2MaterializationLoader:
    """Read exact legacy D2 Stage-05 JSONL without weakening the modern manifest verifier.

    The historical manifest's shard filenames predate the final split layout, so
    filenames are not treated as authority. The immutable semantic authority is the
    declared record count plus the aggregate over stable IDs and canonical record
    hashes. Evidence additionally has an explicit per-record hash index. Mission
    metadata is checked against the complete node set before anything is exposed.
    """

    def __init__(self, repo_root: Path, materialization_root: Path | None = None):
        self.repo_root = Path(repo_root).resolve()
        self.root = (
            Path(materialization_root).resolve()
            if materialization_root is not None
            else self.repo_root / "docs" / "campaigns" / "PA" / "R06_DEV2_MATERIALIZATION_05"
        )
        expected_parent = self.repo_root / "docs" / "campaigns" / "PA"
        if self.root.parent != expected_parent.resolve():
            raise D2MaterializationLoadError("D2 materialization root is outside the canonical PA campaign root")
        self._missions: list[dict[str, Any]] | None = None
        self._nodes: dict[str, dict[str, Any]] | None = None
        self._mission_for_node: dict[str, dict[str, Any]] = {}

    def _scan(self) -> None:
        manifest = _load_json(self.root / "MATERIALIZATION_MANIFEST_v1.0.json")
        if not isinstance(manifest, dict) or manifest.get("materialization_schema") != D2_SCHEMA:
            raise D2MaterializationLoadError("unsupported D2 materialization schema")
        collections = manifest.get("collections")
        if not isinstance(collections, dict):
            raise D2MaterializationLoadError("D2 manifest collections are required")
        node_spec = collections.get("nodes")
        evidence_spec = collections.get("evidence")
        if not isinstance(node_spec, dict) or not isinstance(evidence_spec, dict):
            raise D2MaterializationLoadError("D2 manifest nodes/evidence declarations are required")

        nodes, node_hashes = _load_jsonl_records(self.root / "nodes", "node_id")
        expected_node_count = node_spec.get("count")
        if expected_node_count != len(nodes):
            raise D2MaterializationLoadError(
                f"D2 node count mismatch: {len(nodes)} != {expected_node_count}"
            )
        expected_node_aggregate = _hex_sha256(node_spec.get("aggregate_sha256"), "nodes.aggregate_sha256")
        actual_node_aggregate = _legacy_aggregate(node_hashes)
        if actual_node_aggregate != expected_node_aggregate:
            raise D2MaterializationLoadError(
                f"D2 node aggregate mismatch: {actual_node_aggregate} != {expected_node_aggregate}"
            )

        evidence, evidence_hashes = _load_jsonl_records(self.root / "evidence", "evidence_id")
        expected_evidence_count = evidence_spec.get("count")
        if expected_evidence_count != len(evidence):
            raise D2MaterializationLoadError(
                f"D2 evidence count mismatch: {len(evidence)} != {expected_evidence_count}"
            )
        evidence_index = _load_json(self.root / "evidence_hash_index.json")
        if not isinstance(evidence_index, dict) or not isinstance(evidence_index.get("records"), list):
            raise D2MaterializationLoadError("D2 evidence hash index is malformed")
        indexed_hashes: dict[str, str] = {}
        for item in evidence_index["records"]:
            if not isinstance(item, dict) or not isinstance(item.get("id"), str):
                raise D2MaterializationLoadError("D2 evidence hash-index record is malformed")
            record_id = item["id"]
            if record_id in indexed_hashes:
                raise D2MaterializationLoadError(f"duplicate D2 evidence hash-index id: {record_id}")
            indexed_hashes[record_id] = _hex_sha256(item.get("sha256"), f"evidence[{record_id}]")
        if indexed_hashes != evidence_hashes:
            raise D2MaterializationLoadError("D2 evidence per-record hash index does not match materialized evidence")
        expected_evidence_aggregate = _hex_sha256(
            evidence_spec.get("aggregate_sha256"), "evidence.aggregate_sha256"
        )
        index_aggregate = _hex_sha256(evidence_index.get("aggregate_sha256"), "evidence_index.aggregate_sha256")
        actual_evidence_aggregate = _legacy_aggregate(evidence_hashes)
        if len(indexed_hashes) != evidence_index.get("record_count"):
            raise D2MaterializationLoadError("D2 evidence hash-index count mismatch")
        if not (actual_evidence_aggregate == expected_evidence_aggregate == index_aggregate):
            raise D2MaterializationLoadError("D2 evidence aggregate mismatch")

        metadata = _load_json(self.root / "mission_metadata.json")
        if not isinstance(metadata, list) or not metadata:
            raise D2MaterializationLoadError("D2 mission_metadata must be a non-empty array")
        mission_entries: dict[str, dict[str, Any]] = {}
        declared_nodes: set[str] = set()
        for item in metadata:
            if not isinstance(item, dict):
                raise D2MaterializationLoadError("D2 mission metadata entry is not an object")
            mission_id = item.get("mission_id")
            envelope = item.get("metadata")
            if not isinstance(mission_id, str) or not mission_id.strip() or not isinstance(envelope, dict):
                raise D2MaterializationLoadError("D2 mission metadata lacks mission_id/metadata")
            mission_id = mission_id.strip()
            if mission_id in mission_entries:
                raise D2MaterializationLoadError(f"duplicate D2 mission metadata: {mission_id}")
            mission = envelope.get("mission")
            if not isinstance(mission, dict) or mission.get("mission_id") != mission_id:
                raise D2MaterializationLoadError(f"D2 mission metadata identity mismatch: {mission_id}")
            if mission.get("campaign_id") != "PA":
                raise D2MaterializationLoadError(f"D2 mission is outside PA campaign: {mission_id}")
            task_nodes = mission.get("task_nodes")
            if not isinstance(task_nodes, list) or not task_nodes or not all(isinstance(v, str) and v for v in task_nodes):
                raise D2MaterializationLoadError(f"D2 mission task_nodes are invalid: {mission_id}")
            if len(task_nodes) != len(set(task_nodes)):
                raise D2MaterializationLoadError(f"D2 mission task_nodes contain duplicates: {mission_id}")
            overlap = declared_nodes.intersection(task_nodes)
            if overlap:
                raise D2MaterializationLoadError(f"D2 node declared by multiple missions: {sorted(overlap)[:3]}")
            declared_nodes.update(task_nodes)
            entry_node = mission.get("entry_node")
            if entry_node not in task_nodes:
                raise D2MaterializationLoadError(f"D2 entry node is not in task_nodes: {mission_id}")
            entry = {
                "mission_id": mission_id,
                "campaign_id": "PA",
                "campaign_title": "Дорога Павла",
                "title": str(mission.get("title") or mission_id),
                "difficulty": mission.get("difficulty"),
                "entry_node": entry_node,
                "node_count": len(task_nodes),
                "primary_scripture": mission.get("primary_scripture", []),
                "secondary_scripture": mission.get("secondary_scripture", "none"),
                "canonical_status": envelope.get("canonical_status", "unknown"),
                "index_path": str((self.root / "mission_metadata.json").relative_to(self.repo_root)).replace("\\", "/"),
                "accessibility": dict(mission.get("accessibility") or {}),
            }
            mission_entries[mission_id] = entry

        if declared_nodes != set(nodes):
            missing = sorted(set(nodes) - declared_nodes)
            extra = sorted(declared_nodes - set(nodes))
            raise D2MaterializationLoadError(
                f"D2 mission/node set mismatch; undeclared={missing[:5]} missing={extra[:5]}"
            )

        mission_for_node: dict[str, dict[str, Any]] = {}
        for node_id, node in nodes.items():
            mission_id = node.get("mission_id")
            if mission_id not in mission_entries:
                raise D2MaterializationLoadError(f"D2 node references unknown mission: {node_id}")
            if node_id not in set(metadata_entry["metadata"]["mission"]["task_nodes"] for metadata_entry in []):
                pass
            required = node.get("required_evidence", [])
            required_ids = [required] if isinstance(required, str) else list(required or [])
            if not all(isinstance(value, str) and value for value in required_ids):
                raise D2MaterializationLoadError(f"D2 node has invalid required_evidence: {node_id}")
            unknown_evidence = sorted(set(required_ids) - set(evidence))
            if unknown_evidence:
                raise D2MaterializationLoadError(
                    f"D2 node references unknown evidence: {node_id}: {unknown_evidence[:3]}"
                )
            mission_for_node[node_id] = mission_entries[str(mission_id)]

        expected_missions = {"PA-03", "PA-04", "PA-05", "PA-06", "PA-07", "PA-08"}
        if set(mission_entries) != expected_missions:
            raise D2MaterializationLoadError(
                f"D2 mission set mismatch: {sorted(mission_entries)}"
            )
        self._missions = [mission_entries[key] for key in sorted(mission_entries)]
        self._nodes = nodes
        self._mission_for_node = mission_for_node

    def refresh(self) -> None:
        self._scan()

    def _ensure(self) -> None:
        if self._missions is None or self._nodes is None:
            self._scan()

    def list_campaigns(self) -> list[dict[str, Any]]:
        self._ensure()
        return [{
            "campaign_id": "PA",
            "title": "Дорога Павла",
            "mission_count": len(self._missions or []),
            "machine_node_count": len(self._nodes or {}),
        }]

    def list_missions(self, campaign_id: str) -> list[dict[str, Any]]:
        self._ensure()
        if campaign_id != "PA":
            return []
        return [dict(item) for item in self._missions or []]

    def load_node(self, node_id: str) -> dict[str, Any]:
        self._ensure()
        assert self._nodes is not None
        try:
            return dict(self._nodes[node_id])
        except KeyError as exc:
            raise D2MaterializationLoadError(f"unknown D2 canonical node {node_id}") from exc

    def mission_for_node(self, node_id: str) -> dict[str, Any]:
        self._ensure()
        try:
            return dict(self._mission_for_node[node_id])
        except KeyError as exc:
            raise D2MaterializationLoadError(f"no D2 mission for node {node_id}") from exc

    def next_node_id(self, node_id: str, outcome: str = "correct") -> str | None:
        node = self.load_node(node_id)
        field = {"correct": "on_correct", "partial": "on_partial", "incorrect": "on_incorrect"}.get(
            outcome, "on_correct"
        )
        raw = node.get(field)
        if not isinstance(raw, str):
            return None
        candidate = raw.strip()
        self._ensure()
        return candidate if self._nodes is not None and candidate in self._nodes else None
