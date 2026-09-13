from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Mapping

from .models import Attempt, Correctness, HintUse, KnowledgeState, MasteryState, PlayerMemory, ReviewQueueItem, RetrievalRelation, Session, TaskState
from .persistence import CURRENT_SCHEMA_VERSION
from .security import ValidationError


def parse_dt(value: Any) -> datetime | None:
    if not value:
        return None
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _attempt_independent(independent: Any, used_hints: int) -> bool:
    """Persisted independence can never contradict guided mastery semantics."""
    return bool(independent) and int(used_hints) == 0


def _reject_duplicate_ids(values: list[str], label: str) -> None:
    seen: set[str] = set()
    for value in values:
        if value in seen:
            raise ValidationError(f"Duplicate {label}: {value}")
        seen.add(value)


def serialize_task_state(state: TaskState) -> dict[str, Any]:
    return {
        "node_id": state.node_id,
        "attempts": [
            {
                "node_id": a.node_id,
                "correctness": a.correctness.value,
                "score": a.score,
                "used_hints": a.used_hints,
                "independent": _attempt_independent(a.independent, a.used_hints),
                "created_at": a.created_at.isoformat(),
                "answer_snapshot": a.answer_snapshot,
            }
            for a in state.attempts
        ],
        "hint_uses": [{"level": h.level, "text": h.text, "created_at": h.created_at.isoformat()} for h in state.hint_uses],
        "evidence_unlocked": sorted(state.evidence_unlocked),
        "completed": state.completed,
        "last_result": state.last_result.value if state.last_result else None,
    }


def deserialize_task_state(raw: Mapping[str, Any]) -> TaskState:
    state = TaskState(node_id=str(raw.get("node_id", "")))

    attempts = raw.get("attempts") or []
    if not isinstance(attempts, list):
        raise ValidationError("task-state attempts must be a list")
    for a in attempts:
        if not isinstance(a, Mapping):
            raise ValidationError("task-state attempt items must be objects")
        attempt_node_id = str(a.get("node_id", state.node_id))
        if attempt_node_id != state.node_id:
            raise ValidationError(
                f"Task-state attempt node_id mismatch: {state.node_id} != {attempt_node_id}"
            )
        used_hints = int(a.get("used_hints", 0))
        state.attempts.append(
            Attempt(
                attempt_node_id,
                Correctness(str(a.get("correctness", "INCORRECT"))),
                float(a.get("score", 0.0)),
                used_hints,
                _attempt_independent(a.get("independent", False), used_hints),
                parse_dt(a.get("created_at")) or datetime.now(timezone.utc),
                a.get("answer_snapshot"),
            )
        )

    hint_uses = raw.get("hint_uses") or []
    if not isinstance(hint_uses, list):
        raise ValidationError("task-state hint_uses must be a list")
    for h in hint_uses:
        if not isinstance(h, Mapping):
            raise ValidationError("task-state hint-use items must be objects")
        state.hint_uses.append(
            HintUse(
                state.node_id,
                int(h.get("level", 0)),
                str(h.get("text", "")),
                parse_dt(h.get("created_at")) or datetime.now(timezone.utc),
            )
        )

    evidence_unlocked = raw.get("evidence_unlocked") or []
    if not isinstance(evidence_unlocked, list):
        raise ValidationError("task-state evidence_unlocked must be a list")
    state.evidence_unlocked = set(str(x) for x in evidence_unlocked)
    state.completed = bool(raw.get("completed", False))
    state.last_result = Correctness(str(raw["last_result"])) if raw.get("last_result") else None
    return state


def serialize_session(session: Session) -> dict[str, Any]:
    return {
        "session_id": session.session_id,
        "started_at": session.started_at.isoformat(),
        "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        "ended_reason": session.ended_reason,
        "shown_node_ids": list(session.shown_node_ids),
        "recent_task_families": list(session.recent_task_families),
        "recent_passages": list(session.recent_passages),
        "correct_node_ids": sorted(session.correct_node_ids),
        "successful_exact_ids": sorted(session.successful_exact_ids),
    }


def deserialize_session(raw: Mapping[str, Any]) -> Session:
    correct = set(str(x) for x in raw.get("correct_node_ids") or [])
    exact = set(str(x) for x in raw.get("successful_exact_ids") or [])
    if not exact:
        exact = set(correct)
    return Session(
        session_id=str(raw.get("session_id", uuid.uuid4())),
        started_at=parse_dt(raw.get("started_at")) or datetime.now(timezone.utc),
        ended_at=parse_dt(raw.get("ended_at")),
        shown_node_ids=[str(x) for x in raw.get("shown_node_ids") or []],
        recent_task_families=[str(x) for x in raw.get("recent_task_families") or []],
        recent_passages=[str(x) for x in raw.get("recent_passages") or []],
        correct_node_ids=correct,
        successful_exact_ids=exact,
        ended_reason=str(raw["ended_reason"]) if raw.get("ended_reason") else None,
    )


def serialize_mastery(state: MasteryState) -> dict[str, Any]:
    return {
        "concept_id": state.concept_id,
        "state": state.state.value,
        "stability_days": state.stability_days,
        "difficulty": state.difficulty,
        "consecutive_independent_successes": state.consecutive_independent_successes,
        "guided_successes": state.guided_successes,
        "failures": state.failures,
        "last_seen_at": state.last_seen_at.isoformat() if state.last_seen_at else None,
        "due_at": state.due_at.isoformat() if state.due_at else None,
    }


def deserialize_mastery(raw: Mapping[str, Any]) -> MasteryState:
    return MasteryState(
        str(raw["concept_id"]),
        KnowledgeState(str(raw.get("state", "UNSEEN"))),
        float(raw.get("stability_days", 0.0)),
        float(raw.get("difficulty", 0.5)),
        int(raw.get("consecutive_independent_successes", 0)),
        int(raw.get("guided_successes", 0)),
        int(raw.get("failures", 0)),
        parse_dt(raw.get("last_seen_at")),
        parse_dt(raw.get("due_at")),
    )


def serialize_review_item(item: ReviewQueueItem) -> dict[str, Any]:
    return {
        "queue_id": item.queue_id,
        "concept_id": item.concept_id,
        "node_id": item.node_id,
        "due_at": item.due_at.isoformat(),
        "priority": item.priority,
        "relation": item.relation.value,
        "reason": item.reason,
    }


def deserialize_review_item(raw: Mapping[str, Any]) -> ReviewQueueItem:
    return ReviewQueueItem(
        str(raw["queue_id"]),
        str(raw["concept_id"]),
        str(raw["node_id"]) if raw.get("node_id") else None,
        parse_dt(raw["due_at"]) or datetime.now(timezone.utc),
        int(raw.get("priority", 0)),
        RetrievalRelation(str(raw.get("relation", "EXACT"))),
        str(raw.get("reason", "")),
    )


def _decode_mastery_collection(raw: Any) -> dict[str, MasteryState]:
    if not raw:
        return {}
    decoded: dict[str, MasteryState] = {}
    if isinstance(raw, Mapping):
        for concept_id, item in raw.items():
            if not isinstance(item, Mapping):
                raise ValidationError("mastery mapping values must be objects")
            expected_id = str(concept_id)
            normalized = dict(item)
            stored_id = normalized.get("concept_id")
            if stored_id is not None and str(stored_id) != expected_id:
                raise ValidationError(f"Mastery key/concept_id mismatch: {expected_id} != {stored_id}")
            normalized.setdefault("concept_id", expected_id)
            mastery = deserialize_mastery(normalized)
            if mastery.concept_id in decoded:
                raise ValidationError(f"Duplicate mastery concept_id: {mastery.concept_id}")
            decoded[mastery.concept_id] = mastery
        return decoded
    if isinstance(raw, list):
        for item in raw:
            if not isinstance(item, Mapping):
                raise ValidationError("mastery list items must be objects")
            mastery = deserialize_mastery(item)
            if mastery.concept_id in decoded:
                raise ValidationError(f"Duplicate mastery concept_id: {mastery.concept_id}")
            decoded[mastery.concept_id] = mastery
        return decoded
    raise ValidationError("mastery must be an object or list")


def _decode_memory(state: Mapping[str, Any], fallback_profile_id: str) -> PlayerMemory:
    profile = state.get("profile") or {}
    if not isinstance(profile, Mapping):
        raise ValidationError("profile must be an object")

    history = state.get("history") or {}
    if not isinstance(history, Mapping):
        raise ValidationError("history must be an object")

    campaign_checkpoints = state.get("campaign_checkpoints") or {}
    passage_exposure = state.get("passage_exposure") or {}
    evidence_exposure = state.get("evidence_exposure") or {}
    mistakes = state.get("mistakes") or {}
    recent_fatigue = state.get("recent_fatigue") or {}
    session_rollup = state.get("session_rollup") or {}
    for name, value in {
        "campaign_checkpoints": campaign_checkpoints,
        "passage_exposure": passage_exposure,
        "evidence_exposure": evidence_exposure,
        "mistakes": mistakes,
        "recent_fatigue": recent_fatigue,
        "session_rollup": session_rollup,
    }.items():
        if not isinstance(value, Mapping):
            raise ValidationError(f"{name} must be an object")

    review_raw = state.get("review_queue") or []
    sessions_raw = state.get("sessions") or []
    if not isinstance(review_raw, list):
        raise ValidationError("review_queue must be a list")
    if not isinstance(sessions_raw, list):
        raise ValidationError("sessions must be a list")

    decoded = PlayerMemory(profile_id=str(profile.get("profile_id", fallback_profile_id)))
    decoded.campaign_checkpoints = {str(k): str(v) for k, v in campaign_checkpoints.items()}
    decoded.passage_exposure = {str(k): int(v) for k, v in passage_exposure.items()}
    decoded.evidence_exposure = {str(k): int(v) for k, v in evidence_exposure.items()}
    decoded.mistakes = {str(k): int(v) for k, v in mistakes.items()}
    decoded.recent_fatigue = {str(k): int(v) for k, v in recent_fatigue.items()}
    decoded.session_rollup = {str(k): int(v) for k, v in session_rollup.items()}

    decoded.node_history = {}
    for key, value in history.items():
        node_id = str(key)
        if not isinstance(value, Mapping):
            raise ValidationError(f"history[{node_id}] must be an object")
        normalized = dict(value)
        normalized.setdefault("node_id", node_id)
        task_state = deserialize_task_state(normalized)
        if task_state.node_id != node_id:
            raise ValidationError(f"History key/node_id mismatch: {node_id} != {task_state.node_id}")
        decoded.node_history[node_id] = task_state

    decoded.concept_mastery = _decode_mastery_collection(state.get("mastery"))

    decoded.review_queue = []
    for value in review_raw:
        if not isinstance(value, Mapping):
            raise ValidationError("review queue items must be objects")
        decoded.review_queue.append(deserialize_review_item(value))
    _reject_duplicate_ids([item.queue_id for item in decoded.review_queue], "review queue_id")

    decoded.sessions = []
    for value in sessions_raw:
        if not isinstance(value, Mapping):
            raise ValidationError("session items must be objects")
        decoded.sessions.append(deserialize_session(value))
    _reject_duplicate_ids([item.session_id for item in decoded.sessions], "session_id")
    return decoded


def serialize_memory(memory: PlayerMemory, session: Session, current_node_id: str | None, *, base_state: Mapping[str, Any] | None = None) -> dict[str, Any]:
    sessions = list(memory.sessions)
    index = next((i for i, existing in enumerate(sessions) if existing.session_id == session.session_id), None)
    if index is None:
        sessions.append(session)
    else:
        sessions[index] = session
    base = dict(base_state or {})
    profile = dict(base.get("profile") or {})
    profile["profile_id"] = memory.profile_id
    accessibility_state = dict(base.get("accessibility_state") or {})
    accessibility_state["last_focus_target"] = "task-feedback"
    return {
        "schema_version": CURRENT_SCHEMA_VERSION,
        "profile": profile,
        "settings": dict(base.get("settings") or {}),
        "sessions": [serialize_session(item) for item in sessions],
        "history": {nid: serialize_task_state(s) for nid, s in memory.node_history.items()},
        "mastery": [serialize_mastery(s) for _, s in sorted(memory.concept_mastery.items())],
        "review_queue": [serialize_review_item(x) for x in memory.review_queue],
        "campaign_checkpoints": dict(memory.campaign_checkpoints),
        "passage_exposure": dict(memory.passage_exposure),
        "mistakes": dict(memory.mistakes),
        "recent_fatigue": dict(memory.recent_fatigue),
        "session_rollup": dict(memory.session_rollup),
        "constructor_drafts": dict(base.get("constructor_drafts") or {}),
        "keymap": dict(base.get("keymap") or {}),
        "evidence_exposure": dict(memory.evidence_exposure),
        "accessibility_state": accessibility_state,
        "current_node_id": current_node_id,
    }


def restore_memory(memory: PlayerMemory, state: Mapping[str, Any]) -> Session | None:
    """Decode first, then commit atomically to avoid partial in-memory restoration."""
    decoded = _decode_memory(state, memory.profile_id)

    memory.profile_id = decoded.profile_id
    memory.campaign_checkpoints = decoded.campaign_checkpoints
    memory.node_history = decoded.node_history
    memory.passage_exposure = decoded.passage_exposure
    memory.concept_mastery = decoded.concept_mastery
    memory.review_queue = decoded.review_queue
    memory.evidence_exposure = decoded.evidence_exposure
    memory.mistakes = decoded.mistakes
    memory.sessions = decoded.sessions
    memory.recent_fatigue = decoded.recent_fatigue
    memory.session_rollup = decoded.session_rollup
    return memory.sessions[-1] if memory.sessions else None
