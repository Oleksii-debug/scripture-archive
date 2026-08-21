from __future__ import annotations

import uuid
from typing import Any, Mapping

from .accessibility import branch_event, grade_event, hint_event
from .answer_contracts import answer_contract_descriptor
from .branching import BranchEngine
from .content import ContentRepository
from .evidence import EvidenceRuntime
from .grading import GraderRegistry
from .mastery import MasteryEngine
from .models import Attempt, Correctness, HintUse, MasteryState, PlayerMemory, Session, TaskState
from .persistence import PersistenceStore
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

    def load_task(self, node_id: str) -> dict[str, Any]:
        task = self.content.get(node_id); self.current_node_id = node_id
        if node_id not in self.session.shown_node_ids: self.session.shown_node_ids.append(node_id)
        self.session.recent_task_families.append(task.task_type); self._visit_counts[node_id] = self._visit_counts.get(node_id, 0) + 1
        return {"api_version": self.API_VERSION, "task": {"node_id": task.node_id, "mission_id": task.mission_id, "task_type": task.task_type, "prompt": task.prompt, "source_scope": task.source_scope, "hints_available": len(task.hints), "tx1": task.tx1, "confidence": task.confidence.value, "answer_contract": answer_contract_descriptor(task.task_type), "functional_nonvisual_equivalent": task.raw.get("functional_nonvisual_equivalent", "")}}

    def submit_answer(self, node_id: str, answer: Any) -> dict[str, Any]:
        if node_id != self.current_node_id: raise ValidationError("submit_answer node_id is not the currently loaded task")
        task = self.content.get(node_id); state = self.memory.node_history.setdefault(node_id, TaskState(node_id=node_id)); hint_count = len(state.hint_uses)
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
        task = self.content.get(node_id); state = self.memory.node_history.setdefault(node_id, TaskState(node_id=node_id)); level = len(state.hint_uses) + 1; key = f"H{level}"
        if key not in task.hints: raise ValidationError("No additional hint available")
        use = HintUse(node_id, level, task.hints[key]); state.hint_uses.append(use)
        return {"api_version": self.API_VERSION, "hint": {"level": level, "text": use.text}, "accessibility": hint_event(level, use.text).to_dict()}

    def next(self, *, explicit_node_id: str | None = None) -> dict[str, Any]:
        if explicit_node_id: return self.load_task(explicit_node_id)
        if not self.current_node_id: raise ValidationError("No current task")
        task = self.content.get(self.current_node_id); state = self.memory.node_history.get(self.current_node_id); correctness = state.last_result if state and state.last_result else Correctness.INCORRECT
        resolution = self.branches.resolve(task, correctness, hint_count=len(state.hint_uses) if state else 0, hint_threshold=6)
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
        return {"api_version": self.API_VERSION, "restored": True, "current_node_id": self.current_node_id, "schema_version": state["schema_version"]}

    def handle(self, command: Mapping[str, Any] | CommandEnvelope) -> dict[str, Any]:
        envelope = command if isinstance(command, CommandEnvelope) else CommandEnvelope.from_mapping(command); p = envelope.payload
        routes = {"load_task": lambda: self.load_task(str(p["node_id"])), "submit_answer": lambda: self.submit_answer(str(p["node_id"]), p.get("answer")), "request_hint": lambda: self.request_hint(str(p["node_id"])), "next": lambda: self.next(explicit_node_id=str(p["node_id"]) if p.get("node_id") else None), "save": self.save, "restore": self.restore, "get_mastery": self.get_mastery, "get_evidence": self.get_evidence}
        if envelope.command not in routes: raise ValidationError("Unsupported command")
        return {"request_id": envelope.request_id, **routes[envelope.command]()}
