from __future__ import annotations

from pathlib import Path
from typing import Any, Iterable, Mapping

from .models import Confidence, TaskDefinition
from .package_adapters import adapt_node_for_runtime, load_package_nodes
from .security import ValidationError, validate_content_import


class ContentRepository:
    def __init__(self, nodes: Iterable[Mapping[str, Any]] = (), *, adapt_legacy: bool = False, lane: str = "unknown") -> None:
        self._nodes: dict[str, TaskDefinition] = {}
        for node in nodes:
            try:
                adapted = adapt_node_for_runtime(node, lane=lane) if adapt_legacy else node
                self.add(adapted)
            except ValidationError as exc:
                node_id = str(node.get("node_id") or "<unknown>") if isinstance(node, Mapping) else "<non-object>"
                raise ValidationError(f"Canonical node {node_id}: {exc}") from exc

    def add(self, node: Mapping[str, Any]) -> TaskDefinition:
        validate_canonical_node(node)
        task = TaskDefinition.from_canonical(node)
        if task.node_id in self._nodes:
            raise ValidationError(f"Duplicate node_id {task.node_id}")
        self._nodes[task.node_id] = task
        return task

    def get(self, node_id: str) -> TaskDefinition:
        return self._nodes[node_id]

    def all(self) -> dict[str, TaskDefinition]:
        return dict(self._nodes)

    @classmethod
    def from_json_files(cls, paths: Iterable[str | Path], *, adapt_legacy: bool = True, lane: str = "unknown") -> "ContentRepository":
        nodes = load_package_nodes(paths)
        return cls(nodes, adapt_legacy=adapt_legacy, lane=lane)


REQUIRED_NODE_FIELDS = {
    "node_id", "mission_id", "task_family", "difficulty", "required",
    "skill_target", "knowledge_target", "why_this_node_exists",
    "player_prompt", "source_scope_visible_to_player", "response_mode",
    "accepted_answer", "accepted_variants", "required_evidence", "rejected_answers", "rejection_reason",
    "confidence_code", "textual_variant_flag", "success_feedback", "partial_feedback", "failure_feedback",
    "hints", "on_hint_threshold", "on_correct", "on_partial", "on_incorrect", "optional_evidence_unlock",
    "later_retrieval_effect", "mastery_domains", "evidence_strength", "mastery_mode", "spaced_retrieval",
    "review_queue_rule", "functional_nonvisual_equivalent",
}


def validate_canonical_node(node: Mapping[str, Any]) -> None:
    if not isinstance(node, Mapping):
        raise ValidationError("Node must be object")
    validate_content_import(node)
    missing = sorted(REQUIRED_NODE_FIELDS - set(node))
    if missing:
        raise ValidationError(f"Missing canonical fields: {', '.join(missing)}")
    try:
        Confidence(str(node["confidence_code"]))
    except ValueError as exc:
        raise ValidationError("Invalid confidence_code") from exc
    tx = str(node["textual_variant_flag"])
    if tx not in {"none", "TX1"}:
        raise ValidationError("textual_variant_flag must be none or TX1")
    if not str(node["node_id"]).startswith(str(node["mission_id"]).replace("-", "")):
        raise ValidationError("node_id is not stable/consistent with mission_id")
    if not str(node["functional_nonvisual_equivalent"]).strip():
        raise ValidationError("functional_nonvisual_equivalent is required")
