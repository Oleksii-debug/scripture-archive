from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from enum import Enum
from typing import Any, Iterable, Mapping

from .answer_contracts import canonical_task_type
from .content import validate_canonical_node
from .grading import GraderRegistry
from .models import Correctness, TaskDefinition
from .package_adapters import adapt_node_for_runtime, derive_answer_dto
from .provenance import ProvenanceClass, RELEASE_PASS_CLASSES, classify_provenance


class TruthClass(str, Enum):
    """Public conformance labels. Old names remain only as import-compatible deprecated labels."""
    AUTHORED_DIRECT_PASS = ProvenanceClass.AUTHORED_DIRECT_PASS.value
    CANONICAL_LOSSLESS_NORMALIZATION_PASS = ProvenanceClass.CANONICAL_LOSSLESS_NORMALIZATION_PASS.value
    LEGACY_EXPLICIT_NORMALIZATION_PASS = ProvenanceClass.LEGACY_EXPLICIT_NORMALIZATION_PASS.value
    ADAPTER_INFERENCE_FAIL = ProvenanceClass.ADAPTER_INFERENCE_FAIL.value
    MISMATCH_FAIL = ProvenanceClass.MISMATCH_FAIL.value
    AMBIGUOUS_FAIL = ProvenanceClass.AMBIGUOUS_FAIL.value
    PARTIAL = "PARTIAL"
    INCORRECT = "INCORRECT"
    ERROR_UNSUPPORTED = "ERROR/UNSUPPORTED"
    # Deprecated FINALPREP02 vocabulary. Never emitted by the new classifier.
    AUTHORED_GROUND_TRUTH_PASS = "AUTHORED_GROUND_TRUTH_PASS"
    LEGACY_NORMALIZED_PASS = "LEGACY_NORMALIZED_PASS"
    ADAPTER_DERIVED_GROUND_TRUTH_FAIL_FOR_RELEASE = "ADAPTER_DERIVED_GROUND_TRUTH_FAIL_FOR_RELEASE"


@dataclass(frozen=True)
class StrictConformanceItem:
    node_id: str
    task_type: str
    truth_class: str
    correctness: str
    score: float
    release_pass: bool
    provenance: str
    explicit_representation: str | None = None
    warning: str | None = None
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "node_id": self.node_id,
            "task_type": self.task_type,
            "truth_class": self.truth_class,
            "correctness": self.correctness,
            "score": self.score,
            "release_pass": self.release_pass,
            "provenance": self.provenance,
            "explicit_representation": self.explicit_representation,
            "warning": self.warning,
            "error": self.error,
        }


def _authored_truth_status(node: Mapping[str, Any]) -> tuple[str, str]:
    """Compatibility wrapper retained for callers of FINALPREP02 internals."""
    decision = classify_provenance(node)
    return decision.provenance_class, decision.reason


def check_nodes_strict(nodes: Iterable[Mapping[str, Any]], *, lane: str) -> dict[str, Any]:
    graders = GraderRegistry()
    results: list[StrictConformanceItem] = []
    task_counts: Counter[str] = Counter()

    for raw in nodes:
        node_id = str(raw.get("node_id", "<missing>"))
        task_type = canonical_task_type(str(raw.get("task_type") or raw.get("response_mode") or raw.get("task_family") or "SHORT_TEXT"))
        task_counts[task_type] += 1
        decision = classify_provenance(raw)
        try:
            adapted = adapt_node_for_runtime(raw, lane=lane)
            validate_canonical_node(adapted)
            task = TaskDefinition.from_canonical(adapted)
            answer = derive_answer_dto(raw)
            grade = graders.grade(task, answer)
            release_pass = (
                grade.correctness == Correctness.CORRECT
                and decision.provenance_class in RELEASE_PASS_CLASSES
            )
            results.append(StrictConformanceItem(
                node_id=task.node_id,
                task_type=task.task_type,
                truth_class=decision.provenance_class,
                correctness=grade.correctness.value,
                score=grade.score,
                release_pass=release_pass,
                provenance=decision.reason,
                explicit_representation=decision.explicit_representation,
                warning=decision.warning,
            ))
        except Exception as exc:
            results.append(StrictConformanceItem(
                node_id=node_id,
                task_type=task_type,
                truth_class=decision.provenance_class,
                correctness="ERROR",
                score=0.0,
                release_pass=False,
                provenance=decision.reason,
                explicit_representation=decision.explicit_representation,
                warning=decision.warning,
                error=f"{type(exc).__name__}: {exc}",
            ))

    truth_counts = Counter(item.truth_class for item in results)
    correctness_counts = Counter(item.correctness for item in results)
    strict_pass = sum(1 for item in results if item.release_pass)
    return {
        "lane": lane,
        "answer_contract": "ANSWER_DTO_v1",
        "provenance_contract": "GROUND_TRUTH_PROVENANCE_v1",
        "total": len(results),
        "strict_release_pass_count": strict_pass,
        "strict_release_blocker_count": len(results) - strict_pass,
        "strict_release_pass": bool(results) and strict_pass == len(results),
        "truth_class_counts": dict(sorted(truth_counts.items())),
        "correctness_counts": dict(sorted(correctness_counts.items())),
        "task_type_counts": dict(sorted(task_counts.items())),
        "blockers": [item.to_dict() for item in results if not item.release_pass],
        "items": [item.to_dict() for item in results],
    }
