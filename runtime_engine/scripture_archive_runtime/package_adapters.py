from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any, Iterable, Iterator, Mapping, Sequence

from .answer_contracts import ANSWER_CONTRACT_VERSION, canonical_task_type, validate_answer_dto
from .security import ValidationError, validate_content_import
from .provenance import canonical_answer_dto

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
                if isinstance(node, Mapping):
                    yield node
                else:
                    raise ValidationError("nodes array contains non-object")
            return
        if isinstance(payload.get("missions"), list):
            for mission in payload["missions"]:
                if not isinstance(mission, Mapping):
                    raise ValidationError("missions array contains non-object")
                yield from iter_nodes_from_payload(mission)
            return
        for key in ("campaigns", "parts", "packages", "content"):
            child = payload.get(key)
            if isinstance(child, list):
                for item in child:
                    yield from iter_nodes_from_payload(item)
                return
        raise ValidationError("Content payload has no recognized nodes or missions container")
    if isinstance(payload, list):
        for item in payload:
            if not isinstance(item, Mapping):
                raise ValidationError("node list contains non-object")
            if "node_id" in item:
                yield item
            else:
                yield from iter_nodes_from_payload(item)
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


def normalize_legacy_multiselect_truth(node: Mapping[str, Any]) -> dict[str, Any]:
    """Losslessly project the explicit historical citation-selection serialization.

    Some source-audited CONTENT_NODE_SCHEMA_v1.2 nodes predate ANSWER_DTO_v1 and
    store a citation-selection set as one semicolon-delimited accepted_answer
    string.  The authored separators already define the members; splitting them
    requires no semantic inference.  No other MULTI_SELECT string form is
    accepted here, so strict provenance remains fail-closed for ambiguous truth.
    """
    adapted = deepcopy(dict(node))
    if _task_type(adapted) != "MULTI_SELECT" or not isinstance(adapted.get("accepted_answer"), str):
        return adapted
    mode = " ".join(str(adapted.get("response_mode") or "").strip().casefold().split())
    raw = str(adapted["accepted_answer"])
    choices = _listify(raw)
    if mode != "citation selection" or ";" not in raw or len(choices) < 2:
        raise ValidationError(
            "Legacy MULTI_SELECT string truth is permitted only for explicit semicolon-delimited citation selection"
        )
    adapted["accepted_answer"] = choices
    return adapted


def derive_answer_dto(node: Mapping[str, Any]) -> dict[str, Any]:
    """Project canonical CONTENT_NODE_SCHEMA v1.2 ground truth into ANSWER_DTO_v1.

    Presentation fields such as task_payload.correct are deliberately excluded.
    If canonical truth is missing or ambiguous this function fails closed.
    """
    return canonical_answer_dto(node)


def adapt_node_for_runtime(node: Mapping[str, Any], *, lane: str = "unknown") -> dict[str, Any]:
    """Transitional adapter: preserves authored fields and adds explicit runtime contract metadata."""
    adapted = normalize_legacy_multiselect_truth(node)
    ctype = _task_type(adapted)
    adapted["task_type"] = ctype
    adapted["answer_contract_version"] = ANSWER_CONTRACT_VERSION
    adapted["answer_dto"] = derive_answer_dto(adapted)
    adapted["runtime_adapter"] = {
        "lane": lane,
        "derived": True,
        "provenance_contract": "GROUND_TRUTH_PROVENANCE_v1",
        "canonical_truth_fields": ["accepted_answer", "accepted_variants", "required_evidence"],
        "presentation_fields": ["task_contract", "task_payload"],
        "truth_inference_from_presentation": False,
        "legacy_truth_normalization": (
            "explicit_semicolon_citation_selection_v1"
            if isinstance(node.get("accepted_answer"), str)
            and _task_type(node) == "MULTI_SELECT"
            else None
        ),
    }
    grading = dict(adapted.get("grading") or {})
    contract = adapted.get("task_contract") if isinstance(adapted.get("task_contract"), Mapping) else {}
    payload = adapted.get("task_payload") if isinstance(adapted.get("task_payload"), Mapping) else {}
    accepted = adapted.get("accepted_answer")

    if ctype in {"SINGLE_CHOICE", "COMBOBOX_SELECT", "PARALLEL_WITNESS_COMPARE"}:
        grading.setdefault("accepted_choice", adapted["answer_dto"]["choice"])
        grading.setdefault("options", contract.get("options") or payload.get("options") or [])
    elif ctype == "MULTI_SELECT":
        grading.setdefault("accepted_set", adapted["answer_dto"]["choices"])
        grading.setdefault("options", contract.get("options") or payload.get("options") or [])
    elif ctype in {"SHORT_TEXT", "LONG_TEXT", "ARGUMENT"}:
        if isinstance(accepted, Mapping):
            grading.setdefault("accepted_propositions", [
                {"id": str(k), "required": True, "aliases": [str(v)]}
                for k, v in accepted.items() if str(v).strip()
            ])
        else:
            grading.setdefault("accepted_text", str(accepted))
            concrete = _concrete_variants(adapted.get("accepted_variants"))
            if concrete:
                grading.setdefault("accepted_text_aliases", concrete)
    elif ctype == "ORDERING":
        grading.setdefault("accepted_order", adapted["answer_dto"]["items"])
    elif ctype == "MATCHING":
        grading.setdefault("accepted_pairs", {p["left"]: p["right"] for p in adapted["answer_dto"]["pairs"]})
    elif ctype == "EVIDENCE_SELECT":
        grading.setdefault("required_evidence_ids", adapted["answer_dto"]["evidence_ids"])
    elif ctype == "CLAIM_EVIDENCE":
        grading.setdefault("accepted_text", adapted["answer_dto"]["claim"])
        grading.setdefault("required_evidence_ids", adapted["answer_dto"]["evidence_ids"])
    elif ctype == "SPEAKER_RECIPIENT":
        grading.setdefault("speaker", adapted["answer_dto"]["speaker"])
        grading.setdefault("recipient", adapted["answer_dto"]["recipient"])
    elif ctype == "OT_NT_LINK":
        grading.setdefault("ot_nt_link", {k: adapted["answer_dto"][k] for k in ("ot_passage", "nt_passage", "relation_category", "confidence", "evidence_id")})
    elif ctype == "COMPOSITE_MULTI_STEP":
        if not isinstance(grading.get("steps"), list) or not grading["steps"]:
            raise ValidationError("COMPOSITE requires authored grading.steps; heuristic step synthesis is forbidden")
        # Explicit step structure is preserved byte-for-byte as authored.
    adapted["grading"] = grading
    return adapted
