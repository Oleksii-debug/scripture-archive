from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Iterable

from .models import (
    KnowledgeState,
    MasteryConsequence,
    PlayerMemory,
    RetrievalRelation,
    ReviewQueueItem,
    Session,
)


MAX_PERSISTED_SESSIONS = 200
MAX_RECENT_TASK_FAMILIES = 24
MAX_RECENT_PASSAGES = 40
MAX_FATIGUE_KEYS = 128


class PlayerMemoryService:
    """Deterministic player-memory lifecycle; no grading/content truth is owned here."""

    def start_session(
        self,
        memory: PlayerMemory,
        *,
        session_id: str | None = None,
        now: datetime | None = None,
    ) -> Session:
        now = now or datetime.now(timezone.utc)
        new_session_id = session_id or str(uuid.uuid4())
        if any(existing.session_id == new_session_id for existing in memory.sessions):
            raise ValueError(f"Duplicate session_id: {new_session_id}")
        if memory.sessions and memory.sessions[-1].ended_at is None:
            previous = memory.sessions[-1]
            previous.ended_at = now
            previous.ended_reason = previous.ended_reason or "restart_recovery"
        session = Session(session_id=new_session_id, started_at=now)
        memory.sessions.append(session)
        self.trim_sessions(memory)
        return session

    def finish_session(
        self,
        memory: PlayerMemory,
        session: Session,
        *,
        now: datetime | None = None,
        reason: str = "completed",
    ) -> None:
        now = now or datetime.now(timezone.utc)
        session.ended_at = session.ended_at or now
        session.ended_reason = session.ended_reason or reason
        if all(existing.session_id != session.session_id for existing in memory.sessions):
            memory.sessions.append(session)
        self.trim_sessions(memory)

    def record_task_loaded(
        self,
        memory: PlayerMemory,
        session: Session,
        *,
        node_id: str,
        task_family: str,
        passage_keys: Iterable[str] = (),
        campaign_id: str | None = None,
    ) -> None:
        if node_id not in session.shown_node_ids:
            session.shown_node_ids.append(node_id)
        session.recent_task_families.append(task_family)
        del session.recent_task_families[:-MAX_RECENT_TASK_FAMILIES]

        passages = tuple(dict.fromkeys(str(p) for p in passage_keys if str(p).strip()))
        for passage in passages:
            memory.passage_exposure[passage] = memory.passage_exposure.get(passage, 0) + 1
            session.recent_passages.append(passage)
        del session.recent_passages[:-MAX_RECENT_PASSAGES]

        if campaign_id:
            memory.campaign_checkpoints[campaign_id] = node_id

        fatigue_keys = [f"task_family:{task_family}"] + [f"passage:{p}" for p in passages]
        self._advance_fatigue(memory, fatigue_keys)

    def record_correct(
        self,
        session: Session,
        *,
        node_id: str,
        exact_identity_ids: Iterable[str] = (),
    ) -> None:
        session.correct_node_ids.add(node_id)
        identities = {str(x) for x in exact_identity_ids if str(x).strip()}
        identities.add(node_id)
        session.successful_exact_ids.update(identities)

    def adjacent_successful_exact_ids(self, memory: PlayerMemory, session: Session) -> set[str]:
        if not memory.sessions:
            return set()
        index = next((i for i, item in enumerate(memory.sessions) if item.session_id == session.session_id), None)
        if index is None:
            previous = memory.sessions[-1]
            if previous.session_id == session.session_id:
                return set()
        elif index == 0:
            return set()
        else:
            previous = memory.sessions[index - 1]
        return set(previous.successful_exact_ids or previous.correct_node_ids)

    def enqueue_review(
        self,
        memory: PlayerMemory,
        consequence: MasteryConsequence,
        *,
        node_id: str,
        relation: RetrievalRelation = RetrievalRelation.EXACT,
    ) -> ReviewQueueItem | None:
        if consequence.due_at is None:
            return None
        priority_by_state = {
            KnowledgeState.LAPSED: 100,
            KnowledgeState.REVIEW_DUE: 90,
            KnowledgeState.LEARNING: 80,
            KnowledgeState.STABLE: 55,
            KnowledgeState.MASTERED_FOR_NOW: 35,
            KnowledgeState.INTRODUCED: 70,
            KnowledgeState.UNSEEN: 60,
        }
        item = ReviewQueueItem(
            queue_id=f"review:{consequence.concept_id}:{node_id}",
            concept_id=consequence.concept_id,
            node_id=node_id,
            due_at=consequence.due_at,
            priority=priority_by_state[consequence.after],
            relation=relation,
            reason=consequence.reason,
        )
        memory.review_queue = [existing for existing in memory.review_queue if existing.queue_id != item.queue_id]
        memory.review_queue.append(item)
        memory.review_queue.sort(key=lambda x: (x.due_at, -x.priority, x.queue_id))
        return item

    def refresh_due_states(self, memory: PlayerMemory, *, now: datetime | None = None) -> int:
        now = now or datetime.now(timezone.utc)
        changed = 0
        for mastery in memory.concept_mastery.values():
            if mastery.due_at and mastery.due_at <= now and mastery.state in {
                KnowledgeState.STABLE,
                KnowledgeState.MASTERED_FOR_NOW,
            }:
                mastery.state = KnowledgeState.REVIEW_DUE
                changed += 1
        return changed

    def trim_sessions(self, memory: PlayerMemory, *, limit: int = MAX_PERSISTED_SESSIONS) -> None:
        if limit < 1:
            raise ValueError("session retention limit must be positive")
        excess = len(memory.sessions) - limit
        if excess <= 0:
            return
        removed = memory.sessions[:excess]
        memory.sessions = memory.sessions[excess:]
        rollup = memory.session_rollup
        rollup["archived_sessions"] = rollup.get("archived_sessions", 0) + len(removed)
        rollup["archived_shown_nodes"] = rollup.get("archived_shown_nodes", 0) + sum(len(s.shown_node_ids) for s in removed)
        rollup["archived_correct_nodes"] = rollup.get("archived_correct_nodes", 0) + sum(len(s.correct_node_ids) for s in removed)
        rollup["archived_exact_successes"] = rollup.get("archived_exact_successes", 0) + sum(len(s.successful_exact_ids) for s in removed)

    def _advance_fatigue(self, memory: PlayerMemory, active_keys: Iterable[str]) -> None:
        decayed: dict[str, int] = {}
        for key, value in memory.recent_fatigue.items():
            remaining = int(value) - 1
            if remaining > 0:
                decayed[str(key)] = remaining
        for key in active_keys:
            key = str(key)
            boost = 4 if key.startswith("task_family:") else 3
            decayed[key] = min(12, decayed.get(key, 0) + boost)
        if len(decayed) > MAX_FATIGUE_KEYS:
            ranked = sorted(decayed.items(), key=lambda item: (-item[1], item[0]))[:MAX_FATIGUE_KEYS]
            decayed = dict(ranked)
        memory.recent_fatigue = decayed
