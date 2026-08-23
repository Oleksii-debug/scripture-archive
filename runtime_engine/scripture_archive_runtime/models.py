from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Mapping, Sequence


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Correctness(str, Enum):
    CORRECT = "CORRECT"
    PARTIAL = "PARTIAL"
    INCORRECT = "INCORRECT"


class Confidence(str, Enum):
    T1 = "T1"
    T2 = "T2"
    C1 = "C1"
    I1 = "I1"
    D1 = "D1"


class KnowledgeState(str, Enum):
    UNSEEN = "UNSEEN"
    INTRODUCED = "INTRODUCED"
    LEARNING = "LEARNING"
    STABLE = "STABLE"
    MASTERED_FOR_NOW = "MASTERED_FOR_NOW"
    REVIEW_DUE = "REVIEW_DUE"
    LAPSED = "LAPSED"


class RetrievalRelation(str, Enum):
    EXACT = "EXACT"
    VARIANT = "VARIANT"
    PASSAGE_REVISIT = "PASSAGE_REVISIT"
    CROSS_CONTEXT = "CROSS_CONTEXT"
    SYNTHESIS = "SYNTHESIS"
    NONE = "NONE"


class QueueKind(str, Enum):
    CONTINUE = "CONTINUE"
    NEW = "NEW"
    DUE = "DUE"
    WEAK = "WEAK"
    REVIEW = "REVIEW"
    CROSS_CONTEXT = "CROSS_CONTEXT"
    SYNTHESIS = "SYNTHESIS"
    USER_REQUESTED = "USER_REQUESTED"


class BranchTerminal(str, Enum):
    NODE = "NODE"
    RESOLVED_NODE = "RESOLVED_NODE"
    REVIEW_QUEUE = "REVIEW_QUEUE"
    DEFERRED_CAMPAIGN = "DEFERRED_CAMPAIGN"
    MISSION_COMPLETE = "MISSION_COMPLETE"
    RETIRED = "RETIRED"
    RETURN_CURRENT = "RETURN_CURRENT"
    NONE = "NONE"


@dataclass(frozen=True)
class GradeResult:
    correctness: Correctness
    score: float
    confidence: Confidence
    tx1: bool
    source_scope: str
    accepted_proposition: Any
    evidence: tuple[str, ...] = ()
    uncertainty: str | None = None
    feedback: str | None = None
    details: Mapping[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["correctness"] = self.correctness.value
        data["confidence"] = self.confidence.value
        data["evidence"] = list(self.evidence)
        data["details"] = dict(self.details)
        return data


@dataclass(frozen=True)
class Attempt:
    node_id: str
    correctness: Correctness
    score: float
    used_hints: int
    independent: bool
    created_at: datetime = field(default_factory=utc_now)
    answer_snapshot: Any = None


@dataclass(frozen=True)
class HintUse:
    node_id: str
    level: int
    text: str
    created_at: datetime = field(default_factory=utc_now)


@dataclass(frozen=True)
class EvidenceUnlock:
    evidence_id: str
    node_id: str
    reason: str
    created_at: datetime = field(default_factory=utc_now)


@dataclass(frozen=True)
class MasteryConsequence:
    concept_id: str
    before: KnowledgeState
    after: KnowledgeState
    due_at: datetime | None
    stability_days: float
    reason: str


@dataclass
class MasteryState:
    concept_id: str
    state: KnowledgeState = KnowledgeState.UNSEEN
    stability_days: float = 0.0
    difficulty: float = 0.5
    consecutive_independent_successes: int = 0
    guided_successes: int = 0
    failures: int = 0
    last_seen_at: datetime | None = None
    due_at: datetime | None = None


@dataclass
class TaskState:
    node_id: str
    attempts: list[Attempt] = field(default_factory=list)
    hint_uses: list[HintUse] = field(default_factory=list)
    evidence_unlocked: set[str] = field(default_factory=set)
    completed: bool = False
    last_result: Correctness | None = None


@dataclass
class MissionState:
    mission_id: str
    current_node_id: str | None = None
    completed_nodes: set[str] = field(default_factory=set)
    branch_history: list[str] = field(default_factory=list)
    completed: bool = False


@dataclass
class CampaignState:
    campaign_id: str
    current_mission_id: str | None = None
    checkpoint_node_id: str | None = None
    completed_missions: set[str] = field(default_factory=set)
    deferred_branches: list[str] = field(default_factory=list)


@dataclass
class Session:
    session_id: str
    started_at: datetime = field(default_factory=utc_now)
    ended_at: datetime | None = None
    shown_node_ids: list[str] = field(default_factory=list)
    recent_task_families: list[str] = field(default_factory=list)
    recent_passages: list[str] = field(default_factory=list)
    correct_node_ids: set[str] = field(default_factory=set)
    successful_exact_ids: set[str] = field(default_factory=set)
    ended_reason: str | None = None


@dataclass(frozen=True)
class ReviewQueueItem:
    queue_id: str
    concept_id: str
    node_id: str | None
    due_at: datetime
    priority: int = 0
    relation: RetrievalRelation = RetrievalRelation.EXACT
    reason: str = ""


@dataclass(frozen=True)
class BranchResolution:
    terminal: BranchTerminal
    raw_target: str
    next_node_id: str | None = None
    queue_id: str | None = None
    campaign_id: str | None = None
    evidence_unlocks: tuple[str, ...] = ()
    retrieval_effect: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "terminal": self.terminal.value,
            "raw_target": self.raw_target,
            "next_node_id": self.next_node_id,
            "queue_id": self.queue_id,
            "campaign_id": self.campaign_id,
            "evidence_unlocks": list(self.evidence_unlocks),
            "retrieval_effect": self.retrieval_effect,
        }


@dataclass(frozen=True)
class SchedulerCandidate:
    node_id: str
    task_family: str
    queue: QueueKind
    concept_ids: tuple[str, ...]
    relation: RetrievalRelation = RetrievalRelation.NONE
    source_audited: bool = True
    due_at: datetime | None = None
    passage_keys: tuple[str, ...] = ()
    book_key: str | None = None
    difficulty: float = 0.5
    campaign_continuity: float = 0.0
    prerequisite_ready: bool = True
    weak_signal: float = 0.0
    user_requested: bool = False
    paired_exact_node_id: str | None = None


@dataclass
class PlayerMemory:
    profile_id: str
    campaign_checkpoints: dict[str, str] = field(default_factory=dict)
    node_history: dict[str, TaskState] = field(default_factory=dict)
    passage_exposure: dict[str, int] = field(default_factory=dict)
    concept_mastery: dict[str, MasteryState] = field(default_factory=dict)
    review_queue: list[ReviewQueueItem] = field(default_factory=list)
    evidence_exposure: dict[str, int] = field(default_factory=dict)
    mistakes: dict[str, int] = field(default_factory=dict)
    sessions: list[Session] = field(default_factory=list)
    recent_fatigue: dict[str, int] = field(default_factory=dict)
    session_rollup: dict[str, int] = field(default_factory=dict)


@dataclass(frozen=True)
class TaskDefinition:
    node_id: str
    mission_id: str
    task_type: str
    prompt: str
    source_scope: str
    accepted_answer: Any
    accepted_variants: Any
    required_evidence: tuple[str, ...]
    rejected_answers: Any
    confidence: Confidence
    tx1: bool
    success_feedback: str
    partial_feedback: str
    failure_feedback: str
    hints: Mapping[str, str]
    branches: Mapping[str, str]
    optional_evidence_unlock: Any
    later_retrieval_effect: str
    mastery_domains: tuple[str, ...]
    mastery_mode: str
    grading: Mapping[str, Any] = field(default_factory=dict)
    raw: Mapping[str, Any] = field(default_factory=dict)

    @classmethod
    def from_canonical(cls, node: Mapping[str, Any]) -> "TaskDefinition":
        confidence = Confidence(str(node.get("confidence_code", "T1")))
        tx_flag = str(node.get("textual_variant_flag", "none")).upper() == "TX1"
        evidence = node.get("required_evidence", [])
        if isinstance(evidence, str):
            evidence_items = tuple(p.strip() for p in evidence.split(";") if p.strip())
        elif isinstance(evidence, Sequence):
            evidence_items = tuple(str(x) for x in evidence)
        else:
            evidence_items = ()
        raw_mode = str(node.get("response_mode", "short text"))
        task_type = str(node.get("task_type") or node.get("response_contract") or raw_mode)
        branches = {
            "on_correct": str(node.get("on_correct", "none")),
            "on_partial": str(node.get("on_partial", "return_to_current_node")),
            "on_incorrect": str(node.get("on_incorrect", "return_to_current_node")),
            "on_hint_threshold": str(node.get("on_hint_threshold", "return_to_current_node")),
        }
        return cls(
            node_id=str(node["node_id"]),
            mission_id=str(node["mission_id"]),
            task_type=task_type,
            prompt=str(node.get("player_prompt", "")),
            source_scope=str(node.get("source_scope_visible_to_player", "")),
            accepted_answer=node.get("accepted_answer"),
            accepted_variants=node.get("accepted_variants", []),
            required_evidence=evidence_items,
            rejected_answers=node.get("rejected_answers", []),
            confidence=confidence,
            tx1=tx_flag,
            success_feedback=str(node.get("success_feedback", "")),
            partial_feedback=str(node.get("partial_feedback", "")),
            failure_feedback=str(node.get("failure_feedback", "")),
            hints=dict(node.get("hints") or {}),
            branches=branches,
            optional_evidence_unlock=node.get("optional_evidence_unlock", "none"),
            later_retrieval_effect=str(node.get("later_retrieval_effect", "RETIRED")),
            mastery_domains=tuple(str(x) for x in node.get("mastery_domains", [])),
            mastery_mode=str(node.get("mastery_mode", "independent")),
            grading=dict(node.get("grading") or {}),
            raw=dict(node),
        )


@dataclass
class ReviewQueue:
    items: list[ReviewQueueItem] = field(default_factory=list)

    def add(self, item: ReviewQueueItem) -> None:
        self.items = [existing for existing in self.items if existing.queue_id != item.queue_id]
        self.items.append(item)
        self.items.sort(key=lambda x: (x.due_at, -x.priority, x.queue_id))

    def due(self, now: datetime | None = None) -> list[ReviewQueueItem]:
        now = now or utc_now()
        return [item for item in self.items if item.due_at <= now]

    def remove(self, queue_id: str) -> None:
        self.items = [item for item in self.items if item.queue_id != queue_id]
