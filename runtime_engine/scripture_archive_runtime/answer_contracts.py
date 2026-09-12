from __future__ import annotations

from typing import Any, Mapping, Sequence

from .security import ValidationError

ANSWER_CONTRACT_VERSION = "ANSWER_DTO_v1"


def canonical_task_type(value: str) -> str:
    key = "_".join(str(value).replace("-", "_").replace(" ", "_").upper().split("_"))
    aliases = {
        "COMBOBOX": "COMBOBOX_SELECT",
        "SELECT": "COMBOBOX_SELECT",
        "RADIO": "SINGLE_CHOICE",
        "CHECKBOXES": "MULTI_SELECT",
        "CLAIM/EVIDENCE": "CLAIM_EVIDENCE",
        "COURT": "CLAIM_EVIDENCE",
        "COMPOSITE": "COMPOSITE_MULTI_STEP",
        "COMPOSITE_MULTI-STEP": "COMPOSITE_MULTI_STEP",
        # Historical canonical response/task-family aliases retained by LN/PA.
        # They map to the same public ANSWER_DTO_v1 shape as their established grader.
        "CLASSIFICATION": "SINGLE_CHOICE",
        "CLASSIFICATION_+_EXPLANATION": "SINGLE_CHOICE",
        "CITATION_SELECTION": "MULTI_SELECT",
        "CITATION_+_PARAPHRASE": "SHORT_TEXT",
        "FREE_RESPONSE": "SHORT_TEXT",
        "SHORT_FREE_RESPONSE": "SHORT_TEXT",
        "STRUCTURED_FREE_RESPONSE": "SHORT_TEXT",
        "FREE_RESPONSE_+_CITATION": "SHORT_TEXT",
        "FREE_RESPONSE_/_COMPARISON": "LONG_TEXT",
        "COMPARISON_+_EXPLANATION": "LONG_TEXT",
        "WITNESS_COMPARISON": "LONG_TEXT",
    }
    return aliases.get(key, key)


def _require_str(value: Any, name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValidationError(f"{name} must be a non-empty string")
    return value.strip()


def _require_str_list(value: Any, name: str) -> list[str]:
    if not isinstance(value, list) or not value:
        raise ValidationError(f"{name} must be a non-empty list")
    return [_require_str(item, name) for item in value]


def _pairs_to_mapping(value: Any) -> dict[str, str]:
    if isinstance(value, Mapping):
        if not value:
            raise ValidationError("pairs must not be empty")
        return {_require_str(k, "pair.left"): _require_str(v, "pair.right") for k, v in value.items()}
    if isinstance(value, list) and value:
        out: dict[str, str] = {}
        for item in value:
            if not isinstance(item, Mapping):
                raise ValidationError("pairs entries must be objects")
            left = _require_str(item.get("left"), "pair.left")
            right = _require_str(item.get("right"), "pair.right")
            if left in out:
                raise ValidationError("duplicate pair.left")
            out[left] = right
        return out
    raise ValidationError("pairs must be an object or non-empty list")


def validate_answer_dto(task_type: str, value: Any) -> dict[str, Any]:
    """Validate and normalize the public JSON-safe submission contract for one task type."""
    if not isinstance(value, Mapping):
        raise ValidationError("answer must use ANSWER_DTO_v1 object form")
    dto = dict(value)
    version = dto.pop("schema", ANSWER_CONTRACT_VERSION)
    if version != ANSWER_CONTRACT_VERSION:
        raise ValidationError("unsupported answer DTO schema")
    declared = dto.pop("task_type", None)
    ctype = canonical_task_type(task_type)
    if declared is not None and canonical_task_type(str(declared)) != ctype:
        raise ValidationError("answer DTO task_type mismatch")

    if ctype in {"SINGLE_CHOICE", "COMBOBOX_SELECT", "PARALLEL_WITNESS_COMPARE"}:
        allowed = {"choice"}
        result = {"choice": _require_str(dto.get("choice"), "choice")}
    elif ctype == "MULTI_SELECT":
        allowed = {"choices"}
        result = {"choices": _require_str_list(dto.get("choices"), "choices")}
    elif ctype in {"SHORT_TEXT", "LONG_TEXT", "ARGUMENT"}:
        allowed = {"text"}
        result = {"text": _require_str(dto.get("text"), "text")}
    elif ctype == "ORDERING":
        allowed = {"items"}
        result = {"items": _require_str_list(dto.get("items"), "items")}
    elif ctype == "MATCHING":
        allowed = {"pairs"}
        pairs = _pairs_to_mapping(dto.get("pairs"))
        result = {"pairs": [{"left": k, "right": v} for k, v in pairs.items()]}
    elif ctype == "EVIDENCE_SELECT":
        allowed = {"evidence_ids"}
        result = {"evidence_ids": _require_str_list(dto.get("evidence_ids"), "evidence_ids")}
    elif ctype == "CLAIM_EVIDENCE":
        allowed = {"claim", "evidence_ids"}
        result = {
            "claim": _require_str(dto.get("claim"), "claim"),
            "evidence_ids": _require_str_list(dto.get("evidence_ids"), "evidence_ids"),
        }
    elif ctype == "SPEAKER_RECIPIENT":
        allowed = {"speaker", "recipient"}
        result = {
            "speaker": _require_str(dto.get("speaker"), "speaker"),
            "recipient": _require_str(dto.get("recipient"), "recipient"),
        }
    elif ctype == "OT_NT_LINK":
        allowed = {"ot_passage", "nt_passage", "relation_category", "confidence", "evidence_id"}
        result = {name: _require_str(dto.get(name), name) for name in allowed}
    elif ctype == "COMPOSITE_MULTI_STEP":
        allowed = {"steps"}
        steps = dto.get("steps")
        if not isinstance(steps, list) or not steps:
            raise ValidationError("steps must be a non-empty list")
        seen: set[str] = set()
        normalized_steps: list[dict[str, Any]] = []
        for step in steps:
            if not isinstance(step, Mapping) or set(step) - {"step_id", "answer"}:
                raise ValidationError("invalid composite step")
            sid = _require_str(step.get("step_id"), "step_id")
            if sid in seen:
                raise ValidationError("duplicate step_id")
            seen.add(sid)
            answer = step.get("answer")
            if not isinstance(answer, Mapping):
                raise ValidationError("composite step answer must be object")
            normalized_steps.append({"step_id": sid, "answer": dict(answer)})
        result = {"steps": normalized_steps}
    else:
        raise ValidationError(f"No answer DTO schema registered for task type {ctype}")

    if set(dto) - allowed:
        raise ValidationError(f"Unknown answer DTO fields for {ctype}: {sorted(set(dto)-allowed)}")
    return {"schema": ANSWER_CONTRACT_VERSION, "task_type": ctype, **result}


def answer_contract_descriptor(task_type: str) -> dict[str, Any]:
    ctype = canonical_task_type(task_type)
    fields = {
        "SINGLE_CHOICE": {"choice": "string"},
        "COMBOBOX_SELECT": {"choice": "string"},
        "PARALLEL_WITNESS_COMPARE": {"choice": "string"},
        "MULTI_SELECT": {"choices": "string[]"},
        "SHORT_TEXT": {"text": "string"},
        "LONG_TEXT": {"text": "string"},
        "ARGUMENT": {"text": "string"},
        "ORDERING": {"items": "string[]"},
        "MATCHING": {"pairs": "{left:string,right:string}[]"},
        "EVIDENCE_SELECT": {"evidence_ids": "string[]"},
        "CLAIM_EVIDENCE": {"claim": "string", "evidence_ids": "string[]"},
        "SPEAKER_RECIPIENT": {"speaker": "string", "recipient": "string"},
        "OT_NT_LINK": {"ot_passage": "string", "nt_passage": "string", "relation_category": "string", "confidence": "T1|T2|C1|I1|D1", "evidence_id": "string"},
        "COMPOSITE_MULTI_STEP": {"steps": "{step_id:string,answer:object}[]"},
    }
    if ctype not in fields:
        raise ValidationError(f"No answer contract descriptor for {ctype}")
    return {"schema": ANSWER_CONTRACT_VERSION, "task_type": ctype, "fields": fields[ctype]}
