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
        "CITATION_SELECTION": "MULTI_SELECT",
        "FREE_RESPONSE": "SHORT_TEXT",
        "SHORT_FREE_RESPONSE": "SHORT_TEXT",
        "FREE_RESPONSE_+_CITATION": "SHORT_TEXT",
        "FREE_RESPONSE_/_COMPARISON": "LONG_TEXT",
        "WITNESS_COMPARISON": "LONG_TEXT",
    }
    return aliases.get(key, key)


ANSWER_TASK_TYPES = frozenset({
    "SINGLE_CHOICE", "MULTI_SELECT", "SHORT_TEXT", "LONG_TEXT", "COMBOBOX_SELECT",
    "ORDERING", "MATCHING", "EVIDENCE_SELECT", "CLAIM_EVIDENCE", "SPEAKER_RECIPIENT",
    "PARALLEL_WITNESS_COMPARE", "OT_NT_LINK", "COMPOSITE_MULTI_STEP", "ARGUMENT",
})

_LEGACY_LONG_TEXT_MARKERS = (
    "comparison", "synthesis", "witness", "explain", "argument", "defence", "defense",
    "critique", "reconstruction", "editor",
)


def canonical_node_task_type(node: Mapping[str, Any]) -> str:
    """Resolve one authored node without inventing structured ground truth.

    Existing explicit task types and established response-mode aliases remain
    authoritative. Historical response modes that never had an ANSWER_DTO_v1
    name are projected conservatively from their authored truth shape:
    explicit arrow-delimited chronology/ordering strings are ORDERING; other
    strings stay text tasks, with LONG_TEXT used only for already-authored
    long-form markers. Unknown non-string structures remain fail-closed.
    """
    explicit = node.get("task_type")
    if explicit is not None and str(explicit).strip():
        return canonical_task_type(str(explicit))

    response_mode = str(node.get("response_mode") or "").strip()
    task_family = str(node.get("task_family") or "").strip()
    direct = canonical_task_type(response_mode or task_family or "SHORT_TEXT")
    if direct in ANSWER_TASK_TYPES:
        return direct

    accepted = node.get("accepted_answer")
    combined = f"{response_mode} {task_family}".casefold()

    if isinstance(accepted, str):
        arrow_items = [part.strip() for part in accepted.split("→")]
        if (
            len(arrow_items) >= 2
            and all(arrow_items)
            and ("order" in combined or "chronology" in combined)
        ):
            return "ORDERING"
        if any(marker in combined for marker in _LEGACY_LONG_TEXT_MARKERS):
            return "LONG_TEXT"
        return "SHORT_TEXT"

    if isinstance(accepted, Sequence) and not isinstance(accepted, (str, bytes)):
        if "order" in combined or "chronology" in combined:
            return "ORDERING"

    return direct


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

    if ctype in {"SINGLE_CHOICE", "COMBOBOX_SELECT"}:
        allowed = {"choice"}
        result = {"choice": _require_str(dto.get("choice"), "choice")}
    elif ctype == "PARALLEL_WITNESS_COMPARE":
        allowed = {"synthesis", "witnesses"}
        result = {
            "synthesis": _require_str(dto.get("synthesis"), "synthesis"),
            "witnesses": _require_str_list(dto.get("witnesses"), "witnesses"),
        }
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
        "PARALLEL_WITNESS_COMPARE": {"synthesis": "string", "witnesses": "string[]"},
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
