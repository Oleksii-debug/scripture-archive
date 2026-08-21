from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Mapping

from .models import Attempt, Correctness, HintUse, KnowledgeState, MasteryState, PlayerMemory, ReviewQueueItem, RetrievalRelation, Session, TaskState


def parse_dt(value: Any) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def serialize_task_state(state: TaskState) -> dict[str, Any]:
    return {
        "node_id": state.node_id,
        "attempts": [{"node_id": a.node_id, "correctness": a.correctness.value, "score": a.score, "used_hints": a.used_hints, "independent": a.independent, "created_at": a.created_at.isoformat(), "answer_snapshot": a.answer_snapshot} for a in state.attempts],
        "hint_uses": [{"level": h.level, "text": h.text, "created_at": h.created_at.isoformat()} for h in state.hint_uses],
        "evidence_unlocked": sorted(state.evidence_unlocked),
        "completed": state.completed,
        "last_result": state.last_result.value if state.last_result else None,
    }


def deserialize_task_state(raw: Mapping[str, Any]) -> TaskState:
    state = TaskState(node_id=str(raw.get("node_id", "")))
    for a in raw.get("attempts") or []:
        state.attempts.append(Attempt(str(a.get("node_id", state.node_id)), Correctness(str(a.get("correctness", "INCORRECT"))), float(a.get("score", 0.0)), int(a.get("used_hints", 0)), bool(a.get("independent", False)), parse_dt(a.get("created_at")) or datetime.now(timezone.utc), a.get("answer_snapshot")))
    for h in raw.get("hint_uses") or []:
        state.hint_uses.append(HintUse(state.node_id, int(h.get("level", 0)), str(h.get("text", "")), parse_dt(h.get("created_at")) or datetime.now(timezone.utc)))
    state.evidence_unlocked = set(str(x) for x in raw.get("evidence_unlocked") or [])
    state.completed = bool(raw.get("completed", False))
    state.last_result = Correctness(str(raw["last_result"])) if raw.get("last_result") else None
    return state


def serialize_session(session: Session) -> dict[str, Any]:
    return {"session_id": session.session_id, "started_at": session.started_at.isoformat(), "ended_at": session.ended_at.isoformat() if session.ended_at else None, "shown_node_ids": list(session.shown_node_ids), "recent_task_families": list(session.recent_task_families), "recent_passages": list(session.recent_passages), "correct_node_ids": sorted(session.correct_node_ids)}


def deserialize_session(raw: Mapping[str, Any]) -> Session:
    return Session(str(raw.get("session_id", uuid.uuid4())), parse_dt(raw.get("started_at")) or datetime.now(timezone.utc), parse_dt(raw.get("ended_at")), [str(x) for x in raw.get("shown_node_ids") or []], [str(x) for x in raw.get("recent_task_families") or []], [str(x) for x in raw.get("recent_passages") or []], set(str(x) for x in raw.get("correct_node_ids") or []))


def serialize_mastery(state: MasteryState) -> dict[str, Any]:
    return {"concept_id": state.concept_id, "state": state.state.value, "stability_days": state.stability_days, "difficulty": state.difficulty, "consecutive_independent_successes": state.consecutive_independent_successes, "guided_successes": state.guided_successes, "failures": state.failures, "last_seen_at": state.last_seen_at.isoformat() if state.last_seen_at else None, "due_at": state.due_at.isoformat() if state.due_at else None}


def deserialize_mastery(raw: Mapping[str, Any]) -> MasteryState:
    return MasteryState(str(raw["concept_id"]), KnowledgeState(str(raw.get("state", "UNSEEN"))), float(raw.get("stability_days", 0.0)), float(raw.get("difficulty", 0.5)), int(raw.get("consecutive_independent_successes", 0)), int(raw.get("guided_successes", 0)), int(raw.get("failures", 0)), parse_dt(raw.get("last_seen_at")), parse_dt(raw.get("due_at")))


def serialize_review_item(item: ReviewQueueItem) -> dict[str, Any]:
    return {"queue_id": item.queue_id, "concept_id": item.concept_id, "node_id": item.node_id, "due_at": item.due_at.isoformat(), "priority": item.priority, "relation": item.relation.value, "reason": item.reason}


def deserialize_review_item(raw: Mapping[str, Any]) -> ReviewQueueItem:
    return ReviewQueueItem(str(raw["queue_id"]), str(raw["concept_id"]), str(raw["node_id"]) if raw.get("node_id") else None, parse_dt(raw["due_at"]) or datetime.now(timezone.utc), int(raw.get("priority", 0)), RetrievalRelation(str(raw.get("relation", "EXACT"))), str(raw.get("reason", "")))


def serialize_memory(memory: PlayerMemory, session: Session, current_node_id: str | None) -> dict[str, Any]:
    return {
        "schema_version": 2, "profile": {"profile_id": memory.profile_id}, "settings": {}, "sessions": [serialize_session(session)],
        "history": {nid: serialize_task_state(s) for nid, s in memory.node_history.items()}, "mastery": [serialize_mastery(s) for _, s in sorted(memory.concept_mastery.items())],
        "review_queue": [serialize_review_item(x) for x in memory.review_queue], "campaign_checkpoints": dict(memory.campaign_checkpoints), "passage_exposure": dict(memory.passage_exposure),
        "mistakes": dict(memory.mistakes), "recent_fatigue": dict(memory.recent_fatigue), "constructor_drafts": {}, "keymap": {}, "evidence_exposure": dict(memory.evidence_exposure),
        "accessibility_state": {"last_focus_target": "task-feedback"}, "current_node_id": current_node_id,
    }


def restore_memory(memory: PlayerMemory, state: Mapping[str, Any]) -> Session | None:
    profile = state.get("profile") or {}; memory.profile_id = str(profile.get("profile_id", memory.profile_id))
    memory.campaign_checkpoints = {str(k): str(v) for k, v in (state.get("campaign_checkpoints") or {}).items()}
    memory.passage_exposure = {str(k): int(v) for k, v in (state.get("passage_exposure") or {}).items()}; memory.evidence_exposure = {str(k): int(v) for k, v in (state.get("evidence_exposure") or {}).items()}
    memory.mistakes = {str(k): int(v) for k, v in (state.get("mistakes") or {}).items()}; memory.recent_fatigue = {str(k): int(v) for k, v in (state.get("recent_fatigue") or {}).items()}
    memory.node_history = {str(k): deserialize_task_state(v) for k, v in (state.get("history") or {}).items()}; memory.concept_mastery = {m.concept_id: m for m in (deserialize_mastery(x) for x in state.get("mastery") or [])}
    memory.review_queue = [deserialize_review_item(x) for x in state.get("review_queue") or []]
    sessions = [deserialize_session(x) for x in state.get("sessions") or []]; memory.sessions = sessions
    return sessions[-1] if sessions else None
