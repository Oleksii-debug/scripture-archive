from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
import math
from numbers import Real
from typing import Iterable, Sequence
import unicodedata

from .models import PlayerMemory, QueueKind, RetrievalRelation, SchedulerCandidate, Session
from .scheduler import Scheduler


DAILY_CASE_SCHEMA = "daily-case.v1"
_MAX_CASE_ID = 128
_MAX_TITLE = 200
_MAX_ITEMS = 50
_MAX_ITEM_METADATA_VALUES = 64


@dataclass(frozen=True)
class DailyCaseItem:
    position: int
    node_id: str
    task_family: str
    queue: str
    relation: str
    concept_ids: tuple[str, ...]
    passage_keys: tuple[str, ...]
    book_key: str | None

    def __post_init__(self) -> None:
        if isinstance(self.position, bool) or not isinstance(self.position, int) or self.position < 1:
            raise ValueError("DailyCaseItem.position must be a positive integer")
        _canonical_text(self.node_id, "DailyCaseItem.node_id", 256)
        _canonical_text(self.task_family, "DailyCaseItem.task_family", 128)
        if not isinstance(self.queue, str) or self.queue not in {item.value for item in QueueKind}:
            raise ValueError("DailyCaseItem.queue must be a QueueKind value")
        if not isinstance(self.relation, str) or self.relation not in {item.value for item in RetrievalRelation}:
            raise ValueError("DailyCaseItem.relation must be a RetrievalRelation value")
        if not isinstance(self.concept_ids, tuple):
            raise TypeError("DailyCaseItem.concept_ids must be tuple[str, ...]")
        if not isinstance(self.passage_keys, tuple):
            raise TypeError("DailyCaseItem.passage_keys must be tuple[str, ...]")
        _validate_string_sequence(
            self.concept_ids,
            "DailyCaseItem.concept_ids",
            maximum_items=_MAX_ITEM_METADATA_VALUES,
        )
        _validate_string_sequence(
            self.passage_keys,
            "DailyCaseItem.passage_keys",
            maximum_items=_MAX_ITEM_METADATA_VALUES,
        )
        if self.book_key is not None:
            _canonical_text(self.book_key, "DailyCaseItem.book_key", 128)

    def to_dict(self) -> dict[str, object]:
        return {
            "position": self.position,
            "node_id": self.node_id,
            "task_family": self.task_family,
            "queue": self.queue,
            "relation": self.relation,
            "concept_ids": list(self.concept_ids),
            "passage_keys": list(self.passage_keys),
            "book_key": self.book_key,
        }


@dataclass(frozen=True)
class DailyCasePlan:
    case_id: str
    title: str
    items: tuple[DailyCaseItem, ...]
    schema: str = field(default=DAILY_CASE_SCHEMA, init=False)

    def __post_init__(self) -> None:
        _canonical_text(self.case_id, "DailyCasePlan.case_id", _MAX_CASE_ID)
        _canonical_text(self.title, "DailyCasePlan.title", _MAX_TITLE)
        if not isinstance(self.items, tuple):
            raise TypeError("DailyCasePlan.items must be tuple[DailyCaseItem, ...]")
        for expected_position, item in enumerate(self.items, start=1):
            if not isinstance(item, DailyCaseItem):
                raise TypeError("DailyCasePlan.items must contain DailyCaseItem values")
            if item.position != expected_position:
                raise ValueError("DailyCasePlan item positions must be contiguous from 1")
        if len(self.items) > _MAX_ITEMS:
            raise ValueError(f"DailyCasePlan cannot exceed {_MAX_ITEMS} items")

    def semantic_rows(self) -> list[dict[str, object]]:
        return [item.to_dict() for item in self.items]

    def to_dict(self) -> dict[str, object]:
        return {
            "schema": self.schema,
            "case_id": self.case_id,
            "title": self.title,
            "item_count": len(self.items),
            "items": self.semantic_rows(),
        }

    def linearize(self) -> tuple[str, ...]:
        lines = [f"Daily Case {self.case_id}: {self.title}"]
        if not self.items:
            lines.append("No eligible source-audited tasks.")
            return tuple(lines)
        for item in self.items:
            concepts = ", ".join(item.concept_ids) if item.concept_ids else "none"
            passages = ", ".join(item.passage_keys) if item.passage_keys else "none"
            book = item.book_key or "none"
            lines.append(
                f"{item.position}. {item.node_id} | family={item.task_family} | "
                f"queue={item.queue} | relation={item.relation} | "
                f"concepts={concepts} | passages={passages} | book={book}"
            )
        return tuple(lines)


class DailyCaseComposer:
    """Build a deterministic player-visible case plan from SchedulerCandidate metadata only.

    Eligibility and ranking stay owned by the canonical Scheduler. This layer intentionally
    has no access to TaskDefinition answers, grading truth, hints, or evidence payloads, so it
    cannot become a second task/source truth store.
    """

    def __init__(self, *, scheduler: Scheduler | None = None) -> None:
        if scheduler is not None and type(scheduler) is not Scheduler:
            raise TypeError("scheduler must be the canonical Scheduler implementation or None")
        # Keep policy execution internally owned. Even an exact Scheduler instance is mutable
        # in Python and can have compose/choose_next/eligible shadowed in its instance dict.
        # Accepting the exact type preserves the public constructor contract, but its behavior
        # is never trusted as the Daily Case eligibility boundary.
        self.scheduler = Scheduler()

    def compose(
        self,
        candidates: Iterable[SchedulerCandidate],
        memory: PlayerMemory,
        session: Session,
        *,
        case_id: str,
        title: str,
        limit: int = 10,
        adjacent_successful_exact_ids: set[str] | None = None,
        now: datetime | None = None,
    ) -> DailyCasePlan:
        normalized_case_id = _canonical_text(case_id, "case_id", _MAX_CASE_ID)
        normalized_title = _bounded_text(title, "title", _MAX_TITLE)
        if not isinstance(memory, PlayerMemory):
            raise TypeError("memory must be PlayerMemory")
        if not isinstance(session, Session):
            raise TypeError("session must be Session")
        if isinstance(limit, bool) or not isinstance(limit, int) or not 1 <= limit <= _MAX_ITEMS:
            raise ValueError(f"limit must be an integer from 1 to {_MAX_ITEMS}")
        if now is not None:
            if not isinstance(now, datetime):
                raise TypeError("now must be datetime or None")
            if now.tzinfo is None or now.utcoffset() is None:
                raise ValueError("now must be timezone-aware")
        if adjacent_successful_exact_ids is not None:
            if not isinstance(adjacent_successful_exact_ids, set):
                raise TypeError("adjacent_successful_exact_ids must be a set[str] or None")
            _validate_string_sequence(tuple(adjacent_successful_exact_ids), "adjacent_successful_exact_ids")

        pool = list(candidates)
        seen: set[str] = set()
        for candidate in pool:
            _validate_candidate(candidate)
            if candidate.node_id in seen:
                raise ValueError(f"duplicate Daily Case node_id: {candidate.node_id}")
            seen.add(candidate.node_id)

        selected = self.scheduler.compose(
            pool,
            memory,
            session,
            limit=limit,
            adjacent_successful_exact_ids=adjacent_successful_exact_ids,
            now=now,
        )
        items = tuple(
            DailyCaseItem(
                position=index,
                node_id=candidate.node_id,
                task_family=candidate.task_family,
                queue=candidate.queue.value,
                relation=candidate.relation.value,
                concept_ids=tuple(candidate.concept_ids),
                passage_keys=tuple(candidate.passage_keys),
                book_key=candidate.book_key,
            )
            for index, candidate in enumerate(selected, start=1)
        )
        return DailyCasePlan(normalized_case_id, normalized_title, items)


def _bounded_text(value: object, name: str, maximum: int) -> str:
    if not isinstance(value, str):
        raise TypeError(f"{name} must be a string")
    normalized = value.strip()
    if not normalized:
        raise ValueError(f"{name} must be non-empty")
    if len(normalized) > maximum:
        raise ValueError(f"{name} exceeds {maximum} characters")
    if any(unicodedata.category(ch) == "Cc" or ch in {"\u2028", "\u2029"} for ch in normalized):
        raise ValueError(f"{name} must not contain control or line/paragraph separator characters")
    return normalized


def _canonical_text(value: object, name: str, maximum: int) -> str:
    normalized = _bounded_text(value, name, maximum)
    if value != normalized:
        raise ValueError(f"{name} must not contain leading or trailing whitespace")
    return normalized


def _validate_string_sequence(
    values: Sequence[object],
    name: str,
    *,
    maximum_items: int | None = None,
) -> None:
    if maximum_items is not None and len(values) > maximum_items:
        raise ValueError(f"{name} cannot exceed {maximum_items} items")
    for index, value in enumerate(values):
        _canonical_text(value, f"{name}[{index}]", 256)


def _validate_finite_number(value: object, name: str) -> None:
    if isinstance(value, bool) or not isinstance(value, Real) or not math.isfinite(float(value)):
        raise ValueError(f"{name} must be a finite number")


def _validate_candidate(candidate: object) -> None:
    if not isinstance(candidate, SchedulerCandidate):
        raise TypeError("candidates must contain SchedulerCandidate values")
    _canonical_text(candidate.node_id, "candidate.node_id", 256)
    _canonical_text(candidate.task_family, "candidate.task_family", 128)
    if not isinstance(candidate.queue, QueueKind):
        raise TypeError("candidate.queue must be QueueKind")
    if not isinstance(candidate.relation, RetrievalRelation):
        raise TypeError("candidate.relation must be RetrievalRelation")
    if type(candidate.source_audited) is not bool:
        raise TypeError("candidate.source_audited must be bool")
    if type(candidate.prerequisite_ready) is not bool:
        raise TypeError("candidate.prerequisite_ready must be bool")
    if type(candidate.user_requested) is not bool:
        raise TypeError("candidate.user_requested must be bool")
    if not isinstance(candidate.concept_ids, tuple):
        raise TypeError("candidate.concept_ids must be tuple[str, ...]")
    if not isinstance(candidate.passage_keys, tuple):
        raise TypeError("candidate.passage_keys must be tuple[str, ...]")
    _validate_string_sequence(
        candidate.concept_ids,
        "candidate.concept_ids",
        maximum_items=_MAX_ITEM_METADATA_VALUES,
    )
    _validate_string_sequence(
        candidate.passage_keys,
        "candidate.passage_keys",
        maximum_items=_MAX_ITEM_METADATA_VALUES,
    )
    if candidate.book_key is not None:
        _canonical_text(candidate.book_key, "candidate.book_key", 128)
    if candidate.paired_exact_node_id is not None:
        _canonical_text(candidate.paired_exact_node_id, "candidate.paired_exact_node_id", 256)
    if candidate.due_at is not None:
        if not isinstance(candidate.due_at, datetime):
            raise TypeError("candidate.due_at must be datetime or None")
        if candidate.due_at.tzinfo is None or candidate.due_at.utcoffset() is None:
            raise ValueError("candidate.due_at must be timezone-aware")
    _validate_finite_number(candidate.difficulty, "candidate.difficulty")
    _validate_finite_number(candidate.campaign_continuity, "candidate.campaign_continuity")
    _validate_finite_number(candidate.weak_signal, "candidate.weak_signal")
