from __future__ import annotations

from datetime import datetime, timedelta, timezone

from .models import Correctness, KnowledgeState, MasteryConsequence, MasteryState


class MasteryEngine:
    """Deterministic concept-level state transitions. Intervals are calibration defaults, not theological claims."""

    def apply(self, state: MasteryState, *, correctness: Correctness, independent: bool, used_hints: int, now: datetime | None = None) -> MasteryConsequence:
        now = now or datetime.now(timezone.utc)
        before = state.state
        state.last_seen_at = now
        reason: str

        if correctness is Correctness.CORRECT and independent and used_hints == 0:
            state.consecutive_independent_successes += 1
            if before in {KnowledgeState.UNSEEN, KnowledgeState.INTRODUCED, KnowledgeState.LEARNING, KnowledgeState.LAPSED, KnowledgeState.REVIEW_DUE}:
                state.state = KnowledgeState.STABLE if state.consecutive_independent_successes >= 2 else KnowledgeState.LEARNING
            elif before is KnowledgeState.STABLE and state.consecutive_independent_successes >= 3:
                state.state = KnowledgeState.MASTERED_FOR_NOW
            elif before is KnowledgeState.MASTERED_FOR_NOW:
                state.state = KnowledgeState.MASTERED_FOR_NOW
            state.stability_days = max(1.0, state.stability_days * 1.8 if state.stability_days else 2.0)
            if state.state is KnowledgeState.MASTERED_FOR_NOW:
                state.stability_days = max(state.stability_days, 7.0)
            reason = "independent_correct"
        elif correctness is Correctness.CORRECT:
            state.guided_successes += 1
            state.consecutive_independent_successes = 0
            state.state = KnowledgeState.LEARNING if before in {KnowledgeState.UNSEEN, KnowledgeState.INTRODUCED, KnowledgeState.LAPSED} else min_state(before, KnowledgeState.STABLE)
            state.stability_days = max(0.5, state.stability_days * 0.7 if state.stability_days else 1.0)
            reason = "guided_correct"
        elif correctness is Correctness.PARTIAL:
            state.consecutive_independent_successes = 0
            state.state = KnowledgeState.LEARNING
            state.stability_days = max(0.25, state.stability_days * 0.5)
            reason = "partial"
        else:
            state.failures += 1
            state.consecutive_independent_successes = 0
            state.state = KnowledgeState.LAPSED if before in {KnowledgeState.STABLE, KnowledgeState.MASTERED_FOR_NOW, KnowledgeState.REVIEW_DUE} else KnowledgeState.LEARNING
            state.stability_days = max(0.125, state.stability_days * 0.35)
            reason = "incorrect"

        if state.state is KnowledgeState.MASTERED_FOR_NOW:
            interval = max(7.0, state.stability_days)
        elif state.state is KnowledgeState.STABLE:
            interval = max(3.0, state.stability_days)
        elif state.state is KnowledgeState.LEARNING:
            interval = 1.0 if correctness is not Correctness.INCORRECT else 0.25
        elif state.state is KnowledgeState.LAPSED:
            interval = 0.25
        else:
            interval = 1.0
        state.due_at = now + timedelta(days=interval)
        return MasteryConsequence(state.concept_id, before, state.state, state.due_at, state.stability_days, reason)

    def mark_due(self, state: MasteryState, *, now: datetime | None = None) -> None:
        now = now or datetime.now(timezone.utc)
        if state.due_at and state.due_at <= now and state.state in {KnowledgeState.STABLE, KnowledgeState.MASTERED_FOR_NOW}:
            state.state = KnowledgeState.REVIEW_DUE


def min_state(a: KnowledgeState, cap: KnowledgeState) -> KnowledgeState:
    rank = {
        KnowledgeState.UNSEEN: 0,
        KnowledgeState.INTRODUCED: 1,
        KnowledgeState.LEARNING: 2,
        KnowledgeState.STABLE: 3,
        KnowledgeState.MASTERED_FOR_NOW: 4,
        KnowledgeState.REVIEW_DUE: 3,
        KnowledgeState.LAPSED: 1,
    }
    return a if rank[a] <= rank[cap] else cap
