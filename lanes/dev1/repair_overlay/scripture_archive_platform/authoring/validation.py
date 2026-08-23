from __future__ import annotations

import re
from typing import Any

from .model import (
    CAMPAIGN_REQUIRED, CONFIDENCE_CODES, EVIDENCE_STRENGTH, HINT_KEYS,
    KINDS, MISSION_REQUIRED, NODE_REQUIRED, TX_FLAGS,
)


def identity(kind: str, record: dict[str, Any]) -> str | None:
    key = {"campaign": "campaign_id", "mission": "mission_id", "node": "node_id"}[kind]
    value = record.get(key)
    return str(value) if value else None


def identity_errors(draft: dict[str, Any]) -> list[str]:
    base = draft.get("base_identity")
    if not isinstance(base, dict):
        return []
    kind = draft.get("kind", "node")
    expected = base.get(kind)
    current = identity(kind, draft.get(kind) or {})
    if expected and current and expected != current:
        return [f"Stable {kind} ID cannot change from {expected} to {current}"]
    return []


def validate_draft(draft: Any, task_registry: Any) -> dict[str, Any]:
    from .model import CONTENT_SCHEMA_VERSION, DRAFT_SCHEMA

    if not isinstance(draft, dict) or draft.get("draft_schema") != DRAFT_SCHEMA:
        return {"valid": False, "errors": ["Invalid draft schema"], "warnings": []}
    errors: list[str] = []
    warnings: list[str] = []
    kind = str(draft.get("kind", "node")).lower()
    if kind not in KINDS:
        errors.append("kind must be campaign, mission or node")
    elif kind == "node":
        _validate_node(draft.get("node") or {}, task_registry, errors, warnings)
    elif kind == "campaign":
        _required(draft.get("campaign"), CAMPAIGN_REQUIRED, "campaign", errors)
    else:
        _required(draft.get("mission"), MISSION_REQUIRED, "mission", errors)
    errors.extend(identity_errors(draft))
    return {
        "valid": not errors, "errors": errors, "warnings": warnings,
        "draft_schema": DRAFT_SCHEMA, "content_schema": CONTENT_SCHEMA_VERSION,
    }


def publish_blockers(draft: dict[str, Any]) -> list[str]:
    if draft.get("kind", "node") != "node":
        return []
    node = draft.get("node") or {}
    task_type = str(node.get("task_type", "")).upper()
    ui = node.get("ui_metadata") or {}
    out: list[str] = []
    if task_type in {"SINGLE_CHOICE", "MULTI_SELECT", "COMBOBOX_SELECT", "PARALLEL_WITNESS_COMPARE"} and not ui.get("options"):
        out.append(f"{task_type} requires options")
    if task_type == "ORDERING" and len(ui.get("items") or []) < 2:
        out.append("ORDERING requires at least two items")
    if task_type == "MATCHING" and not ui.get("pairs"):
        out.append("MATCHING requires pairs")
    if task_type in {"EVIDENCE_SELECT", "CLAIM_EVIDENCE"} and not ui.get("evidence_options"):
        out.append(f"{task_type} requires evidence_options")
    if task_type == "COMPOSITE_MULTI_STEP" and not ui.get("steps"):
        out.append("COMPOSITE_MULTI_STEP requires steps")
    return out


def _required(obj: Any, fields: tuple[str, ...], label: str, errors: list[str]) -> None:
    if not isinstance(obj, dict):
        errors.append(f"{label} must be an object")
        return
    for field in fields:
        if field not in obj:
            errors.append(f"Missing required {label} field: {field}")


def _stable_id(value: Any, label: str, errors: list[str]) -> None:
    if value not in (None, "") and not re.fullmatch(r"[A-Z][A-Z0-9-]{2,63}", str(value)):
        errors.append(f"{label} must be a stable uppercase ID")


def _validate_node(node: dict[str, Any], task_registry: Any,
                   errors: list[str], warnings: list[str]) -> None:
    _required(node, NODE_REQUIRED, "node", errors)
    _stable_id(node.get("node_id"), "node_id", errors)
    _stable_id(node.get("mission_id"), "mission_id", errors)
    task_type = str(node.get("task_type", "")).upper()
    if task_type not in task_registry:
        errors.append("Unknown task_type")
    if node.get("confidence_code") not in CONFIDENCE_CODES:
        errors.append("Invalid confidence_code; TX1 is not a confidence code")
    if node.get("textual_variant_flag") not in TX_FLAGS:
        errors.append("Invalid textual_variant_flag; use none or TX1")
    hints = node.get("hints")
    if not isinstance(hints, dict) or any(key not in hints for key in HINT_KEYS):
        errors.append("Hints H1-H7 are required")
    elif any(not str(hints.get(key, "")).strip() for key in HINT_KEYS):
        errors.append("Hints H1-H7 must be explicit and non-empty")
    if not str(node.get("functional_nonvisual_equivalent", "")).strip():
        errors.append("Functional nonvisual equivalent is required")
    for field in (
        "on_correct", "on_partial", "on_incorrect", "on_hint_threshold",
        "optional_evidence_unlock", "later_retrieval_effect",
    ):
        if field in node and (node[field] is None or str(node[field]).strip() == ""):
            errors.append(f"{field} must be explicit")
    strengths = node.get("evidence_strength")
    strengths = [strengths] if isinstance(strengths, str) else strengths
    if not isinstance(strengths, list) or any(x not in EVIDENCE_STRENGTH for x in strengths):
        errors.append("Invalid evidence_strength")
    if node.get("spaced_retrieval") not in {"yes", "no", True, False}:
        errors.append("spaced_retrieval must be yes/no")
    _validate_task_payload(node, task_type, errors, warnings)
    if not str(node.get("player_prompt", "")).strip():
        errors.append("player_prompt is required")
    if not str(node.get("accepted_answer", "")).strip() and task_type not in {"LONG_TEXT", "COMPOSITE_MULTI_STEP"}:
        warnings.append("accepted_answer is empty; ensure explicit structured answer_contract")


def _validate_task_payload(node: dict[str, Any], task_type: str,
                           errors: list[str], warnings: list[str]) -> None:
    ui = node.get("ui_metadata") or {}
    contract = node.get("answer_contract") or {}
    if not isinstance(ui, dict):
        errors.append("ui_metadata must be an object")
        return
    if not isinstance(contract, dict):
        errors.append("answer_contract must be an object")
        return
    if task_type in {"SINGLE_CHOICE", "MULTI_SELECT", "COMBOBOX_SELECT", "PARALLEL_WITNESS_COMPARE"}:
        options = ui.get("options") or []
        ids = [str(x.get("id", "")) for x in options if isinstance(x, dict)]
        if not options:
            warnings.append(f"{task_type} has no options yet")
        if any(not x for x in ids) or len(ids) != len(set(ids)):
            errors.append("choice option IDs must be non-empty and unique")
        if any(str(x) not in ids for x in (contract.get("accepted_choice_ids") or [])):
            errors.append("accepted_choice_ids must reference options")
    elif task_type == "ORDERING":
        items = ui.get("items") or []
        ids = [str(x.get("id", "")) for x in items if isinstance(x, dict)]
        if len(items) < 2:
            warnings.append("ORDERING requires at least two authoring items")
        if any(not x for x in ids) or len(ids) != len(set(ids)):
            errors.append("ORDERING item IDs must be non-empty and unique")
    elif task_type == "MATCHING" and not (ui.get("pairs") or []):
        warnings.append("MATCHING has no authoring pairs yet")
    elif task_type in {"EVIDENCE_SELECT", "CLAIM_EVIDENCE"} and not (ui.get("evidence_options") or []):
        warnings.append(f"{task_type} has no evidence options yet")
    elif task_type == "COMPOSITE_MULTI_STEP" and not (ui.get("steps") or []):
        warnings.append("COMPOSITE_MULTI_STEP has no steps yet")
