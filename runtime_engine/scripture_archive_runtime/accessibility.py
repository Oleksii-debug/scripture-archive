from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any, Iterable

from .models import BranchResolution, GradeResult, MasteryConsequence


@dataclass(frozen=True)
class AccessibilityEvent:
    event_type: str
    heading: str
    message: str
    status: str
    details: tuple[str, ...] = ()
    focus_target: str = "task-status"

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["details"] = list(self.details)
        return data


def grade_event(result: GradeResult, consequences: Iterable[MasteryConsequence] = ()) -> AccessibilityEvent:
    details = [f"Evidence: {e}" for e in result.evidence]
    details.append(f"Confidence: {result.confidence.value}")
    details.append(f"TX1: {'yes' if result.tx1 else 'no'}")
    if result.uncertainty:
        details.append(f"Uncertainty: {result.uncertainty}")
    for c in consequences:
        details.append(f"Mastery {c.concept_id}: {c.before.value} → {c.after.value}; reason={c.reason}")
    return AccessibilityEvent("grade", "Результат відповіді", result.feedback or result.correctness.value, result.correctness.value.casefold(), tuple(details), "task-feedback")


def hint_event(level: int, text: str) -> AccessibilityEvent:
    return AccessibilityEvent("hint", f"Підказка H{level}", text, "info", (), "hint-heading")


def branch_event(resolution: BranchResolution) -> AccessibilityEvent:
    message = f"Branch result: {resolution.terminal.value}."
    if resolution.next_node_id:
        message += f" Next node: {resolution.next_node_id}."
    if resolution.queue_id:
        message += f" Review queue: {resolution.queue_id}."
    return AccessibilityEvent("branch", "Наступний крок", message, "info", tuple(f"Evidence unlocked: {x}" for x in resolution.evidence_unlocks), "next-step-heading")


def validation_event(errors: Iterable[str]) -> AccessibilityEvent:
    errors = tuple(errors)
    return AccessibilityEvent("validation_error", "Помилка валідації", f"Знайдено помилок: {len(errors)}", "error", errors, "validation-errors")
