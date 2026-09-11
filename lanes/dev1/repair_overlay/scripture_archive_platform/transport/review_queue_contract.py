from __future__ import annotations

from datetime import datetime
from typing import Any, Mapping

REVIEW_QUEUE_FIELDS = frozenset({
    "queue_id",
    "concept_id",
    "node_id",
    "due_at",
    "priority",
    "relation",
    "reason",
})
REVIEW_RELATIONS = frozenset({
    "EXACT",
    "VARIANT",
    "PASSAGE_REVISIT",
    "CROSS_CONTEXT",
    "SYNTHESIS",
    "NONE",
})


def _exact_nonempty_text(value: Any) -> bool:
    return isinstance(value, str) and bool(value) and value == value.strip()


def validate_review_queue_projection(value: Any) -> list[dict[str, Any]]:
    """Validate the exact persisted runtime review-queue projection.

    This boundary validates canonical shape, identity/type constraints, and the
    exact D5/runtime ``datetime.isoformat()`` due timestamp serialization only.
    Scheduling order, priority, due-date policy, and relation policy remain
    owned by D5/runtime; callers may neither repair nor normalize malformed or
    noncanonical runtime truth.
    """

    if not isinstance(value, list):
        raise ValueError("runtime review_queue must be an explicit list")

    validated: list[dict[str, Any]] = []
    seen_queue_ids: set[str] = set()
    for index, raw_item in enumerate(value):
        if not isinstance(raw_item, Mapping):
            raise ValueError(f"runtime review_queue[{index}] must be an object")
        if set(raw_item) != REVIEW_QUEUE_FIELDS:
            raise ValueError(f"runtime review_queue[{index}] has invalid fields")

        queue_id = raw_item["queue_id"]
        concept_id = raw_item["concept_id"]
        node_id = raw_item["node_id"]
        due_at = raw_item["due_at"]
        priority = raw_item["priority"]
        relation = raw_item["relation"]
        reason = raw_item["reason"]

        if not _exact_nonempty_text(queue_id):
            raise ValueError(f"runtime review_queue[{index}].queue_id is invalid")
        if queue_id in seen_queue_ids:
            raise ValueError(f"runtime review_queue[{index}].queue_id is duplicated")
        seen_queue_ids.add(queue_id)
        if not _exact_nonempty_text(concept_id):
            raise ValueError(f"runtime review_queue[{index}].concept_id is invalid")
        if node_id is not None and not _exact_nonempty_text(node_id):
            raise ValueError(f"runtime review_queue[{index}].node_id is invalid")
        if not _exact_nonempty_text(due_at):
            raise ValueError(f"runtime review_queue[{index}].due_at is invalid")
        try:
            parsed_due_at = datetime.fromisoformat(due_at)
        except ValueError as exc:
            raise ValueError(f"runtime review_queue[{index}].due_at is invalid") from exc
        if parsed_due_at.tzinfo is None:
            raise ValueError(f"runtime review_queue[{index}].due_at must include timezone")
        if parsed_due_at.isoformat() != due_at:
            raise ValueError(f"runtime review_queue[{index}].due_at is noncanonical")
        if not isinstance(priority, int) or isinstance(priority, bool):
            raise ValueError(f"runtime review_queue[{index}].priority is invalid")
        if relation not in REVIEW_RELATIONS:
            raise ValueError(f"runtime review_queue[{index}].relation is invalid")
        if not isinstance(reason, str):
            raise ValueError(f"runtime review_queue[{index}].reason is invalid")

        validated.append(dict(raw_item))
    return validated
