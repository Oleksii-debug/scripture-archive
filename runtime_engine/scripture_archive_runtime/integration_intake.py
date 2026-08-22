from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping

from .content import validate_canonical_node
from .materialization_manifest import (
    MaterializationManifestError,
    MaterializationSnapshot,
    validate_materialization_manifest,
)
from .provenance import PROVENANCE_CONTRACT_VERSION, RELEASE_PASS_CLASSES, classify_provenance
from .security import ValidationError
from .transport_contract import CANONICAL_TASK_TYPES


class FinalInputError(ValidationError):
    pass


@dataclass(frozen=True)
class FinalInputExpectation:
    lane: str
    source_package_filename: str
    source_package_drive_id: str
    source_package_sha256: str
    github_branch: str
    github_head: str
    expected_nodes: int
    expected_evidence: int
    expected_relations: int = 0
    content_schema: str = "CONTENT_NODE_SCHEMA_v1.2"
    provenance_contract: str = PROVENANCE_CONTRACT_VERSION


@dataclass(frozen=True)
class ValidatedFinalInput:
    expectation: FinalInputExpectation
    snapshot: MaterializationSnapshot
    node_ids: frozenset[str]
    evidence_ids: frozenset[str]
    relation_ids: frozenset[str]
    provenance_counts: Mapping[str, int]


def _require_equal(actual: Any, expected: Any, label: str) -> None:
    if actual != expected:
        raise FinalInputError(f"{label} mismatch: {actual!r} != {expected!r}")


def _record_id(record: Mapping[str, Any], names: tuple[str, ...], label: str) -> str:
    for name in names:
        value = record.get(name)
        if isinstance(value, str) and value.strip():
            return value.strip()
    raise FinalInputError(f"{label} lacks stable identifier")


def validate_final_input(
    root: str | Path,
    manifest_path: str | Path,
    expectation: FinalInputExpectation,
) -> ValidatedFinalInput:
    try:
        snapshot = validate_materialization_manifest(root, manifest_path)
    except MaterializationManifestError as exc:
        raise FinalInputError(str(exc)) from exc

    manifest = snapshot.manifest
    _require_equal(manifest.get("lane"), expectation.lane, "lane")
    _require_equal(manifest.get("content_schema"), expectation.content_schema, "content_schema")
    _require_equal(manifest.get("provenance_contract"), expectation.provenance_contract, "provenance_contract")

    source = manifest.get("source_package") or {}
    _require_equal(source.get("filename"), expectation.source_package_filename, "source package filename")
    _require_equal(source.get("drive_id"), expectation.source_package_drive_id, "source package drive_id")
    _require_equal(str(source.get("sha256", "")).lower(), expectation.source_package_sha256.lower(), "source package SHA256")

    github = manifest.get("github") or {}
    _require_equal(github.get("branch"), expectation.github_branch, "GitHub branch")
    _require_equal(github.get("head"), expectation.github_head, "GitHub HEAD")

    nodes = snapshot.collection("nodes").records
    evidence = snapshot.collection("evidence").records if "evidence" in snapshot.collections else ()
    relations = snapshot.collection("relations").records if "relations" in snapshot.collections else ()
    _require_equal(len(nodes), expectation.expected_nodes, "node count")
    _require_equal(len(evidence), expectation.expected_evidence, "evidence count")
    _require_equal(len(relations), expectation.expected_relations, "relation count")

    node_ids: set[str] = set()
    evidence_ids: set[str] = set()
    relation_ids: set[str] = set()
    provenance_counts: dict[str, int] = {}

    supported = set(CANONICAL_TASK_TYPES)
    unresolved: list[tuple[str, str]] = []
    for node in nodes:
        try:
            validate_canonical_node(node)
        except Exception as exc:
            node_id = str(node.get("node_id", "<missing>"))
            raise FinalInputError(f"{expectation.lane}:{node_id}: canonical schema validation failed: {exc}") from exc
        node_id = _record_id(node, ("node_id",), "node")
        if node_id in node_ids:
            raise FinalInputError(f"duplicate node_id {node_id}")
        node_ids.add(node_id)

        task_type = str(node.get("task_type") or node.get("response_mode") or node.get("task_family") or "")
        if task_type not in supported:
            from .answer_contracts import canonical_task_type
            task_type = canonical_task_type(task_type)
        if task_type not in supported:
            raise FinalInputError(f"{node_id}: unsupported task type {task_type}")

        decision = classify_provenance(node)
        provenance_counts[decision.provenance_class] = provenance_counts.get(decision.provenance_class, 0) + 1
        if (
            decision.provenance_class not in RELEASE_PASS_CLASSES
            or not decision.release_pass
            or decision.canonical_dto is None
        ):
            raise FinalInputError(
                f"{node_id}: provenance not release-safe: {decision.provenance_class}: {decision.reason}"
            )

    for record in evidence:
        eid = _record_id(record, ("evidence_id", "id"), "evidence record")
        if eid in evidence_ids:
            raise FinalInputError(f"duplicate evidence_id {eid}")
        evidence_ids.add(eid)

    for index, record in enumerate(relations, start=1):
        rid = None
        for field in ("relation_id", "id", "link_id"):
            value = record.get(field)
            if isinstance(value, str) and value.strip():
                rid = value.strip()
                break
        if rid is None:
            rid = f"manifest-relation-{index:06d}"
        if rid in relation_ids:
            raise FinalInputError(f"duplicate relation_id {rid}")
        relation_ids.add(rid)

    for node in nodes:
        node_id = str(node["node_id"])
        required = node.get("required_evidence")
        if isinstance(required, str):
            ids = [part.strip() for part in required.split(";") if part.strip()]
        elif isinstance(required, list):
            ids = [str(item).strip() for item in required if str(item).strip()]
        else:
            ids = []
        for eid in ids:
            if eid not in evidence_ids:
                unresolved.append((node_id, eid))
    if unresolved:
        sample = ", ".join(f"{nid}->{eid}" for nid, eid in unresolved[:5])
        raise FinalInputError(f"unresolved required_evidence refs: {len(unresolved)} ({sample})")

    return ValidatedFinalInput(
        expectation=expectation,
        snapshot=snapshot,
        node_ids=frozenset(node_ids),
        evidence_ids=frozenset(evidence_ids),
        relation_ids=frozenset(relation_ids),
        provenance_counts=dict(sorted(provenance_counts.items())),
    )


def validate_cross_lane_inputs(inputs: list[ValidatedFinalInput]) -> dict[str, Any]:
    seen_nodes: dict[str, str] = {}
    seen_evidence: dict[str, str] = {}
    collisions: list[str] = []
    for item in inputs:
        lane = item.expectation.lane
        for node_id in item.node_ids:
            if node_id in seen_nodes:
                collisions.append(f"node:{node_id}:{seen_nodes[node_id]}:{lane}")
            else:
                seen_nodes[node_id] = lane
        for evidence_id in item.evidence_ids:
            if evidence_id in seen_evidence:
                collisions.append(f"evidence:{evidence_id}:{seen_evidence[evidence_id]}:{lane}")
            else:
                seen_evidence[evidence_id] = lane
    if collisions:
        raise FinalInputError(f"cross-lane stable-ID collisions: {collisions[:10]}")
    return {
        "schema": "R06_FINAL_INPUT_INTAKE_RESULT_v1",
        "lanes": [item.expectation.lane for item in inputs],
        "total_nodes": len(seen_nodes),
        "total_evidence": len(seen_evidence),
        "node_collisions": 0,
        "evidence_collisions": 0,
        "provenance_contract": PROVENANCE_CONTRACT_VERSION,
    }
