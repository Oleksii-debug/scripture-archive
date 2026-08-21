from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any, Iterable, Iterator, Mapping, Sequence

from .answer_contracts import ANSWER_CONTRACT_VERSION, canonical_task_type, validate_answer_dto
from .security import ValidationError, validate_content_import

_GENERIC_VARIANT_MARKERS = ("semantic equivalent", "equivalent wording", "equivalent selection", "translation-neutral")


def _listify(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [part.strip() for part in value.split(";") if part.strip()]
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes)):
        return [str(v) for v in value if str(v).strip()]
    return [str(value)]


def iter_nodes_from_payload(payload: Any) -> Iterator[Mapping[str, Any]]:
    """Accept canonical top-level nodes and lane package mission→nodes shapes."""
    if isinstance(payload, Mapping):
        if isinstance(payload.get("nodes"), list):
            for node in payload["nodes"]:
                if isinstance(node, Mapping): yield node
                else: raise ValidationError("nodes array contains non-object")
            return
        if isinstance(payload.get("missions"), list):
            for mission in payload["missions"]:
                if not isinstance(mission, Mapping): raise ValidationError("missions array contains non-object")
                yield from iter_nodes_from_payload(mission)
            return
        for key in ("campaigns", "parts", "packages", "content"):
            child = payload.get(key)
            if isinstance(child, list):
                for item in child: yield from iter_nodes_from_payload(item)
                return
        raise ValidationError("Content payload has no recognized nodes or missions container")
    if isinstance(payload, list):
        for item in payload:
            if not isinstance(item, Mapping): raise ValidationError("node list contains non-object")
            if "node_id" in item: yield item
            else: yield from iter_nodes_from_payload(item)
        return
    raise ValidationError("Content payload must be object or list")


def load_package_nodes(paths: Iterable[str | Path]) -> list[dict[str, Any]]:
    nodes: list[dict[str, Any]] = []
    for path in paths:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        validate_content_import(data)
        nodes.extend(dict(n) for n in iter_nodes_from_payload(data))
    return nodes


def _join_structured_text(value: Mapping[str, Any]) -> str:
    return "; ".join(f"{key}: {value[key]}" for key in sorted(value) if str(value[key]).strip())


def _concrete_variants(value: Any) -> list[str]:
    variants = _listify(value)
    return [v for v in variants if not any(marker in v.casefold() for marker in _GENERIC_VARIANT_MARKERS)]


def _task_type(node: Mapping[str, Any]) -> str:
    return canonical_task_type(str(node.get("task_type") or node.get("response_mode") or node.get("task_family") or "SHORT_TEXT"))


def derive_answer_dto(node: Mapping[str, Any]) -> dict[str, Any]:
    """Create a submission DTO only from explicit node truth/payload. Never infer new Bible facts."""
    ctype = _task_type(node)
    accepted = node.get("accepted_answer")
    contract = node.get("task_contract") if isinstance(node.get("task_contract"), Mapping) else {}
    payload = node.get("task_payload") if isinstance(node.get("task_payload"), Mapping) else {}
    grading = node.get("grading") if isinstance(node.get("grading"), Mapping) else {}

    if ctype in {"SINGLE_CHOICE", "COMBOBOX_SELECT", "PARALLEL_WITNESS_COMPARE"}:
        correct = grading.get("accepted_choice") or payload.get("correct")
        choice = correct[0] if isinstance(correct, list) and correct else correct or accepted
        if isinstance(choice, str) and ctype != "PARALLEL_WITNESS_COMPARE" and "." in choice and payload.get("correct"):
            choice = payload["correct"][0]
        dto = {"choice": str(choice)}
    elif ctype == "MULTI_SELECT":
        correct = grading.get("accepted_set") or payload.get("correct") or accepted
        dto = {"choices": _listify(correct)}
    elif ctype in {"SHORT_TEXT", "ARGUMENT", "LONG_TEXT"}:
        dto = {"text": _join_structured_text(accepted) if isinstance(accepted, Mapping) else str(accepted)}
    elif ctype == "ORDERING":
        order = grading.get("accepted_order") or payload.get("ordered_items") or accepted
        if isinstance(order, str) and "→" in order: order = [part.strip() for part in order.split("→")]
        dto = {"items": _listify(order)}
    elif ctype == "MATCHING":
        pairs = grading.get("accepted_pairs") or payload.get("pairs") or accepted
        if isinstance(pairs, Mapping): entries = [{"left": str(k), "right": str(v)} for k, v in pairs.items()]
        elif isinstance(pairs, list): entries = [{"left": str(p["left"]), "right": str(p["right"])} for p in pairs if isinstance(p, Mapping)]
        else: raise ValidationError("MATCHING content lacks structured pairs; content repair required")
        dto = {"pairs": entries}
    elif ctype == "EVIDENCE_SELECT":
        ids = grading.get("required_evidence_ids") or payload.get("correct_evidence")
        if not ids and isinstance(accepted, list): ids = accepted
        if not ids: ids = node.get("required_evidence")
        dto = {"evidence_ids": _listify(ids)}
    elif ctype == "CLAIM_EVIDENCE":
        if isinstance(accepted, Mapping):
            claim = accepted.get("claim") or accepted.get("text"); ids = accepted.get("evidence_ids") or accepted.get("evidence_id")
        else: claim, ids = accepted, None
        ids = ids or payload.get("evidence") or node.get("required_evidence")
        dto = {"claim": str(claim), "evidence_ids": _listify(ids)}
    elif ctype == "SPEAKER_RECIPIENT":
        if not isinstance(accepted, Mapping): raise ValidationError("SPEAKER_RECIPIENT accepted_answer must be object")
        dto = {"speaker": str(accepted.get("speaker", "")), "recipient": str(accepted.get("recipient", ""))}
    elif ctype == "OT_NT_LINK":
        source = payload if payload else accepted if isinstance(accepted, Mapping) else {}
        dto = {name: str(source.get(name, "")) for name in ("ot_passage", "nt_passage", "relation_category", "confidence", "evidence_id")}
    elif ctype == "COMPOSITE_MULTI_STEP":
        if isinstance(accepted, Mapping) and "confidence" in accepted and "conclusion" in accepted:
            dto = {"steps": [{"step_id": "confidence", "answer": {"choice": str(accepted["confidence"])}}, {"step_id": "conclusion", "answer": {"text": str(accepted["conclusion"])}}]}
        else:
            dto = {"steps": [{"step_id": "summary", "answer": {"text": str(accepted)}}]}
    else:
        raise ValidationError(f"Cannot derive answer DTO for {ctype}")
    return validate_answer_dto(ctype, {"schema": ANSWER_CONTRACT_VERSION, "task_type": ctype, **dto})


def adapt_node_for_runtime(node: Mapping[str, Any], *, lane: str = "unknown") -> dict[str, Any]:
    """Transitional adapter: preserves authored fields and adds explicit runtime contract metadata."""
    adapted = deepcopy(dict(node)); ctype = _task_type(adapted); adapted["task_type"] = ctype
    adapted["answer_contract_version"] = ANSWER_CONTRACT_VERSION; adapted["answer_dto"] = derive_answer_dto(adapted)
    adapted["runtime_adapter"] = {"lane": lane, "derived": True, "source_fields": ["accepted_answer", "accepted_variants", "required_evidence", "task_contract", "task_payload"]}
    grading = dict(adapted.get("grading") or {}); contract = adapted.get("task_contract") if isinstance(adapted.get("task_contract"), Mapping) else {}; payload = adapted.get("task_payload") if isinstance(adapted.get("task_payload"), Mapping) else {}; accepted = adapted.get("accepted_answer")
    if ctype in {"SINGLE_CHOICE", "COMBOBOX_SELECT", "PARALLEL_WITNESS_COMPARE"}:
        grading.setdefault("accepted_choice", adapted["answer_dto"]["choice"]); grading.setdefault("options", contract.get("options") or payload.get("options") or [])
    elif ctype == "MULTI_SELECT":
        grading.setdefault("accepted_set", adapted["answer_dto"]["choices"]); grading.setdefault("options", contract.get("options") or payload.get("options") or [])
    elif ctype in {"SHORT_TEXT", "LONG_TEXT", "ARGUMENT"}:
        if isinstance(accepted, Mapping):
            grading.setdefault("accepted_propositions", [{"id": str(k), "required": True, "aliases": [str(v)]} for k, v in accepted.items() if str(v).strip()])
        else:
            grading.setdefault("accepted_text", str(accepted)); concrete = _concrete_variants(adapted.get("accepted_variants"))
            if concrete: grading.setdefault("accepted_text_aliases", concrete)
    elif ctype == "ORDERING": grading.setdefault("accepted_order", adapted["answer_dto"]["items"])
    elif ctype == "MATCHING": grading.setdefault("accepted_pairs", {p["left"]: p["right"] for p in adapted["answer_dto"]["pairs"]})
    elif ctype == "EVIDENCE_SELECT": grading.setdefault("required_evidence_ids", adapted["answer_dto"]["evidence_ids"])
    elif ctype == "CLAIM_EVIDENCE": grading.setdefault("accepted_text", adapted["answer_dto"]["claim"]); grading.setdefault("required_evidence_ids", adapted["answer_dto"]["evidence_ids"])
    elif ctype == "SPEAKER_RECIPIENT": grading.setdefault("speaker", adapted["answer_dto"]["speaker"]); grading.setdefault("recipient", adapted["answer_dto"]["recipient"])
    elif ctype == "OT_NT_LINK": grading.setdefault("ot_nt_link", {k: adapted["answer_dto"][k] for k in ("ot_passage", "nt_passage", "relation_category", "confidence", "evidence_id")})
    elif ctype == "COMPOSITE_MULTI_STEP":
        if len(adapted["answer_dto"]["steps"]) == 2 and adapted["answer_dto"]["steps"][0]["step_id"] == "confidence":
            grading.setdefault("steps", [{"id": "confidence", "weight": 0.35, "task_type": "SINGLE_CHOICE", "accepted_choice": adapted["answer_dto"]["steps"][0]["answer"]["choice"]}, {"id": "conclusion", "weight": 0.65, "task_type": "LONG_TEXT", "accepted_text": adapted["answer_dto"]["steps"][1]["answer"]["text"]}])
        else:
            grading.setdefault("steps", [{"id": "summary", "weight": 1.0, "task_type": "LONG_TEXT", "accepted_text": adapted["answer_dto"]["steps"][0]["answer"]["text"]}])
    adapted["grading"] = grading
    return adapted
