from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable

from .memory import PlayerMemoryService
from .models import KnowledgeState, PlayerMemory, QueueKind, RetrievalRelation, SchedulerCandidate, Session


@dataclass(frozen=True)
class ScoredCandidate:
    candidate: SchedulerCandidate
    score: float
    reasons: tuple[str, ...]


class Scheduler:
    """Deterministic selection. No random selection is used; stable node_id breaks ties."""

    def __init__(self, *, memory_service: PlayerMemoryService | None = None) -> None:
        self.memory_service = memory_service or PlayerMemoryService()

    def eligible(self, candidate: SchedulerCandidate, memory: PlayerMemory, session: Session, *, adjacent_successful_exact_ids: set[str] | None = None, now: datetime | None = None) -> tuple[bool, str | None]:
        now = now or datetime.now(timezone.utc)
        if adjacent_successful_exact_ids is None:
            adjacent_successful_exact_ids = self.memory_service.adjacent_successful_exact_ids(memory, session)
        if not candidate.source_audited:
            return False, "not_source_audited"
        if not candidate.prerequisite_ready:
            return False, "prerequisite_not_ready"
        if candidate.node_id in session.shown_node_ids:
            return False, "already_shown_this_session"
        if candidate.queue in {QueueKind.DUE, QueueKind.REVIEW} and candidate.due_at and candidate.due_at > now and not candidate.user_requested:
            return False, "not_due_yet"
        exact_id = candidate.paired_exact_node_id or candidate.node_id
        if candidate.relation is RetrievalRelation.EXACT and exact_id in adjacent_successful_exact_ids:
            return False, "adjacent_session_exact_cooldown"
        task_state = memory.node_history.get(candidate.node_id)
        if task_state and task_state.completed and candidate.relation is RetrievalRelation.EXACT:
            if candidate.queue in {QueueKind.NEW, QueueKind.CONTINUE}:
                return False, "completed_exact_not_new"
        return True, None

    def score(self, candidate: SchedulerCandidate, memory: PlayerMemory, session: Session, *, now: datetime | None = None) -> ScoredCandidate:
        now = now or datetime.now(timezone.utc)
        score = 0.0
        reasons: list[str] = []
        queue_weights = {
            QueueKind.USER_REQUESTED: 120.0,
            QueueKind.WEAK: 95.0,
            QueueKind.DUE: 85.0,
            QueueKind.REVIEW: 75.0,
            QueueKind.CONTINUE: 65.0,
            QueueKind.NEW: 60.0,
            QueueKind.CROSS_CONTEXT: 55.0,
            QueueKind.SYNTHESIS: 50.0,
        }
        score += queue_weights.get(candidate.queue, 0.0)
        reasons.append(f"queue={candidate.queue.value}")
        score += candidate.campaign_continuity * 20.0
        score += candidate.weak_signal * 25.0
        if candidate.due_at:
            overdue_days = max(0.0, (now - candidate.due_at).total_seconds() / 86400.0)
            score += min(40.0, overdue_days * 4.0)
            if overdue_days:
                reasons.append(f"overdue_days={overdue_days:.2f}")
        novelty_bonus = {
            RetrievalRelation.VARIANT: 12.0,
            RetrievalRelation.CROSS_CONTEXT: 10.0,
            RetrievalRelation.PASSAGE_REVISIT: 6.0,
            RetrievalRelation.SYNTHESIS: 8.0,
            RetrievalRelation.EXACT: -8.0,
            RetrievalRelation.NONE: 0.0,
        }
        score += novelty_bonus[candidate.relation]
        family_recent = session.recent_task_families[-6:].count(candidate.task_family)
        if family_recent:
            score -= 9.0 * family_recent
            reasons.append(f"family_fatigue={family_recent}")
        persistent_family_fatigue = memory.recent_fatigue.get(f"task_family:{candidate.task_family}", 0)
        if persistent_family_fatigue:
            score -= min(18.0, float(persistent_family_fatigue) * 2.0)
            reasons.append(f"persistent_family_fatigue={persistent_family_fatigue}")
        passage_overlap = sum(1 for p in candidate.passage_keys if p in session.recent_passages[-8:])
        if passage_overlap and candidate.relation is RetrievalRelation.EXACT:
            score -= 8.0 * passage_overlap
            reasons.append(f"passage_fatigue={passage_overlap}")
        persistent_passage_fatigue = sum(memory.recent_fatigue.get(f"passage:{p}", 0) for p in candidate.passage_keys)
        if persistent_passage_fatigue and candidate.relation is RetrievalRelation.EXACT:
            score -= min(16.0, float(persistent_passage_fatigue))
            reasons.append(f"persistent_passage_fatigue={persistent_passage_fatigue}")
        for concept_id in candidate.concept_ids:
            mastery = memory.concept_mastery.get(concept_id)
            if mastery:
                if mastery.state in {KnowledgeState.LAPSED, KnowledgeState.LEARNING, KnowledgeState.REVIEW_DUE}:
                    score += 12.0
                    reasons.append(f"weak_concept={concept_id}")
                elif mastery.state is KnowledgeState.MASTERED_FOR_NOW and candidate.queue not in {QueueKind.DUE, QueueKind.REVIEW, QueueKind.CROSS_CONTEXT, QueueKind.SYNTHESIS}:
                    score -= 18.0
        if candidate.user_requested:
            score += 100.0
        return ScoredCandidate(candidate, score, tuple(reasons))

    def choose_next(self, candidates: Iterable[SchedulerCandidate], memory: PlayerMemory, session: Session, *, adjacent_successful_exact_ids: set[str] | None = None, now: datetime | None = None) -> ScoredCandidate | None:
        now = now or datetime.now(timezone.utc)
        scored: list[ScoredCandidate] = []
        for candidate in candidates:
            ok, _ = self.eligible(candidate, memory, session, adjacent_successful_exact_ids=adjacent_successful_exact_ids, now=now)
            if ok:
                scored.append(self.score(candidate, memory, session, now=now))
        scored.sort(key=lambda item: (-item.score, item.candidate.node_id))
        return scored[0] if scored else None

    def compose(self, candidates: Iterable[SchedulerCandidate], memory: PlayerMemory, session: Session, *, limit: int = 10, adjacent_successful_exact_ids: set[str] | None = None, now: datetime | None = None) -> list[SchedulerCandidate]:
        pool = list(candidates)
        selected: list[SchedulerCandidate] = []
        local_session = Session(
            session_id=session.session_id,
            started_at=session.started_at,
            ended_at=session.ended_at,
            shown_node_ids=list(session.shown_node_ids),
            recent_task_families=list(session.recent_task_families),
            recent_passages=list(session.recent_passages),
            correct_node_ids=set(session.correct_node_ids),
            successful_exact_ids=set(session.successful_exact_ids),
            ended_reason=session.ended_reason,
        )
        while pool and len(selected) < limit:
            best = self.choose_next(pool, memory, local_session, adjacent_successful_exact_ids=adjacent_successful_exact_ids, now=now)
            if best is None:
                break
            candidate = best.candidate
            selected.append(candidate)
            local_session.shown_node_ids.append(candidate.node_id)
            local_session.recent_task_families.append(candidate.task_family)
            local_session.recent_passages.extend(candidate.passage_keys)
            pool = [c for c in pool if c.node_id != candidate.node_id]
        return selected
