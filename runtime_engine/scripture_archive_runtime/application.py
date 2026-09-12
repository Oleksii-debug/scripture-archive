from __future__ import annotations

import uuid
from typing import Any, Mapping

from .accessibility import branch_event, grade_event, hint_event
from .answer_contracts import ANSWER_CONTRACT_VERSION, answer_contract_descriptor, validate_answer_dto
from .branching import BranchEngine
from .content import ContentRepository
from .evidence import EvidenceRuntime
from .grading import GraderRegistry
from .mastery import MasteryEngine
from .memory import PlayerMemoryService
from .models import (
    Attempt,
    BranchResolution,
    Correctness,
    HintUse,
    MasteryState,
    PlayerMemory,
    QueueKind,
    SchedulerCandidate,
    Session,
    TaskDefinition,
    TaskState,
)
from .persistence import PersistenceStore
from .provenance import PROVENANCE_CONTRACT_VERSION, ProvenanceDecision, classify_provenance
from .scheduler import Scheduler
from .security import CommandEnvelope, ValidationError
from .state_codec import restore_memory, serialize_mastery, serialize_memory, serialize_review_item


class RuntimeApplication:
    """UI-neutral, JSON-safe runtime.v1 command/query boundary."""
    API_VERSION = "runtime.v1"

    def __init__(self, content: ContentRepository, *, persistence: PersistenceStore | None = None, evidence: EvidenceRuntime | None = None) -> None:
        self.content, self.persistence, self.evidence = content, persistence, evidence or EvidenceRuntime()
        self.graders, self.branches, self.mastery_engine = GraderRegistry(), BranchEngine(), MasteryEngine()
        self.memory_service = PlayerMemoryService()
        self.scheduler = Scheduler(memory_service=self.memory_service)
        self.memory = PlayerMemory(profile_id="default"); self.current_node_id: str | None = None
        self.session = Session(session_id=str(uuid.uuid4())); self._visit_counts: dict[str, int] = {}
        self._active_hint_counts: dict[str, int] = {}
        self._current_visit_result: Correctness | None = None
        self._current_visit_resolution: BranchResolution | None = None
        self._review_session_active = False
        self._review_current_node_id: str | None = None
        self._review_shown = 0
        self._review_results = {"CORRECT": 0, "PARTIAL": 0, "INCORRECT": 0}

    @staticmethod
    def _require_release_ground_truth(task: TaskDefinition) -> ProvenanceDecision:
        decision = classify_provenance(task.raw)
        if not decision.release_pass:
            raise ValidationError(
                f"Ground truth provenance rejected for {task.node_id}: "
                f"{decision.provenance_class}: {decision.reason}"
            )
        return decision

    @staticmethod
    def _task_response(task: TaskDefinition, provenance: ProvenanceDecision) -> dict[str, Any]:
        return {"api_version": RuntimeApplication.API_VERSION, "task": {"node_id": task.node_id, "mission_id": task.mission_id, "task_type": task.task_type, "prompt": task.prompt, "source_scope": task.source_scope, "hints_available": len(task.hints), "tx1": task.tx1, "confidence": task.confidence.value, "answer_contract": answer_contract_descriptor(task.task_type), "ground_truth_provenance": {"schema": PROVENANCE_CONTRACT_VERSION, "class": provenance.provenance_class, "release_pass": provenance.release_pass, "explicit_representation": provenance.explicit_representation, "warning": provenance.warning}, "functional_nonvisual_equivalent": task.raw.get("functional_nonvisual_equivalent", "")}}

    def load_task(self, node_id: str) -> dict[str, Any]:
        task = self.content.get(node_id)
        provenance = self._require_release_ground_truth(task)
        self.current_node_id = node_id
        self._active_hint_counts[node_id] = 0
        self._current_visit_result = None
        self._current_visit_resolution = None
        if node_id not in self.session.shown_node_ids: self.session.shown_node_ids.append(node_id)
        self.session.recent_task_families.append(task.task_type); self._visit_counts[node_id] = self._visit_counts.get(node_id, 0) + 1
        return self._task_response(task, provenance)

    def submit_answer(self, node_id: str, answer: Any) -> dict[str, Any]:
        if node_id != self.current_node_id: raise ValidationError("submit_answer node_id is not the currently loaded task")
        task = self.content.get(node_id)
        self._require_release_ground_truth(task)
        state = self.memory.node_history.setdefault(node_id, TaskState(node_id=node_id)); hint_count = self._active_hint_counts.get(node_id, 0)
        result = self.graders.grade(task, answer); independent = hint_count == 0
        state.attempts.append(Attempt(node_id, result.correctness, result.score, hint_count, independent, answer_snapshot=answer)); state.last_result = result.correctness
        if result.correctness is Correctness.CORRECT: state.completed = True; self.session.correct_node_ids.add(node_id)
        elif result.correctness is Correctness.INCORRECT: self.memory.mistakes[node_id] = self.memory.mistakes.get(node_id, 0) + 1
        consequences = []
        for concept_id in task.mastery_domains:
            mastery = self.memory.concept_mastery.setdefault(concept_id, MasteryState(concept_id=concept_id))
            consequence = self.mastery_engine.apply(mastery, correctness=result.correctness, independent=independent, used_hints=hint_count)
            consequences.append(consequence)
            self.memory_service.enqueue_review(self.memory, consequence, node_id=node_id)
        resolution = self.branches.resolve(task, result.correctness, hint_count=hint_count, hint_threshold=6); self.branches.enforce_cycle_guard(resolution.next_node_id, self._visit_counts)
        for eid in resolution.evidence_unlocks:
            if eid in self.evidence.evidence:
                self.evidence.unlock(eid); state.evidence_unlocked.add(eid); self.memory.evidence_exposure[eid] = self.memory.evidence_exposure.get(eid, 0) + 1
        self._current_visit_result = result.correctness
        self._current_visit_resolution = resolution
        if self._review_session_active and self._review_current_node_id == node_id:
            self._review_results[result.correctness.value] += 1
        response = {"api_version": self.API_VERSION, "grade": result.to_dict(), "mastery_consequence": [self._consequence(c) for c in consequences], "branch": resolution.to_dict(), "accessibility": [grade_event(result, consequences).to_dict(), branch_event(resolution).to_dict()]}
        if self._review_session_active:
            response["review_session"] = self._review_summary()
        return response

    @staticmethod
    def _consequence(c: Any) -> dict[str, Any]:
        return {"concept_id": c.concept_id, "before": c.before.value, "after": c.after.value, "due_at": c.due_at.isoformat() if c.due_at else None, "stability_days": c.stability_days, "reason": c.reason}

    def request_hint(self, node_id: str) -> dict[str, Any]:
        if node_id != self.current_node_id: raise ValidationError("request_hint node_id is not the currently loaded task")
        task = self.content.get(node_id); state = self.memory.node_history.setdefault(node_id, TaskState(node_id=node_id)); level = self._active_hint_counts.get(node_id, 0) + 1; key = f"H{level}"
        if key not in task.hints: raise ValidationError("No additional hint available")
        use = HintUse(node_id, level, task.hints[key]); state.hint_uses.append(use); self._active_hint_counts[node_id] = level
        return {"api_version": self.API_VERSION, "hint": {"level": level, "text": use.text}, "accessibility": hint_event(level, use.text).to_dict()}

    def next(self, *, explicit_node_id: str | None = None) -> dict[str, Any]:
        if explicit_node_id is not None:
            raise ValidationError("runtime.v1 player next forbids caller-selected node targets")
        if not self.current_node_id: raise ValidationError("No current task")
        if self._current_visit_result is None or self._current_visit_resolution is None:
            raise ValidationError("Current task must be graded before player.next")
        resolution = self._current_visit_resolution
        if resolution.next_node_id:
            self.branches.enforce_cycle_guard(resolution.next_node_id, self._visit_counts); return self.load_task(resolution.next_node_id)
        self._current_visit_result = None
        self._current_visit_resolution = None
        return {"api_version": self.API_VERSION, "branch": resolution.to_dict(), "accessibility": branch_event(resolution).to_dict()}

    def get_mastery(self) -> dict[str, Any]:
        return {"api_version": self.API_VERSION, "mastery": [serialize_mastery(s) for _, s in sorted(self.memory.concept_mastery.items())]}

    def get_review_queue(self) -> dict[str, Any]:
        return {"api_version": self.API_VERSION, "review_queue": [serialize_review_item(item) for item in self.memory.review_queue]}

    def _review_groups(self) -> tuple[list[SchedulerCandidate], dict[str, dict[str, Any]]]:
        grouped: dict[str, list[Any]] = {}
        for item in self.memory.review_queue:
            if item.node_id is None:
                continue
            state = self.memory.node_history.get(item.node_id)
            if state is None or not state.attempts:
                raise ValidationError(f"Review queue item {item.queue_id} is not backed by an attempted runtime task")
            grouped.setdefault(item.node_id, []).append(item)

        candidates: list[SchedulerCandidate] = []
        metadata: dict[str, dict[str, Any]] = {}
        for node_id, items in sorted(grouped.items()):
            task = self.content.get(node_id)
            self._require_release_ground_truth(task)
            relations = {item.relation for item in items}
            if len(relations) != 1:
                raise ValidationError(f"Review queue has conflicting relations for {node_id}")
            concept_ids = tuple(sorted({item.concept_id for item in items}))
            due_at = min(item.due_at for item in items)
            max_priority = max(item.priority for item in items)
            relation = next(iter(relations))
            candidate = SchedulerCandidate(
                node_id=node_id,
                task_family=task.task_type,
                queue=QueueKind.REVIEW,
                concept_ids=concept_ids,
                relation=relation,
                source_audited=True,
                due_at=due_at,
                weak_signal=max(0.0, min(1.0, float(max_priority) / 100.0)),
            )
            candidates.append(candidate)
            metadata[node_id] = {
                "queue_ids": [item.queue_id for item in sorted(items, key=lambda x: x.queue_id)],
                "concept_ids": list(concept_ids),
                "relation": relation.value,
                "reasons": [item.reason for item in sorted(items, key=lambda x: x.queue_id)],
                "due_at": due_at.isoformat(),
                "priority": max_priority,
            }
        return candidates, metadata

    def _eligible_review_count(self, candidates: list[SchedulerCandidate]) -> int:
        adjacent = self.memory_service.adjacent_successful_exact_ids(self.memory, self.session)
        return sum(
            1
            for candidate in candidates
            if self.scheduler.eligible(
                candidate,
                self.memory,
                self.session,
                adjacent_successful_exact_ids=adjacent,
            )[0]
        )

    def _review_summary(self, *, remaining_eligible: int | None = None, reason: str | None = None) -> dict[str, Any]:
        summary = {
            "active": self._review_session_active,
            "shown": self._review_shown,
            "results": dict(self._review_results),
            "current_node_id": self._review_current_node_id,
        }
        if remaining_eligible is not None:
            summary["remaining_eligible"] = int(remaining_eligible)
        if reason:
            summary["reason"] = reason
        return summary

    def start_review(self) -> dict[str, Any]:
        """Start, resume, or continue review using persisted queue truth and Scheduler policy.

        The caller never supplies a node target. If a UI navigation race loses the response
        that first opened an ungraded review task, a repeat empty-payload start re-presents
        that exact runtime-owned task without creating another visit or selecting a new one.
        """
        if self._review_session_active and self._review_current_node_id:
            if self.current_node_id != self._review_current_node_id:
                raise ValidationError("Review session current-node state is inconsistent")
            if self._current_visit_result is None:
                candidates, metadata = self._review_groups()
                current_id = self._review_current_node_id
                selection = metadata.get(current_id)
                if selection is None:
                    raise ValidationError("Active review task is no longer backed by persisted review queue truth")
                task = self.content.get(current_id)
                provenance = self._require_release_ground_truth(task)
                return {
                    **self._task_response(task, provenance),
                    "review_selection": selection,
                    "review_session": self._review_summary(
                        remaining_eligible=self._eligible_review_count(candidates),
                        reason="resume_current_review",
                    ),
                }

        candidates, metadata = self._review_groups()
        if self._review_session_active:
            adjacent = self.memory_service.adjacent_successful_exact_ids(self.memory, self.session)
            selection_session = self.session
        else:
            adjacent = set(self.session.successful_exact_ids or self.session.correct_node_ids)
            selection_session = Session(session_id="review-selection-preview")
        best = self.scheduler.choose_next(
            candidates,
            self.memory,
            selection_session,
            adjacent_successful_exact_ids=adjacent,
        )
        if best is None:
            was_active = self._review_session_active
            if was_active:
                self.memory_service.finish_session(self.memory, self.session, reason="review_queue_exhausted")
                self.session = self.memory_service.start_session(self.memory)
            self._review_session_active = False
            self._review_current_node_id = None
            if was_active:
                self.current_node_id = None
                self._current_visit_result = None
                self._current_visit_resolution = None
                self._active_hint_counts = {}
            return {
                "api_version": self.API_VERSION,
                "task": None,
                "review_session": self._review_summary(remaining_eligible=0, reason="no_eligible_due_review"),
            }

        if not self._review_session_active:
            self.memory_service.finish_session(self.memory, self.session, reason="review_training_switch")
            self.session = self.memory_service.start_session(self.memory)
            self._review_session_active = True
            self._review_shown = 0
            self._review_results = {"CORRECT": 0, "PARTIAL": 0, "INCORRECT": 0}

        selected = best.candidate
        task_response = self.load_task(selected.node_id)
        self._review_current_node_id = selected.node_id
        self._review_shown += 1
        remaining = self._eligible_review_count(candidates)
        return {
            **task_response,
            "review_selection": metadata[selected.node_id],
            "review_session": self._review_summary(remaining_eligible=remaining),
        }

    def finish_review(self) -> dict[str, Any]:
        """Explicitly leave an active Review Training session and release its entry point."""
        if not self._review_session_active:
            raise ValidationError("Review Training session is not active")
        summary = self._review_summary(reason="stopped_by_user")
        self.memory_service.finish_session(self.memory, self.session, reason="review_training_stopped")
        self.session = self.memory_service.start_session(self.memory)
        self._review_session_active = False
        self._review_current_node_id = None
        self.current_node_id = None
        self._current_visit_result = None
        self._current_visit_resolution = None
        self._active_hint_counts = {}
        summary["active"] = False
        summary["current_node_id"] = None
        return {"api_version": self.API_VERSION, "review_session": summary}

    def get_evidence(self) -> dict[str, Any]:
        return {"api_version": self.API_VERSION, "unlocked": sorted(self.evidence.unlocked), "linear": self.evidence.linearize()}

    def save(self) -> dict[str, Any]:
        if not self.persistence: raise ValidationError("Persistence is not configured")
        self.persistence.save(serialize_memory(self.memory, self.session, self.current_node_id)); return {"api_version": self.API_VERSION, "saved": True}

    def restore(self) -> dict[str, Any]:
        if not self.persistence: raise ValidationError("Persistence is not configured")
        self._current_visit_result = None
        self._current_visit_resolution = None
        self._review_session_active = False
        self._review_current_node_id = None
        state = self.persistence.load()
        restored_session = restore_memory(self.memory, state)
        self.current_node_id = state.get("current_node_id")
        if restored_session: self.session = restored_session
        self._active_hint_counts = {}
        return {"api_version": self.API_VERSION, "restored": True, "current_node_id": self.current_node_id, "schema_version": state["schema_version"]}

    def _load_task_command(self, payload: Mapping[str, Any]) -> dict[str, Any]:
        node_id = str(payload["node_id"])
        if self.current_node_id is None:
            return self.load_task(node_id)
        if node_id != self.current_node_id:
            raise ValidationError("runtime.v1 player load_task cannot change current node; use next")
        task = self.content.get(node_id)
        provenance = self._require_release_ground_truth(task)
        return self._task_response(task, provenance)

    def _submit_command(self, payload: Mapping[str, Any]) -> dict[str, Any]:
        node_id = str(payload["node_id"])
        task = self.content.get(node_id)
        raw_answer = payload.get("answer")
        if not isinstance(raw_answer, Mapping) or raw_answer.get("schema") != ANSWER_CONTRACT_VERSION:
            raise ValidationError("runtime.v1 submit_answer requires explicit ANSWER_DTO_v1 schema")
        if "task_type" not in raw_answer:
            raise ValidationError("runtime.v1 submit_answer requires explicit answer task_type")
        answer = validate_answer_dto(task.task_type, raw_answer)
        return self.submit_answer(node_id, answer)

    def _next_command(self, payload: Mapping[str, Any]) -> dict[str, Any]:
        if payload:
            raise ValidationError("runtime.v1 next accepts no caller-selected target payload")
        return self.next()

    @staticmethod
    def _empty_payload(payload: Mapping[str, Any], command: str) -> None:
        if payload:
            raise ValidationError(f"runtime.v1 {command} accepts an empty payload")

    def handle(self, command: Mapping[str, Any] | CommandEnvelope) -> dict[str, Any]:
        envelope = command if isinstance(command, CommandEnvelope) else CommandEnvelope.from_mapping(command); p = envelope.payload
        routes = {
            "load_task": lambda: self._load_task_command(p),
            "submit_answer": lambda: self._submit_command(p),
            "request_hint": lambda: self.request_hint(str(p["node_id"])),
            "next": lambda: self._next_command(p),
            "save": self.save,
            "restore": self.restore,
            "get_mastery": self.get_mastery,
            "get_review_queue": self.get_review_queue,
            "start_review": lambda: (self._empty_payload(p, "start_review"), self.start_review())[1],
            "finish_review": lambda: (self._empty_payload(p, "finish_review"), self.finish_review())[1],
            "get_evidence": self.get_evidence,
        }
        if envelope.command not in routes: raise ValidationError("Unsupported command")
        return {"request_id": envelope.request_id, **routes[envelope.command]()}
