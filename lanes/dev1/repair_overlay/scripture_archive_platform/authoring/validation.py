from __future__ import annotations

import re
import unicodedata
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


def _runtime_identifier_key(value: Any) -> str:
    """Mirror runtime grading.normalize_text for answer-bearing identity checks.

    Runtime choice/order/matching/evidence graders compare normalized identifiers,
    so authoring must reject two visible identities that collapse to one runtime key.
    Keeping the normalization here explicit avoids a platform->runtime import cycle.
    """
    text = unicodedata.normalize("NFKC", str(value or "")).casefold()
    text = re.sub(r"[^\w\s]+", " ", text, flags=re.UNICODE)
    return " ".join(text.split())


def _runtime_unique(values: list[str]) -> bool:
    keys = [_runtime_identifier_key(value) for value in values]
    return bool(keys) and all(keys) and len(keys) == len(set(keys))


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
        warnings.append("accepted_answer is empty; ensure explicit structured grading truth")


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
    if not str(authoring.get("grader_truth", "")).strip():
        out.append(f"{task_type} authoring_contract is missing runtime grader truth strategy")

    collection = authoring.get("collection")
    min_items = int(authoring.get("min_items") or 0)
    item_kind = authoring.get("item_kind")
    values: list[Any] = []
    if collection is None:
        if authoring.get("mode") != "intrinsic":
            out.append(f"{task_type} authoring_contract has invalid intrinsic mode")
    else:
        raw_values = ui.get(collection)
        if not isinstance(raw_values, list):
            out.append(f"{task_type} requires {collection} as a list")
            return out
        values = raw_values
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

    _validate_runtime_grader_truth(node, task_type, authoring, values, collection, out)
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
    elif not _runtime_unique(ids):
        errors.append(
            f"{task_type} {collection} IDs must remain unique after runtime grader normalization"
        )


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
    elif not _runtime_unique(left_ids):
        errors.append("MATCHING left-side IDs must remain unique after runtime grader normalization")
    if any(not value for value in right_ids) or len(right_ids) != len(set(right_ids)):
        errors.append("MATCHING right-side choices must be non-empty and unique")
    elif not _runtime_unique(right_ids):
        errors.append("MATCHING right-side choices must remain unique after runtime grader normalization")


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


def _string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [part.strip() for part in value.split(";") if part.strip()]
    return []


def _declared_ids(values: list[Any], key: str = "id") -> list[str]:
    return [
        str(item.get(key, "")).strip()
        for item in values if isinstance(item, dict) and str(item.get(key, "")).strip()
    ]


def _has_text_truth(node: dict[str, Any], grading: dict[str, Any]) -> bool:
    propositions = grading.get("accepted_propositions")
    if propositions:
        if not isinstance(propositions, list):
            return False
        required = [
            item for item in propositions
            if isinstance(item, dict) and bool(item.get("required", True))
        ]
        if not required:
            return False
        for item in required:
            aliases = item.get("aliases") or item.get("accepted") or []
            if not _string_list(aliases):
                return False
        return True
    accepted_text = grading.get("accepted_text")
    if accepted_text is not None:
        return bool(str(accepted_text).strip())
    return bool(str(node.get("accepted_answer", "")).strip())


def _validate_runtime_grader_truth(
    node: dict[str, Any],
    task_type: str,
    authoring: dict[str, Any],
    values: list[Any],
    collection: str | None,
    errors: list[str],
) -> None:
    raw_grading = node.get("grading")
    if raw_grading is not None and not isinstance(raw_grading, dict):
        errors.append("grading must be an object")
        return
    grading = raw_grading or {}
    strategy = str(authoring.get("grader_truth", "")).strip()
    if not strategy:
        return

    if strategy == "choice":
        ids = set(_declared_ids(values))
        accepted = grading.get("accepted_choice", node.get("accepted_answer"))
        candidates = [str(accepted).strip()] if str(accepted or "").strip() else []
        candidates.extend(_string_list(grading.get("accepted_choice_aliases") or node.get("accepted_variants")))
        if not ids.intersection(candidates):
            errors.append(f"{task_type} runtime grading truth must reference a declared option ID")
        return

    if strategy == "multi_select":
        ids = set(_declared_ids(values))
        expected = grading.get("accepted_set") if "accepted_set" in grading else node.get("accepted_answer")
        accepted = set(_string_list(expected))
        if not accepted or not accepted.issubset(ids):
            errors.append("MULTI_SELECT runtime accepted set must be non-empty and reference declared option IDs")
        return

    if strategy == "text":
        if not _has_text_truth(node, grading):
            errors.append(f"{task_type} requires explicit runtime text grading truth")
        return

    if strategy == "ordering":
        ids = _declared_ids(values)
        expected = grading.get("accepted_order") if "accepted_order" in grading else node.get("accepted_answer")
        accepted = _string_list(expected)
        if len(accepted) != len(ids) or set(accepted) != set(ids):
            errors.append("ORDERING runtime accepted order must reference exactly the declared item IDs")
        return

    if strategy == "matching":
        left_ids = {
            str(item.get("left", item.get("passage", ""))).strip()
            for item in values if isinstance(item, dict)
        }
        right_ids = {
            str(item.get("right", item.get("claim", ""))).strip()
            for item in values if isinstance(item, dict)
        }
        expected = grading.get("accepted_pairs") if "accepted_pairs" in grading else node.get("accepted_answer")
        if not isinstance(expected, dict) or not expected:
            errors.append("MATCHING requires runtime grading.accepted_pairs (or mapping accepted_answer)")
        else:
            if set(map(str, expected)) != left_ids:
                errors.append("MATCHING runtime accepted_pairs must cover every declared left-side ID exactly once")
            if any(str(value) not in right_ids for value in expected.values()):
                errors.append("MATCHING runtime accepted_pairs values must reference declared right-side choices")
        return

    if strategy == "evidence":
        ids = set(_declared_ids(values))
        expected = grading.get("required_evidence_ids") if "required_evidence_ids" in grading else node.get("required_evidence")
        accepted = set(_string_list(expected))
        if not accepted or not accepted.issubset(ids):
            errors.append(f"{task_type} runtime required evidence IDs must reference declared evidence options")
        return

    if strategy == "claim_evidence":
        if not _has_text_truth(node, grading):
            errors.append("CLAIM_EVIDENCE requires explicit runtime claim grading truth")
        ids = set(_declared_ids(values))
        expected = grading.get("required_evidence_ids") if "required_evidence_ids" in grading else node.get("required_evidence")
        accepted = set(_string_list(expected))
        if not accepted or not accepted.issubset(ids):
            errors.append("CLAIM_EVIDENCE runtime required evidence IDs must reference declared evidence options")
        return

    if strategy == "speaker_recipient":
        accepted_answer = node.get("accepted_answer")
        fallback = accepted_answer if isinstance(accepted_answer, dict) else {}
        speaker = grading.get("speaker") or fallback.get("speaker")
        recipient = grading.get("recipient") or fallback.get("recipient")
        if not str(speaker or "").strip() or not str(recipient or "").strip():
            errors.append("SPEAKER_RECIPIENT requires runtime speaker and recipient grading truth")
        return

    if strategy == "ot_nt_link":
        link = grading.get("ot_nt_link")
        fields = ("ot_passage", "nt_passage", "relation_category", "confidence", "evidence_id")
        if not isinstance(link, dict) or any(not str(link.get(field, "")).strip() for field in fields):
            errors.append("OT_NT_LINK requires complete runtime grading.ot_nt_link truth")
            return
        relation_ids = set(_declared_ids(values))
        if str(link.get("relation_category")) not in relation_ids:
            errors.append("OT_NT_LINK runtime relation_category must reference a declared relation type")
        if str(link.get("confidence")) not in CONFIDENCE_CODES:
            errors.append("OT_NT_LINK runtime confidence must be T1/T2/C1/I1/D1")
        return

    if strategy == "composite":
        grade_steps = grading.get("steps")
        if not isinstance(grade_steps, list) or not grade_steps:
            errors.append("COMPOSITE_MULTI_STEP requires runtime grading.steps")
            return
        by_id: dict[str, dict[str, Any]] = {}
        for index, step in enumerate(grade_steps):
            if not isinstance(step, dict):
                errors.append(f"COMPOSITE_MULTI_STEP grading.steps[{index}] must be an object")
                continue
            sid = str(step.get("id") or step.get("step_id") or "").strip()
            if not sid or sid in by_id:
                errors.append("COMPOSITE_MULTI_STEP runtime grading step IDs must be non-empty and unique")
                continue
            by_id[sid] = step
        ui_ids = {
            str(step.get("step_id", "")).strip()
            for step in values if isinstance(step, dict)
        }
        if set(by_id) != ui_ids:
            errors.append("COMPOSITE_MULTI_STEP runtime grading.steps must cover every authored step exactly once")
            return
        allowed = set(map(str, authoring.get("step_answer_task_types") or []))
        for ui_step in values:
            if not isinstance(ui_step, dict):
                continue
            sid = str(ui_step.get("step_id", "")).strip()
            grade_step = by_id.get(sid)
            if not grade_step:
                continue
            ui_contract = ui_step.get("answer_contract") or {}
            ui_type = str(ui_contract.get("task_type", "")).upper()
            nested = grade_step.get("task")
            if isinstance(nested, dict):
                nested_type = nested.get("task_type")
                runtime_type = str(nested_type).upper() if isinstance(nested_type, str) and nested_type.strip() else ""
                if not runtime_type:
                    errors.append(
                        f"COMPOSITE_MULTI_STEP nested runtime task {sid} requires explicit task_type"
                    )
                nested_grading = nested.get("grading") if isinstance(nested.get("grading"), dict) else {}
                runtime_truth = nested_grading.get("accepted_text", nested.get("accepted_answer"))
            else:
                runtime_type = str(grade_step.get("task_type", "LONG_TEXT")).upper()
                runtime_truth = grade_step.get("accepted_text")
            if runtime_type not in allowed or runtime_type != ui_type:
                errors.append(f"COMPOSITE_MULTI_STEP runtime grading task type must match authored step {sid}")
            if not str(runtime_truth or "").strip():
                errors.append(f"COMPOSITE_MULTI_STEP runtime grading step {sid} requires accepted text truth")
        return

    errors.append(f"{task_type} authoring_contract has unknown grader_truth strategy {strategy!r}")
