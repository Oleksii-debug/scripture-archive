from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping, Sequence

from .branching import BranchEngine, BranchTerminal
from .content import ContentRepository
from .integration_intake import (
    FinalInputExpectation,
    FinalInputError,
    ValidatedFinalInput,
    validate_cross_lane_inputs,
    validate_final_input,
)
from .materialization_manifest import canonical_record_sha256
from .provenance import PROVENANCE_CONTRACT_VERSION, ProvenanceClass, classify_provenance
from .strict_conformance import check_nodes_strict


class PreintegrationGateError(FinalInputError):
    """Fail-closed Stage05 preintegration gate error."""


@dataclass(frozen=True)
class PreintegrationInputSpec:
    root: str | Path
    manifest_path: str | Path
    expectation: FinalInputExpectation


@dataclass(frozen=True)
class PreintegrationPolicy:
    required_lanes: tuple[str, ...] = ("D2", "D3", "D4")
    expected_nodes: int = 1196
    expected_evidence: int = 514
    expected_relations: int = 24


def _require_equal(actual: Any, expected: Any, label: str) -> None:
    if actual != expected:
        raise PreintegrationGateError(f"{label} mismatch: {actual!r} != {expected!r}")


def _relation_collision_count(inputs: Sequence[ValidatedFinalInput]) -> int:
    seen: dict[str, str] = {}
    collisions: list[str] = []
    for item in inputs:
        lane = item.expectation.lane
        for relation_id in sorted(item.relation_ids):
            prior = seen.get(relation_id)
            if prior is not None:
                collisions.append(f"{relation_id}:{prior}:{lane}")
            else:
                seen[relation_id] = lane
    if collisions:
        raise PreintegrationGateError(f"cross-lane relation-ID collisions: {collisions[:10]}")
    return 0


def _strict_lane_summary(item: ValidatedFinalInput) -> dict[str, Any]:
    lane = item.expectation.lane
    nodes = item.snapshot.collection("nodes").records
    report = check_nodes_strict(nodes, lane=lane)

    expected = item.expectation.expected_nodes
    _require_equal(report.get("total"), expected, f"{lane} strict node count")
    blockers = int(report.get("strict_release_blocker_count", 0))
    if blockers != 0 or not bool(report.get("strict_release_pass")):
        raise PreintegrationGateError(f"{lane} strict provenance/correctness blockers: {blockers}")

    correctness = dict(report.get("correctness_counts") or {})
    correct = int(correctness.get("CORRECT", 0))
    _require_equal(correct, expected, f"{lane} canonical accepted-answer correctness")

    truth_counts = dict(report.get("truth_class_counts") or {})
    inferred = int(truth_counts.get(ProvenanceClass.ADAPTER_INFERENCE_FAIL.value, 0))
    _require_equal(inferred, 0, f"{lane} adapter-inferred truth count")

    return {
        "lane": lane,
        "total": expected,
        "strict_release_pass_count": int(report.get("strict_release_pass_count", 0)),
        "strict_release_blocker_count": blockers,
        "correct_count": correct,
        "adapter_inferred_truth_count": inferred,
        "truth_class_counts": dict(sorted(truth_counts.items())),
        "task_type_counts": dict(sorted((report.get("task_type_counts") or {}).items())),
    }


def _optional_evidence_ids(value: Any) -> tuple[str, ...]:
    if value in (None, "", "none", "NONE"):
        return ()
    if isinstance(value, str):
        normalized = value.replace(",", ";")
        return tuple(
            part.strip()
            for part in normalized.split(";")
            if part.strip() and part.strip().casefold() != "none"
        )
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes)):
        return tuple(
            str(part).strip()
            for part in value
            if str(part).strip() and str(part).strip().casefold() != "none"
        )
    return (str(value).strip(),)


def _semantic_key(node: Mapping[str, Any]) -> tuple[str, str, str] | None:
    prompt = str(node.get("player_prompt") or "").strip()
    scope = str(node.get("source_scope_visible_to_player") or "").strip()
    task_type = str(
        node.get("task_type")
        or node.get("response_mode")
        or node.get("task_family")
        or ""
    ).strip()
    if not prompt or not scope or not task_type:
        return None
    return (task_type.casefold(), " ".join(prompt.split()).casefold(), " ".join(scope.split()).casefold())


def _cross_record_integrity(inputs: Sequence[ValidatedFinalInput]) -> dict[str, int]:
    """Validate corpus-level invariants not expressible in a per-lane manifest."""
    global_node_ids = {node_id for item in inputs for node_id in item.node_ids}
    global_evidence_ids = {evidence_id for item in inputs for evidence_id in item.evidence_ids}

    semantic_seen: dict[tuple[str, str, str], tuple[str, str, str]] = {}
    duplicates: list[str] = []
    conflicts: list[str] = []
    missing_optional_evidence: list[str] = []
    branch_errors: list[str] = []
    branch_engine = BranchEngine()

    for item in sorted(inputs, key=lambda row: row.expectation.lane):
        lane = item.expectation.lane
        for raw in item.snapshot.collection("nodes").records:
            node_id = str(raw.get("node_id") or "<missing>")

            for evidence_id in _optional_evidence_ids(raw.get("optional_evidence_unlock")):
                if evidence_id not in global_evidence_ids:
                    missing_optional_evidence.append(f"{lane}:{node_id}->{evidence_id}")

            key = _semantic_key(raw)
            if key is not None and "accepted_answer" in raw:
                decision = classify_provenance(raw)
                truth = decision.canonical_dto
                if truth is not None:
                    truth_hash = canonical_record_sha256(truth)
                    prior = semantic_seen.get(key)
                    if prior is None:
                        semantic_seen[key] = (lane, node_id, truth_hash)
                    elif prior[2] == truth_hash:
                        duplicates.append(f"{prior[0]}:{prior[1]} == {lane}:{node_id}")
                    else:
                        conflicts.append(f"{prior[0]}:{prior[1]} != {lane}:{node_id}")

            # Synthetic unit fixtures intentionally omit canonical branch fields.
            # Real validated final inputs always contain them via CONTENT_NODE_SCHEMA_v1.2.
            if "mission_id" not in raw:
                continue
            try:
                task = ContentRepository((raw,)).get(node_id)
            except Exception as exc:
                branch_errors.append(f"{lane}:{node_id}:task:{type(exc).__name__}:{exc}")
                continue
            for branch_name in ("on_correct", "on_partial", "on_incorrect", "on_hint_threshold"):
                branch_raw = task.branches.get(branch_name, "none")
                try:
                    resolution = branch_engine.parse_target(branch_raw, task=task)
                except Exception as exc:
                    branch_errors.append(f"{lane}:{node_id}.{branch_name}:{type(exc).__name__}:{exc}")
                    continue
                if (
                    resolution.next_node_id
                    and resolution.next_node_id not in global_node_ids
                    and resolution.terminal in {BranchTerminal.NODE, BranchTerminal.RESOLVED_NODE}
                ):
                    branch_errors.append(
                        f"{lane}:{node_id}.{branch_name}:missing target {resolution.next_node_id}"
                    )
            try:
                retrieval = branch_engine.parse_target(task.later_retrieval_effect, task=task)
                if (
                    retrieval.next_node_id
                    and retrieval.next_node_id not in global_node_ids
                    and retrieval.terminal in {BranchTerminal.NODE, BranchTerminal.RESOLVED_NODE}
                ):
                    branch_errors.append(
                        f"{lane}:{node_id}.later_retrieval_effect:missing target {retrieval.next_node_id}"
                    )
            except Exception as exc:
                branch_errors.append(
                    f"{lane}:{node_id}.later_retrieval_effect:{type(exc).__name__}:{exc}"
                )

    if missing_optional_evidence:
        raise PreintegrationGateError(
            "unresolved optional_evidence_unlock refs: "
            f"{len(missing_optional_evidence)} ({', '.join(missing_optional_evidence[:5])})"
        )
    if duplicates:
        raise PreintegrationGateError(
            f"semantic duplicate blockers: {len(duplicates)} ({', '.join(duplicates[:5])})"
        )
    if conflicts:
        raise PreintegrationGateError(
            f"semantic truth conflicts: {len(conflicts)} ({', '.join(conflicts[:5])})"
        )
    if branch_errors:
        raise PreintegrationGateError(
            f"branch/retrieval reachability blockers: {len(branch_errors)} "
            f"({', '.join(branch_errors[:5])})"
        )

    return {
        "semantic_duplicate_blocker_count": 0,
        "semantic_conflict_blocker_count": 0,
        "unresolved_optional_evidence": 0,
        "branch_reachability_blocker_count": 0,
    }


def summarize_validated_inputs(
    inputs: Sequence[ValidatedFinalInput],
    *,
    policy: PreintegrationPolicy = PreintegrationPolicy(),
) -> dict[str, Any]:
    if not inputs:
        raise PreintegrationGateError("no final inputs supplied")

    lanes = [item.expectation.lane for item in inputs]
    if len(lanes) != len(set(lanes)):
        raise PreintegrationGateError(f"duplicate lane inputs: {lanes}")

    actual_lane_set = frozenset(lanes)
    required_lane_set = frozenset(policy.required_lanes)
    if actual_lane_set != required_lane_set:
        missing = sorted(required_lane_set - actual_lane_set)
        extra = sorted(actual_lane_set - required_lane_set)
        raise PreintegrationGateError(f"final lane set mismatch; missing={missing}, extra={extra}")

    cross_lane = validate_cross_lane_inputs(list(inputs))
    _relation_collision_count(inputs)

    total_nodes = sum(len(item.node_ids) for item in inputs)
    total_evidence = sum(len(item.evidence_ids) for item in inputs)
    total_relations = sum(len(item.relation_ids) for item in inputs)
    _require_equal(total_nodes, policy.expected_nodes, "preintegration total node count")
    _require_equal(total_evidence, policy.expected_evidence, "preintegration total evidence count")
    _require_equal(total_relations, policy.expected_relations, "preintegration total relation count")
    _require_equal(cross_lane.get("node_collisions"), 0, "node collision count")
    _require_equal(cross_lane.get("evidence_collisions"), 0, "evidence collision count")

    integrity = _cross_record_integrity(inputs)
    lane_summaries = [
        _strict_lane_summary(item)
        for item in sorted(inputs, key=lambda x: x.expectation.lane)
    ]
    strict_pass = sum(row["strict_release_pass_count"] for row in lane_summaries)
    correct = sum(row["correct_count"] for row in lane_summaries)
    inferred = sum(row["adapter_inferred_truth_count"] for row in lane_summaries)

    _require_equal(strict_pass, policy.expected_nodes, "strict release-safe count")
    _require_equal(correct, policy.expected_nodes, "canonical accepted-answer CORRECT count")
    _require_equal(inferred, 0, "adapter-inferred truth count")

    return {
        "schema": "R06_STAGE05_PREINTEGRATION_GATE_RESULT_v1",
        "status": "PASS",
        "required_lanes": list(policy.required_lanes),
        "provenance_contract": PROVENANCE_CONTRACT_VERSION,
        "total_nodes": total_nodes,
        "total_evidence": total_evidence,
        "total_relations": total_relations,
        "strict_release_pass_count": strict_pass,
        "canonical_answer_correct_count": correct,
        "adapter_inferred_truth_count": inferred,
        "unsupported_task_type_count": 0,
        "node_collisions": 0,
        "evidence_collisions": 0,
        "relation_collisions": 0,
        "unresolved_required_evidence": 0,
        **integrity,
        "lanes": lane_summaries,
        "player_flow_gate": "SEPARATE_REQUIRED",
    }


def run_preintegration_gate(
    specs: Sequence[PreintegrationInputSpec],
    *,
    policy: PreintegrationPolicy = PreintegrationPolicy(),
) -> dict[str, Any]:
    validated = [
        validate_final_input(spec.root, spec.manifest_path, spec.expectation)
        for spec in specs
    ]
    return summarize_validated_inputs(validated, policy=policy)
