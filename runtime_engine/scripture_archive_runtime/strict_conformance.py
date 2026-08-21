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


class TruthClass(str, Enum):
    AUTHORED_GROUND_TRUTH_PASS = "AUTHORED_GROUND_TRUTH_PASS"
    LEGACY_NORMALIZED_PASS = "LEGACY_NORMALIZED_PASS"
    ADAPTER_DERIVED_GROUND_TRUTH_FAIL_FOR_RELEASE = "ADAPTER_DERIVED_GROUND_TRUTH_FAIL_FOR_RELEASE"
    PARTIAL = "PARTIAL"
    INCORRECT = "INCORRECT"
    ERROR_UNSUPPORTED = "ERROR/UNSUPPORTED"


@dataclass(frozen=True)
class StrictConformanceItem:
    node_id: str
    task_type: str
    truth_class: str
    correctness: str
    score: float
    release_pass: bool
    provenance: str
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
            "error": self.error,
        }


_AUTHORED_KEYS: dict[str, tuple[str, ...]] = {
    "SINGLE_CHOICE": ("accepted_choice",),
    "COMBOBOX_SELECT": ("accepted_choice",),
    "PARALLEL_WITNESS_COMPARE": ("accepted_choice",),
    "MULTI_SELECT": ("accepted_set",),
    "SHORT_TEXT": ("accepted_propositions", "accepted_text"),
    "LONG_TEXT": ("accepted_propositions", "accepted_text"),
    "ARGUMENT": ("accepted_propositions", "accepted_text"),
    "ORDERING": ("accepted_order",),
    "MATCHING": ("accepted_pairs",),
    "EVIDENCE_SELECT": ("required_evidence_ids",),
    "CLAIM_EVIDENCE": ("accepted_text",),
    "SPEAKER_RECIPIENT": ("speaker", "recipient"),
    "OT_NT_LINK": ("ot_nt_link",),
    "COMPOSITE_MULTI_STEP": ("steps",),
}


def _nonempty(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (list, tuple, set, dict)):
        return bool(value)
    return True


def _authored_truth_status(node: Mapping[str, Any]) -> tuple[str, str]:
    task_type = canonical_task_type(str(node.get("task_type") or node.get("response_mode") or node.get("task_family") or "SHORT_TEXT"))
    grading = node.get("grading") if isinstance(node.get("grading"), Mapping) else {}
    required = _AUTHORED_KEYS.get(task_type)
    if not required:
        return TruthClass.ERROR_UNSUPPORTED.value, "no canonical truth rule registered"

    if task_type in {"SHORT_TEXT", "LONG_TEXT", "ARGUMENT"}:
        if any(_nonempty(grading.get(k)) for k in required):
            return TruthClass.AUTHORED_GROUND_TRUTH_PASS.value, "grading.accepted_propositions/accepted_text"
    elif task_type == "CLAIM_EVIDENCE":
        if _nonempty(grading.get("accepted_text")) and _nonempty(grading.get("required_evidence_ids")):
            return TruthClass.AUTHORED_GROUND_TRUTH_PASS.value, "grading.accepted_text+required_evidence_ids"
    elif task_type == "SPEAKER_RECIPIENT":
        if all(_nonempty(grading.get(k)) for k in required):
            return TruthClass.AUTHORED_GROUND_TRUTH_PASS.value, "grading.speaker+recipient"
    else:
        if all(_nonempty(grading.get(k)) for k in required):
            return TruthClass.AUTHORED_GROUND_TRUTH_PASS.value, "grading." + "+".join(required)

    if task_type == "OT_NT_LINK" and _nonempty(grading.get("accepted_link")):
        return TruthClass.LEGACY_NORMALIZED_PASS.value, "grading.accepted_link legacy compatibility"

    try:
        derive_answer_dto(node)
    except Exception as exc:
        return TruthClass.ERROR_UNSUPPORTED.value, f"no authored truth and DTO derivation failed: {type(exc).__name__}: {exc}"
    return TruthClass.ADAPTER_DERIVED_GROUND_TRUTH_FAIL_FOR_RELEASE.value, "truth only derivable from non-canonical accepted/payload fields"


def check_nodes_strict(nodes: Iterable[Mapping[str, Any]], *, lane: str) -> dict[str, Any]:
    graders = GraderRegistry()
    results: list[StrictConformanceItem] = []
    task_counts: Counter[str] = Counter()

    for raw in nodes:
        node_id = str(raw.get("node_id", "<missing>"))
        task_type = canonical_task_type(str(raw.get("task_type") or raw.get("response_mode") or raw.get("task_family") or "SHORT_TEXT"))
        task_counts[task_type] += 1
        truth_class, provenance = _authored_truth_status(raw)
        try:
            adapted = adapt_node_for_runtime(raw, lane=lane)
            validate_canonical_node(adapted)
            task = TaskDefinition.from_canonical(adapted)
            answer = derive_answer_dto(adapted)
            grade = graders.grade(task, answer)
            if grade.correctness == Correctness.PARTIAL:
                effective_class = TruthClass.PARTIAL.value
            elif grade.correctness == Correctness.INCORRECT:
                effective_class = TruthClass.INCORRECT.value
            else:
                effective_class = truth_class
            release_pass = grade.correctness == Correctness.CORRECT and truth_class == TruthClass.AUTHORED_GROUND_TRUTH_PASS.value
            results.append(StrictConformanceItem(node_id, task.task_type, effective_class, grade.correctness.value, grade.score, release_pass, provenance))
        except Exception as exc:
            results.append(StrictConformanceItem(node_id, task_type, TruthClass.ERROR_UNSUPPORTED.value, "ERROR", 0.0, False, provenance, f"{type(exc).__name__}: {exc}"))

    truth_counts = Counter(item.truth_class for item in results)
    correctness_counts = Counter(item.correctness for item in results)
    strict_pass = sum(1 for item in results if item.release_pass)
    return {
        "lane": lane,
        "answer_contract": "ANSWER_DTO_v1",
        "total": len(results),
        "strict_release_pass_count": strict_pass,
        "strict_release_blocker_count": len(results) - strict_pass,
        "strict_release_pass": bool(results) and strict_pass == len(results),
        "truth_class_counts": dict(sorted(truth_counts.items())),
        "correctness_counts": dict(sorted(correctness_counts.items())),
        "task_type_counts": dict(sorted(task_counts.items())),
        "blockers": [item.to_dict() for item in results if not item.release_pass],
    }
