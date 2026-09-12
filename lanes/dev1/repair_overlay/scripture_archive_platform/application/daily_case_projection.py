from __future__ import annotations

from datetime import datetime, timezone
import re
from typing import Any, Callable

from runtime_engine.scripture_archive_runtime.daily_case import DailyCaseComposer
from runtime_engine.scripture_archive_runtime.models import (
    QueueKind,
    RetrievalRelation,
    SchedulerCandidate,
)

DAILY_CASE_RESPONSE_SCHEMA = "scripture.player.daily_case.v1"
_SOURCE_AUDIT_MARKERS = ("DEVELOPER_SOURCE_AUDITED", "SOURCE_AUDITED")


class DailyCaseProjection:
    """Read-only package projection over canonical runtime scheduling truth.

    This adapter does not rank candidates. It exposes only canonical mission entry
    points, the runtime-owned current node, and runtime-owned review queue nodes,
    then delegates eligibility/ranking to DailyCaseComposer -> Scheduler.
    """

    def __init__(self, runtime_application: Any, loader: Any, *, now_provider: Callable[[], datetime] | None = None) -> None:
        self.runtime = runtime_application
        self.loader = loader
        self.now_provider = now_provider or (lambda: datetime.now(timezone.utc))

    @staticmethod
    def _is_source_audited(mission: dict[str, Any]) -> bool:
        status = str(mission.get("canonical_status") or "").upper()
        tokens = {token for token in re.split(r"[^A-Z0-9_]+", status) if token}
        return any(marker in tokens for marker in _SOURCE_AUDIT_MARKERS)

    def _missions(self) -> list[dict[str, Any]]:
        missions: list[dict[str, Any]] = []
        for campaign in self.loader.list_campaigns():
            campaign_id = str(campaign.get("campaign_id") or "")
            if campaign_id:
                missions.extend(dict(row) for row in self.loader.list_missions(campaign_id))
        return missions

    def _candidate_node_ids(self) -> set[str]:
        node_ids = {
            str(mission.get("entry_node"))
            for mission in self._missions()
            if mission.get("entry_node")
        }
        if self.runtime.current_node_id:
            node_ids.add(str(self.runtime.current_node_id))
        for item in self.runtime.memory.review_queue:
            if item.node_id:
                node_ids.add(str(item.node_id))
        return node_ids

    def _review_item_for(self, node_id: str):
        items = [item for item in self.runtime.memory.review_queue if item.node_id == node_id]
        if not items:
            return None
        return sorted(items, key=lambda item: (item.due_at, -item.priority, item.queue_id))[0]

    def _candidate(self, node_id: str, now: datetime) -> SchedulerCandidate:
        task = self.runtime.content.get(node_id)
        # Reuse the runtime's canonical provenance release gate rather than
        # inferring release safety from presentation metadata.
        self.runtime._require_release_ground_truth(task)
        mission = self.loader.mission_for_node(node_id)
        review = self._review_item_for(node_id)
        if review is not None:
            queue = QueueKind.DUE if review.due_at <= now else QueueKind.REVIEW
            relation = review.relation
            due_at = review.due_at
        elif node_id == self.runtime.current_node_id:
            queue = QueueKind.CONTINUE
            relation = RetrievalRelation.EXACT
            due_at = None
        else:
            queue = QueueKind.NEW
            relation = RetrievalRelation.EXACT
            due_at = None
        task_family = str(task.raw.get("task_family") or task.task_type)
        return SchedulerCandidate(
            node_id=node_id,
            task_family=task_family,
            queue=queue,
            concept_ids=tuple(task.mastery_domains),
            relation=relation,
            source_audited=self._is_source_audited(mission),
            due_at=due_at,
            # Passage/book metadata is intentionally not inferred from prose.
            passage_keys=(),
            book_key=None,
            # Entry/current/review nodes are canonical runtime entry points; no
            # additional prerequisite truth is invented here.
            prerequisite_ready=True,
        )

    def response(self) -> dict[str, Any]:
        now = self.now_provider()
        if not isinstance(now, datetime) or now.tzinfo is None or now.utcoffset() is None:
            raise ValueError("Daily Case now_provider must return a timezone-aware datetime")
        day = now.astimezone(timezone.utc).date().isoformat()
        candidates = [self._candidate(node_id, now) for node_id in sorted(self._candidate_node_ids())]
        plan = DailyCaseComposer().compose(
            candidates,
            self.runtime.memory,
            self.runtime.session,
            case_id=day,
            title=f"Daily Case — {day}",
            limit=10,
            now=now,
        )
        return {
            "schema": DAILY_CASE_RESPONSE_SCHEMA,
            "read_only": True,
            "daily_case": plan.to_dict(),
            "linear": list(plan.linearize()),
            "candidate_count": len(candidates),
            "truth": {
                "composer": "runtime_engine.scripture_archive_runtime.daily_case.DailyCaseComposer",
                "scheduler": "runtime_engine.scripture_archive_runtime.scheduler.Scheduler",
                "memory": "runtime.v1 PlayerMemory",
                "session": "runtime.v1 Session",
                "candidate_projection": "canonical mission entry + runtime current + runtime review queue",
                "source_audit": "MISSION_INDEX.canonical_status explicit source-audit marker only",
                "inferred_source_claims": False,
                "mutation": False,
            },
        }
