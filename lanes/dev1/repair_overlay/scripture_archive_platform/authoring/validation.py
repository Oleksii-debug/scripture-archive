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
        return {
            "valid": False, "valid_for_publish": False,
            "errors": ["Invalid draft schema"], "warnings": [],
            "publish_blockers": ["Invalid draft schema"],
        }
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
    blockers = publish_blockers(draft, task_registry)
    return {
        "valid": not errors,
        "valid_for_publish": not errors and not blockers,
        "errors": errors,
        "warnings": warnings,
        "publish_blockers": blockers,
        "draft_schema": DRAFT_SCHEMA,
        "content_schema": CONTENT_SCHEMA_VERSION,
    }


def publish_blockers(draft: dict[str, Any], task_registry: Any | None = None) -> list[str]:
    if not isinstance(draft, dict) or draft.get("kind", "node") != "node":
        return []
    node = draft.get("node") or {}
    task_type = str(node.get("task_type", "")).upper()
    if not task_type:
        return ["task_type is required"]
    if task_registry is not None and task_type not in task_registry:
        return ["Unknown task_type"]
    return _task_payload_errors(node, task_type, task_registry)


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
    if task_type in task_registry:
        errors.extend(_task_payload_errors(node, task_type, task_registry))
    if not str(node.get("player_prompt", "")).strip():
        errors.append("player_prompt is required")
    if not str(node.get("accepted_answer", "")).strip() and task_type not in {"LONG_TEXT", "COMPOSITE_MULTI_STEP"}:
        warnings.append("accepted_answer is empty; ensure explicit structured answer_contract")


def _task_payload_errors(node: dict[str, Any], task_type: str, task_registry: Any | None) -> list[str]:
    out: list[str] = []
    ui = node.get("ui_metadata")
    contract = node.get("answer_contract")
    if not isinstance(ui, dict):
        return ["ui_metadata must be an object"]
    if not isinstance(contract, dict):
        return ["answer_contract must be an object"]

    if task_registry is None:
        from scripture_archive_platform.domain.registries import AUTHORING_TASK_CONTRACTS
        from scripture_archive_platform.transport.answer_contracts import answer_contract_descriptor
        base = AUTHORING_TASK_CONTRACTS.get(task_type)
        authoring = dict(base) if isinstance(base, dict) else None
        if isinstance(authoring, dict):
            authoring["answer_fields"] = dict(answer_contract_descriptor(task_type)["fields"])
    else:
        definition = task_registry.get(task_type)
        authoring = getattr(definition, "authoring_contract", None)
    if not isinstance(authoring, dict) or not authoring:
        return [f"{task_type} is missing registry authoring_contract"]
    answer_fields = authoring.get("answer_fields")
    if not isinstance(answer_fields, dict) or not answer_fields:
        out.append(f"{task_type} authoring_contract is missing ANSWER_DTO fields")

    collection = authoring.get("collection")
    min_items = int(authoring.get("min_items") or 0)
    item_kind = authoring.get("item_kind")
    if collection is None:
        if authoring.get("mode") != "intrinsic":
            out.append(f"{task_type} authoring_contract has invalid intrinsic mode")
        return out

    values = ui.get(collection)
    if not isinstance(values, list):
        out.append(f"{task_type} requires {collection} as a list")
        return out
    if len(values) < min_items:
        suffix = "item" if min_items == 1 else "items"
        out.append(f"{task_type} requires at least {min_items} {collection} {suffix}")
        return out

    if item_kind == "option":
        _validate_options(task_type, collection, values, out)
    elif item_kind == "matching_pair":
        _validate_matching_pairs(values, out)
    elif item_kind == "composite_step":
        _validate_composite_steps(values, authoring, out)
    else:
        out.append(f"{task_type} authoring_contract has unknown item_kind {item_kind!r}")

    _validate_answer_references(task_type, values, contract, collection, out)
    return out


def _validate_options(task_type: str, collection: str, values: list[Any], errors: list[str]) -> None:
    ids: list[str] = []
    for index, item in enumerate(values):
        if not isinstance(item, dict):
            errors.append(f"{task_type} {collection}[{index}] must be an object")
            continue
        item_id = str(item.get("id", "")).strip()
        label = str(item.get("label", "")).strip()
        if not item_id or not label:
            errors.append(f"{task_type} {collection}[{index}] requires non-empty id and label")
        ids.append(item_id)
    if any(not value for value in ids) or len(ids) != len(set(ids)):
        errors.append(f"{task_type} {collection} IDs must be non-empty and unique")


def _validate_matching_pairs(values: list[Any], errors: list[str]) -> None:
    left_ids: list[str] = []
    right_ids: list[str] = []
    for index, item in enumerate(values):
        if not isinstance(item, dict):
            errors.append(f"MATCHING pairs[{index}] must be an object")
            continue
        left = str(item.get("left", item.get("passage", ""))).strip()
        right = str(item.get("right", item.get("claim", ""))).strip()
        if not left or not right:
            errors.append(
                f"MATCHING pairs[{index}] requires non-empty left/right "
                "(or passage/claim) values"
            )
        left_ids.append(left)
        right_ids.append(right)
    if any(not value for value in left_ids) or len(left_ids) != len(set(left_ids)):
        errors.append("MATCHING left-side IDs must be non-empty and unique")
    if any(not value for value in right_ids) or len(right_ids) != len(set(right_ids)):
        errors.append("MATCHING right-side choices must be non-empty and unique")


def _validate_composite_steps(values: list[Any], authoring: dict[str, Any],
                              errors: list[str]) -> None:
    allowed = set(map(str, authoring.get("step_answer_task_types") or []))
    step_ids: list[str] = []
    for index, item in enumerate(values):
        if not isinstance(item, dict):
            errors.append(f"COMPOSITE_MULTI_STEP steps[{index}] must be an object")
            continue
        step_id = str(item.get("step_id", "")).strip()
        prompt = str(item.get("prompt", "")).strip()
        answer_contract = item.get("answer_contract")
        if not step_id:
            errors.append(f"COMPOSITE_MULTI_STEP steps[{index}] requires step_id")
        if not prompt:
            errors.append(f"COMPOSITE_MULTI_STEP steps[{index}] requires an answerable prompt")
        if not isinstance(answer_contract, dict) or not answer_contract:
            errors.append(
                f"COMPOSITE_MULTI_STEP steps[{index}] requires answer_contract"
            )
        elif str(answer_contract.get("task_type", "")).upper() not in allowed:
            errors.append(
                f"COMPOSITE_MULTI_STEP steps[{index}] answer_contract.task_type "
                f"must be one of {sorted(allowed)}"
            )
        step_ids.append(step_id)
    if any(not value for value in step_ids) or len(step_ids) != len(set(step_ids)):
        errors.append("COMPOSITE_MULTI_STEP step IDs must be non-empty and unique")


def _validate_answer_references(task_type: str, values: list[Any],
                                contract: dict[str, Any], collection: str,
                                errors: list[str]) -> None:
    if collection in {"options", "evidence_options"}:
        ids = {
            str(item.get("id", "")).strip()
            for item in values if isinstance(item, dict) and str(item.get("id", "")).strip()
        }
        accepted = contract.get("accepted_choice_ids")
        if accepted is not None:
            if not isinstance(accepted, list):
                errors.append("accepted_choice_ids must be a list")
            elif any(str(value) not in ids for value in accepted):
                errors.append("accepted_choice_ids must reference declared options")
    elif collection == "items":
        ids = [
            str(item.get("id", "")).strip()
            for item in values if isinstance(item, dict)
        ]
        accepted_order = contract.get("accepted_order")
        if accepted_order is not None:
            if not isinstance(accepted_order, list):
                errors.append("accepted_order must be a list")
            elif len(accepted_order) != len(ids) or set(map(str, accepted_order)) != set(ids):
                errors.append("accepted_order must reference exactly the declared ORDERING item IDs")
    elif collection == "pairs":
        accepted_pairs = contract.get("accepted_pairs")
        if accepted_pairs is not None:
            if not isinstance(accepted_pairs, dict):
                errors.append("accepted_pairs must be an object")
            else:
                left_ids = {
                    str(item.get("left", item.get("passage", ""))).strip()
                    for item in values if isinstance(item, dict)
                }
                right_ids = {
                    str(item.get("right", item.get("claim", ""))).strip()
                    for item in values if isinstance(item, dict)
                }
                if set(map(str, accepted_pairs)) != left_ids:
                    errors.append("accepted_pairs must cover every MATCHING left-side ID exactly once")
                if any(str(value) not in right_ids for value in accepted_pairs.values()):
                    errors.append("accepted_pairs values must reference declared MATCHING right-side choices")
