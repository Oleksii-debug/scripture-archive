from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from typing import Any, Iterable, Mapping

from .content import ContentRepository, validate_canonical_node
from .grading import GraderRegistry
from .models import Correctness, TaskDefinition
from .package_adapters import adapt_node_for_runtime, derive_answer_dto


@dataclass(frozen=True)
class ConformanceItem:
    node_id: str
    task_type: str
    correctness: str
    score: float
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {"node_id": self.node_id, "task_type": self.task_type, "correctness": self.correctness, "score": self.score, "error": self.error}


def check_nodes(nodes: Iterable[Mapping[str, Any]], *, lane: str) -> dict[str, Any]:
    graders = GraderRegistry()
    results: list[ConformanceItem] = []
    type_counts: Counter[str] = Counter()
    adapted_count = 0
    for raw in nodes:
        node_id = str(raw.get("node_id", "<missing>"))
        try:
            adapted = adapt_node_for_runtime(raw, lane=lane)
            validate_canonical_node(adapted)
            task = TaskDefinition.from_canonical(adapted)
            answer = derive_answer_dto(adapted)
            grade = graders.grade(task, answer)
            type_counts[task.task_type] += 1
            adapted_count += 1
            results.append(ConformanceItem(task.node_id, task.task_type, grade.correctness.value, grade.score))
        except Exception as exc:  # deterministic report boundary; never hide the node
            type_counts[str(raw.get("task_type") or raw.get("task_family") or raw.get("response_mode") or "UNKNOWN")] += 1
            results.append(ConformanceItem(node_id, str(raw.get("task_type") or raw.get("task_family") or "UNKNOWN"), "ERROR", 0.0, f"{type(exc).__name__}: {exc}"))
    status_counts = Counter(item.correctness for item in results)
    return {
        "lane": lane,
        "answer_contract": "ANSWER_DTO_v1",
        "total": len(results),
        "adapted": adapted_count,
        "status_counts": dict(sorted(status_counts.items())),
        "task_type_counts": dict(sorted(type_counts.items())),
        "all_correct": bool(results) and status_counts.get(Correctness.CORRECT.value, 0) == len(results),
        "errors": [item.to_dict() for item in results if item.correctness != Correctness.CORRECT.value],
    }
