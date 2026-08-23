from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Sequence

from .integration_intake import (
    FinalInputExpectation,
    FinalInputError,
    ValidatedFinalInput,
    validate_cross_lane_inputs,
    validate_final_input,
)
from .provenance import PROVENANCE_CONTRACT_VERSION, ProvenanceClass
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
