from __future__ import annotations

import uuid
from typing import Any, Mapping

from .accessibility import branch_event, grade_event, hint_event
from .answer_contracts import answer_contract_descriptor, validate_answer_dto
from .branching import BranchEngine
from .content import ContentRepository
from .evidence import EvidenceRuntime
from .grading import GraderRegistry
from .mastery import MasteryEngine
from .models import Attempt, Correctness, HintUse, MasteryState, PlayerMemory, Session, TaskDefinition, TaskState
from .persistence import PersistenceStore
from .provenance import PROVENANCE_CONTRACT_VERSION, ProvenanceDecision, classify_provenance
from .security import CommandEnvelope, ValidationError
from .state_codec import restore_memory, serialize_mastery, serialize_memory


class RuntimeApplication:
    """UI-neutral, JSON-safe runtime.v1 command/query boundary."""
    API_VERSION = "runtime.v1"

    def __init__(self, content: ContentRepository, *, persistence: PersistenceStore | None = None, evidence: EvidenceRuntime | None = None) -> None:
        self.content, self.persistence, self.evidence = content, persistence, evidence or EvidenceRuntime()
        self.graders, self.branches, self.mastery_engine = GraderRegistry(), BranchEngine(), MasteryEngine()
        self.memory = PlayerMemory(profile_id="default"); self.current_node_id: str | None = None
        self.session = Session(session_id=str(uuid.uuid4())); self._visit_counts: dict[str, int] = {}
        # Persisted TaskState.hint_uses is the historical audit trail. This separate
        # per-visit counter prevents a hint used months ago from permanently downgrading
        # every future attempt or exhausting the H1..H7 ladder forever.
        self._active_hint_counts: dict[str, int] = {}

    @staticmethod
    def _require_release_ground_truth(task: TaskDefinition) -> ProvenanceDecision:
        """Fail closed before render/grading when canonical truth is ambiguous or conflicting.

        The runtime must never silently prefer task-specific grading/presentation data over
        CONTENT_NODE_SCHEMA v1.2 ground truth. Provenance classification is deterministic
        and does not call an LLM or infer truth from task_payload/UI metadata.
        """
        decision = classify_provenance(task.raw)
        if not decision.release_pass:
            raise ValidationError(
                f"Ground truth provenance rejected for {task.node_id}: "
                f"{decision.provenance_class}: {decision.reason}"
            )
        return decision

    def load_task(self, node_id: str) -> dict[str, Any]:
        task = self.content.get(node_id)
        provenance = self._require_release_ground_truth(task)
        self.current_node_id = node_id
        self._active_hint_counts[node_id] = 0
        if node_id not in self.session.shown_node_ids: self.session.shown_node_ids.append(node_id)
        self.session.recent_task_families.append(task.task_type); self._visit_counts[node_id] = self._visit_counts.get(node_id, 0) + 1
        return {"api_version": self.API_VERSION, "task": {"node_id": task.node_id, "mission_id": task.mission_id, "task_type": task.task_type, "prompt": task.prompt, "source_scope": task.source_scope, "hints_available": len(task.hints), "tx1": task.tx1, "confidence": task.confidence.value, "answer_contract": answer_contract_descriptor(task.task_type), "ground_truth_provenance": {"schema": PROVENANCE_CONTRACT_VERSION, "class": provenance.provenance_class, "release_pass": provenance.release_pass, "explicit_representation": provenance.explicit_representation, "warning": provenance.warning}, "functional_nonvisual_equivalent": task.raw.get("functional_nonvisual_equivalent", "")}}

    def submit_answer(self, node_id: str, answer: Any) -> dict[str, Any]:
        if node_id != self.current_node_id: raise ValidationError("submit_answer node_id is not the currently loaded task")
        task = self.content.get(node_id)
        self._require_release_ground_truth(task)
        state = self.memory.node_history.setdefault(node_id, TaskState(node_id=node_id)); hint_count = self._active_hint_counts.get(node_id, 0)
        result = self.graders.grade(task, answer); independent = hint_count < 6
        state.attempts.append(Attempt(node_id, result.correctness, result.score, hint_count, independent, answer_snapshot=answer)); state.last_result = result.correctness
        if result.correctness is Correctness.CORRECT: state.completed = True; self.session.correct_node_ids.add(node_id)
        elif result.correctness is Correctness.INCORRECT: self.memory.mistakes[node_id] = self.memory.mistakes.get(node_id, 0) + 1
        consequences = []
        for concept_id in task.mastery_domains:
            mastery = self.memory.concept_mastery.setdefault(concept_id, MasteryState(concept_id=concept_id))
            consequences.append(self.mastery_engine.apply(mastery, correctness=result.correctness, independent=independent, used_hints=hint_count))
        resolution = self.branches.resolve(task, result.correctness, hint_count=hint_count, hint_threshold=6); self.branches.enforce_cycle_guard(resolution.next_node_id, self._visit_counts)
        for eid in resolution.evidence_unlocks:
            if eid in self.evidence.evidence:
                self.evidence.unlock(eid); state.evidence_unlocked.add(eid); self.memory.evidence_exposure[eid] = self.memory.evidence_exposure.get(eid, 0) + 1
        return {"api_version": self.API_VERSION, "grade": result.to_dict(), "mastery_consequence": [self._consequence(c) for c in consequences], "branch": resolution.to_dict(), "accessibility": [grade_event(result, consequences).to_dict(), branch_event(resolution).to_dict()]}

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
        if explicit_node_id: return self.load_task(explicit_node_id)
        if not self.current_node_id: raise ValidationError("No current task")
        task = self.content.get(self.current_node_id); state = self.memory.node_history.get(self.current_node_id); correctness = state.last_result if state and state.last_result else Correctness.INCORRECT
        hint_count = self._active_hint_counts.get(self.current_node_id, 0)
        resolution = self.branches.resolve(task, correctness, hint_count=hint_count, hint_threshold=6)
        if resolution.next_node_id:
            self.branches.enforce_cycle_guard(resolution.next_node_id, self._visit_counts); return self.load_task(resolution.next_node_id)
        return {"api_version": self.API_VERSION, "branch": resolution.to_dict(), "accessibility": branch_event(resolution).to_dict()}

    def get_mastery(self) -> dict[str, Any]:
        return {"api_version": self.API_VERSION, "mastery": [serialize_mastery(s) for _, s in sorted(self.memory.concept_mastery.items())]}

    def get_evidence(self) -> dict[str, Any]:
        return {"api_version": self.API_VERSION, "unlocked": sorted(self.evidence.unlocked), "linear": self.evidence.linearize()}

    def save(self) -> dict[str, Any]:
        if not self.persistence: raise ValidationError("Persistence is not configured")
        self.persistence.save(serialize_memory(self.memory, self.session, self.current_node_id)); return {"api_version": self.API_VERSION, "saved": True}

    def restore(self) -> dict[str, Any]:
        if not self.persistence: raise ValidationError("Persistence is not configured")
        state = self.persistence.load(); self.current_node_id = state.get("current_node_id"); restored_session = restore_memory(self.memory, state)
        if restored_session: self.session = restored_session
        # A process/session restore begins a new active attempt scope; historical hint uses
        # remain persisted in TaskState for analytics but do not consume today's ladder.
        self._active_hint_counts = {}
        return {"api_version": self.API_VERSION, "restored": True, "current_node_id": self.current_node_id, "schema_version": state["schema_version"]}

    def _submit_command(self, payload: Mapping[str, Any]) -> dict[str, Any]:
        """Strict public runtime.v1 submission boundary.

        Direct Python callers may still exercise a grader with legacy primitive values for
        compatibility tests, but transport/API callers must use the advertised versioned
        ANSWER_DTO_v1 object and may not smuggle unknown fields past the validator.
        """
        node_id = str(payload["node_id"])
        task = self.content.get(node_id)
        answer = validate_answer_dto(task.task_type, payload.get("answer"))
        return self.submit_answer(node_id, answer)

    def handle(self, command: Mapping[str, Any] | CommandEnvelope) -> dict[str, Any]:
        envelope = command if isinstance(command, CommandEnvelope) else CommandEnvelope.from_mapping(command); p = envelope.payload
        routes = {"load_task": lambda: self.load_task(str(p["node_id"])), "submit_answer": lambda: self._submit_command(p), "request_hint": lambda: self.request_hint(str(p["node_id"])), "next": lambda: self.next(explicit_node_id=str(p["node_id"]) if p.get("node_id") else None), "save": self.save, "restore": self.restore, "get_mastery": self.get_mastery, "get_evidence": self.get_evidence}
        if envelope.command not in routes: raise ValidationError("Unsupported command")
        return {"request_id": envelope.request_id, **routes[envelope.command]()}
