from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
import re
import stat
from typing import Any, Mapping

from runtime_engine.scripture_archive_runtime.evidence import EvidenceRecord, EvidenceRuntime
from runtime_engine.scripture_archive_runtime.evidence_graph import build_evidence_graph
from runtime_engine.scripture_archive_runtime.models import Confidence


INDEX_NAME = "R05_EVIDENCE_PROVENANCE_REGISTRY_v0.1_INDEX.json"
PART_FILES = (
    "R05_EVIDENCE_PROVENANCE_REGISTRY_v0.1_part_01.json",
    "R05_EVIDENCE_PROVENANCE_REGISTRY_v0.1_part_02.json",
    "R05_EVIDENCE_PROVENANCE_REGISTRY_v0.1_part_03.json",
)
MAX_INDEX_BYTES = 64_000
MAX_PART_BYTES = 1_000_000
MAX_RECORDS = 500
MAX_TEXT = 12_000
INDEX_KEYS = frozenset({
    "registry_version", "round", "status", "purpose", "record_count",
    "lane_counts", "invariants", "part_files",
})
RECORD_KEYS = frozenset({
    "evidence_record_id", "lane", "mission_id", "node_id", "relation",
    "source_scope", "required_evidence", "confidence_code",
    "textual_variant_flag", "claim", "provenance_status", "nonvisual_access",
})
ID_RE = re.compile(r"[A-Z0-9][A-Z0-9._:-]{1,159}\Z")


class EvidenceRegistryError(ValueError):
    pass


def _clean_text(value: Any, field: str, *, max_length: int = MAX_TEXT) -> str:
    if not isinstance(value, str) or not value or value != value.strip() or len(value) > max_length:
        raise EvidenceRegistryError(f"invalid {field}")
    if any(ord(ch) < 32 or ord(ch) == 127 for ch in value):
        raise EvidenceRegistryError(f"invalid {field}")
    return value


def _clean_id(value: Any, field: str) -> str:
    text = _clean_text(value, field, max_length=160)
    if not ID_RE.fullmatch(text):
        raise EvidenceRegistryError(f"invalid {field}")
    return text


def _read_json(path: Path, max_bytes: int) -> Any:
    try:
        info = path.lstat()
    except OSError as exc:
        raise EvidenceRegistryError(f"missing canonical evidence input: {path.name}") from exc
    if stat.S_ISLNK(info.st_mode) or not stat.S_ISREG(info.st_mode):
        raise EvidenceRegistryError(f"canonical evidence input is not a regular file: {path.name}")
    if info.st_size <= 0 or info.st_size > max_bytes:
        raise EvidenceRegistryError(f"canonical evidence input size rejected: {path.name}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise EvidenceRegistryError(f"invalid canonical evidence JSON: {path.name}") from exc


@dataclass(frozen=True)
class RegistryRecordMeta:
    evidence_id: str
    lane: str
    mission_id: str
    node_id: str
    relation: str
    source_scope: str
    required_evidence: str
    provenance_status: str

    def to_dict(self) -> dict[str, str]:
        return {
            "evidence_id": self.evidence_id,
            "lane": self.lane,
            "mission_id": self.mission_id,
            "node_id": self.node_id,
            "relation": self.relation,
            "source_scope": self.source_scope,
            "required_evidence": self.required_evidence,
            "provenance_status": self.provenance_status,
        }


class RegistryEvidenceAdapter:
    """Materialize audited registry records without inventing structured source truth.

    The R05 registry explicitly links evidence to canonical node IDs, but stores
    citations/witness context as prose strings and has no structured entity IDs.
    Therefore passage_refs, witness and entity_ids intentionally remain empty here.
    """

    def __init__(
        self,
        runtime: EvidenceRuntime,
        *,
        node_to_evidence: Mapping[str, tuple[str, ...]],
        metadata: Mapping[str, RegistryRecordMeta],
        attestation: Mapping[str, Any],
    ) -> None:
        self.runtime = runtime
        self.node_to_evidence = {key: tuple(value) for key, value in node_to_evidence.items()}
        self.metadata = dict(metadata)
        self.attestation = json.loads(json.dumps(dict(attestation), ensure_ascii=False))

    @classmethod
    def load(
        cls,
        repo_root: Path,
        runtime: EvidenceRuntime,
        canonical_nodes: Mapping[str, str],
    ) -> "RegistryEvidenceAdapter":
        root = Path(repo_root).resolve()
        evidence_root = (root / "docs" / "evidence").resolve()
        try:
            evidence_root.relative_to(root)
        except ValueError as exc:
            raise EvidenceRegistryError("canonical evidence root escapes repository") from exc

        index = _read_json(evidence_root / INDEX_NAME, MAX_INDEX_BYTES)
        if not isinstance(index, dict) or set(index) != INDEX_KEYS:
            raise EvidenceRegistryError("canonical evidence index shape mismatch")
        if index.get("registry_version") != "v0.1" or index.get("round") != "R05":
            raise EvidenceRegistryError("unsupported canonical evidence registry identity")
        status = _clean_text(index.get("status"), "index.status", max_length=240)
        purpose = _clean_text(index.get("purpose"), "index.purpose", max_length=2000)
        if index.get("part_files") != list(PART_FILES):
            raise EvidenceRegistryError("canonical evidence part set/order mismatch")
        record_count = index.get("record_count")
        if type(record_count) is not int or record_count <= 0 or record_count > MAX_RECORDS:
            raise EvidenceRegistryError("invalid canonical evidence record_count")
        lane_counts = index.get("lane_counts")
        if not isinstance(lane_counts, dict) or not lane_counts:
            raise EvidenceRegistryError("invalid canonical evidence lane_counts")
        clean_lane_counts: dict[str, int] = {}
        for lane, count in lane_counts.items():
            lane_id = _clean_id(lane, "lane")
            if type(count) is not int or count < 0 or count > MAX_RECORDS:
                raise EvidenceRegistryError("invalid canonical evidence lane count")
            clean_lane_counts[lane_id] = count
        if sum(clean_lane_counts.values()) != record_count:
            raise EvidenceRegistryError("canonical evidence lane counts do not match record_count")
        invariants = index.get("invariants")
        if not isinstance(invariants, list) or not invariants or len(invariants) > 32:
            raise EvidenceRegistryError("invalid canonical evidence invariants")
        clean_invariants = [_clean_text(item, "index.invariant", max_length=1000) for item in invariants]

        seen: set[str] = set()
        computed_lanes: dict[str, int] = {}
        node_to_evidence: dict[str, list[str]] = {}
        metadata: dict[str, RegistryRecordMeta] = {}

        for expected_part, part_name in enumerate(PART_FILES, start=1):
            part = _read_json(evidence_root / part_name, MAX_PART_BYTES)
            if not isinstance(part, dict) or set(part) != {"registry_version", "round", "part", "records"}:
                raise EvidenceRegistryError(f"canonical evidence part shape mismatch: {part_name}")
            if part.get("registry_version") != "v0.1" or part.get("round") != "R05" or part.get("part") != expected_part:
                raise EvidenceRegistryError(f"canonical evidence part identity mismatch: {part_name}")
            records = part.get("records")
            if not isinstance(records, list) or len(records) > MAX_RECORDS:
                raise EvidenceRegistryError(f"invalid records array: {part_name}")
            for record in records:
                if not isinstance(record, dict) or set(record) != RECORD_KEYS:
                    raise EvidenceRegistryError("canonical evidence record shape mismatch")
                evidence_id = _clean_id(record.get("evidence_record_id"), "evidence_record_id")
                if evidence_id in seen or evidence_id in runtime.evidence:
                    raise EvidenceRegistryError(f"duplicate evidence_record_id {evidence_id}")
                seen.add(evidence_id)
                lane = _clean_id(record.get("lane"), "lane")
                mission_id = _clean_id(record.get("mission_id"), "mission_id")
                node_id = _clean_id(record.get("node_id"), "node_id")
                if canonical_nodes.get(node_id) != mission_id:
                    raise EvidenceRegistryError(f"registry node/mission is not canonical: {node_id}")
                if not mission_id.startswith(lane + "-"):
                    raise EvidenceRegistryError(f"registry lane/mission mismatch: {node_id}")
                relation = _clean_text(record.get("relation"), "relation", max_length=160)
                source_scope = _clean_text(record.get("source_scope"), "source_scope")
                required_evidence = _clean_text(record.get("required_evidence"), "required_evidence")
                proposition = _clean_text(record.get("claim"), "claim")
                provenance_status = _clean_text(record.get("provenance_status"), "provenance_status", max_length=500)
                confidence_code = _clean_text(record.get("confidence_code"), "confidence_code", max_length=2)
                try:
                    confidence = Confidence(confidence_code)
                except ValueError as exc:
                    raise EvidenceRegistryError(f"invalid confidence_code for {evidence_id}") from exc
                tx_flag = record.get("textual_variant_flag")
                if tx_flag not in {"none", "TX1"}:
                    raise EvidenceRegistryError(f"invalid textual_variant_flag for {evidence_id}")
                if record.get("nonvisual_access") is not True:
                    raise EvidenceRegistryError(f"nonvisual access not guaranteed for {evidence_id}")

                # Deliberately do not parse source_scope/required_evidence strings into
                # passages, witness identities or entities. Those structures are absent
                # from this registry and inference would violate source truth.
                runtime.add_evidence(EvidenceRecord(
                    evidence_id=evidence_id,
                    passage_refs=(),
                    proposition=proposition,
                    confidence=confidence,
                    tx1=tx_flag == "TX1",
                    witness=None,
                    entity_ids=(),
                    relation_ids=(),
                ))
                node_to_evidence.setdefault(node_id, []).append(evidence_id)
                metadata[evidence_id] = RegistryRecordMeta(
                    evidence_id=evidence_id,
                    lane=lane,
                    mission_id=mission_id,
                    node_id=node_id,
                    relation=relation,
                    source_scope=source_scope,
                    required_evidence=required_evidence,
                    provenance_status=provenance_status,
                )
                computed_lanes[lane] = computed_lanes.get(lane, 0) + 1

        if len(seen) != record_count:
            raise EvidenceRegistryError("canonical evidence records do not match index record_count")
        if computed_lanes != clean_lane_counts:
            raise EvidenceRegistryError("canonical evidence records do not match index lane_counts")

        attestation = {
            "schema": "scripture.evidence-registry-attestation.v1",
            "registry_version": "v0.1",
            "round": "R05",
            "status": status,
            "purpose": purpose,
            "record_count": record_count,
            "lane_counts": clean_lane_counts,
            "invariants": clean_invariants,
            "part_files": list(PART_FILES),
            "structured_passage_import": False,
            "structured_entity_import": False,
            "unlock_policy": "CORRECT_EXACT_CANONICAL_NODE_ONLY",
        }
        return cls(
            runtime,
            node_to_evidence={key: tuple(sorted(value)) for key, value in node_to_evidence.items()},
            metadata=metadata,
            attestation=attestation,
        )

    def apply_grade(self, node_id: str, runtime_response: Mapping[str, Any]) -> tuple[str, ...]:
        grade = runtime_response.get("grade") if isinstance(runtime_response, Mapping) else None
        if not isinstance(grade, Mapping) or grade.get("correctness") != "CORRECT":
            return ()
        unlocked: list[str] = []
        for evidence_id in self.node_to_evidence.get(node_id, ()):
            self.runtime.unlock(evidence_id)
            unlocked.append(evidence_id)
        return tuple(unlocked)

    def reveal(self, request_id: str) -> dict[str, Any]:
        graph = build_evidence_graph(self.runtime, include_locked_evidence=False)
        graph_data = graph.to_dict()
        visible_evidence = sorted(
            node["raw_id"]
            for node in graph_data["nodes"]
            if node.get("node_type") == "evidence"
        )
        visible_meta = [self.metadata[evidence_id].to_dict() for evidence_id in visible_evidence]
        linear = list(graph.linearize())
        for meta in visible_meta:
            linear.append(
                "Registry provenance " + meta["evidence_id"] + ": "
                + f"lane={meta['lane']}; mission={meta['mission_id']}; node={meta['node_id']}; "
                + f"relation={meta['relation']}; source_scope={meta['source_scope']}; "
                + f"required_evidence={meta['required_evidence']}; provenance_status={meta['provenance_status']}"
            )
        return {
            "api_version": "runtime.v1",
            "request_id": request_id,
            "schema": graph_data["schema"],
            "evidence_scope": graph_data["evidence_scope"],
            "nodes": graph_data["nodes"],
            "edges": graph_data["edges"],
            "linear": linear,
            "unlocked": visible_evidence,
            "registry": dict(self.attestation),
            "visible_registry_records": visible_meta,
        }
