from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any

TRANSPORT_API_VERSION = "scripture.transport.v1"
CONTENT_SCHEMA_VERSION = "CONTENT_NODE_SCHEMA_v1.2"
ANSWER_DTO_VERSION = "ANSWER_DTO_v1"

BUILTIN_TASK_TYPES = (
    "SINGLE_CHOICE", "MULTI_SELECT", "SHORT_TEXT", "LONG_TEXT", "ARGUMENT",
    "COMBOBOX_SELECT", "ORDERING", "MATCHING", "EVIDENCE_SELECT", "CLAIM_EVIDENCE",
    "COMPOSITE_MULTI_STEP", "SPEAKER_RECIPIENT", "PARALLEL_WITNESS_COMPARE", "OT_NT_LINK",
)

@dataclass(frozen=True)
class TaskTypeDefinition:
    task_type: str; renderer_id: str; grader_id: str; editor_id: str; response_shape: str; nonvisual_contract: str

@dataclass(frozen=True)
class ActionDefinition:
    action_id: str; description: str; context: str; default_binding: str | None; allowed_contexts: tuple[str, ...]; conflict_policy: str = "reject_same_context"

@dataclass
class GradeResult:
    status: str; score: float | None; feedback: str; evidence: list[str] = field(default_factory=list); confidence_code: str | None = None; textual_variant_flag: str | None = None; needs_human_or_dev5_grader: bool = False
    def as_dict(self) -> dict[str, Any]:
        return {"status":self.status,"score":self.score,"feedback":self.feedback,"evidence":self.evidence,"confidence_code":self.confidence_code,"textual_variant_flag":self.textual_variant_flag,"needs_human_or_dev5_grader":self.needs_human_or_dev5_grader}
