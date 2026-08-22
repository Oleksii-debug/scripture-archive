from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass
from enum import Enum
from typing import Any, Mapping, Sequence

from .answer_contracts import ANSWER_CONTRACT_VERSION, canonical_task_type, validate_answer_dto
from .security import ValidationError

PROVENANCE_CONTRACT_VERSION = "GROUND_TRUTH_PROVENANCE_v1"


class ProvenanceClass(str, Enum):
    AUTHORED_DIRECT_PASS = "AUTHORED_DIRECT_PASS"
    CANONICAL_LOSSLESS_NORMALIZATION_PASS = "CANONICAL_LOSSLESS_NORMALIZATION_PASS"
    LEGACY_EXPLICIT_NORMALIZATION_PASS = "LEGACY_EXPLICIT_NORMALIZATION_PASS"
    ADAPTER_INFERENCE_FAIL = "ADAPTER_INFERENCE_FAIL"
    MISMATCH_FAIL = "MISMATCH_FAIL"
    AMBIGUOUS_FAIL = "AMBIGUOUS_FAIL"


RELEASE_PASS_CLASSES = frozenset({
    ProvenanceClass.AUTHORED_DIRECT_PASS.value,
    ProvenanceClass.CANONICAL_LOSSLESS_NORMALIZATION_PASS.value,
    ProvenanceClass.LEGACY_EXPLICIT_NORMALIZATION_PASS.value,
})
CANONICAL_TASK_TYPES = (
    "SINGLE_CHOICE", "MULTI_SELECT", "SHORT_TEXT", "LONG_TEXT", "COMBOBOX_SELECT",
    "ORDERING", "MATCHING", "EVIDENCE_SELECT", "CLAIM_EVIDENCE", "SPEAKER_RECIPIENT",
    "PARALLEL_WITNESS_COMPARE", "OT_NT_LINK", "COMPOSITE_MULTI_STEP", "ARGUMENT",
)
_PAYLOAD_TRUTH_KEYS = {
    "correct", "correct_evidence", "ordered_items", "pairs", "answer", "answer_index",
    "correct_index", "correct_option", "expected", "expected_answer", "speaker", "recipient",
    "ot_passage", "nt_passage", "relation_category", "confidence", "evidence_id",
}


@dataclass(frozen=True)
class ProvenanceDecision:
    provenance_class: str
    release_pass: bool
    reason: str
    canonical_dto: dict[str, Any] | None
    explicit_representation: str | None = None
    warning: str | None = None


def _type(n: Mapping[str, Any]) -> str:
    return canonical_task_type(str(n.get("task_type") or n.get("response_mode") or n.get("task_family") or "SHORT_TEXT"))


def _nonempty(v: Any) -> bool:
    if v is None: return False
    if isinstance(v, str): return bool(v.strip())
    if isinstance(v, (list, tuple, set, dict)): return bool(v)
    return True


def _norm(v: Any) -> str:
    s = unicodedata.normalize("NFKC", str(v or "")).casefold()
    return " ".join(re.sub(r"[^\w\s]+", " ", s, flags=re.UNICODE).split())


def _seq(v: Any, name: str) -> list[str]:
    if not isinstance(v, Sequence) or isinstance(v, (str, bytes)) or not v:
        raise ValidationError(f"{name} must be a non-empty canonical list")
    out = [str(x).strip() for x in v]
    if any(not x for x in out): raise ValidationError(f"{name} contains an empty value")
    return out


def _required(n: Mapping[str, Any]) -> list[str]:
    v = n.get("required_evidence")
    if isinstance(v, str): return [x.strip() for x in v.split(";") if x.strip()]
    if isinstance(v, Sequence) and not isinstance(v, (str, bytes)):
        return [str(x).strip() for x in v if str(x).strip()]
    return []


def _pairs(v: Any) -> dict[str, str]:
    if isinstance(v, Mapping) and v: return {str(k): str(x) for k, x in v.items()}
    if isinstance(v, Sequence) and not isinstance(v, (str, bytes)) and v:
        out = {}
        for item in v:
            if not isinstance(item, Mapping) or not _nonempty(item.get("left")) or not _nonempty(item.get("right")):
                raise ValidationError("matching pair list requires left/right objects")
            key = str(item["left"])
            if key in out: raise ValidationError("duplicate matching left value")
            out[key] = str(item["right"])
        return out
    raise ValidationError("matching answer must be a mapping or pair list")


def _value_dto(t: str, value: Any, required: Sequence[str] = ()) -> dict[str, Any]:
    t = canonical_task_type(t)
    if t in {"SINGLE_CHOICE", "COMBOBOX_SELECT", "PARALLEL_WITNESS_COMPARE"}:
        if not isinstance(value, str) or not value.strip(): raise ValidationError(f"{t} requires canonical string accepted_answer")
        body = {"choice": value.strip()}
    elif t == "MULTI_SELECT": body = {"choices": _seq(value, "accepted_answer")}
    elif t in {"SHORT_TEXT", "LONG_TEXT", "ARGUMENT"}:
        text = "; ".join(f"{k}: {value[k]}" for k in sorted(value) if str(value[k]).strip()) if isinstance(value, Mapping) else str(value).strip() if isinstance(value, str) else ""
        if not text: raise ValidationError(f"{t} requires canonical text/structured accepted_answer")
        body = {"text": text}
    elif t == "ORDERING": body = {"items": _seq(value, "accepted_answer")}
    elif t == "MATCHING":
        p = _pairs(value); body = {"pairs": [{"left": k, "right": x} for k, x in p.items()]}
    elif t == "EVIDENCE_SELECT":
        a = _seq(value, "accepted_answer") if isinstance(value, Sequence) and not isinstance(value, (str, bytes)) and value else []
        r = [str(x).strip() for x in required if str(x).strip()]
        if a and r and set(a) != set(r): raise ValidationError("accepted evidence conflicts with required_evidence")
        ids = a or r
        if not ids: raise ValidationError("EVIDENCE_SELECT lacks canonical evidence")
        body = {"evidence_ids": ids}
    elif t == "CLAIM_EVIDENCE":
        if not isinstance(value, Mapping): raise ValidationError("CLAIM_EVIDENCE requires canonical object")
        claim = value.get("claim") if _nonempty(value.get("claim")) else value.get("text")
        if not _nonempty(claim): raise ValidationError("CLAIM_EVIDENCE lacks canonical claim")
        ev = value.get("evidence_ids") if value.get("evidence_ids") is not None else value.get("evidence")
        a = _seq(ev, "accepted_answer.evidence") if ev is not None else []
        r = [str(x).strip() for x in required if str(x).strip()]
        if a and r and set(a) != set(r): raise ValidationError("claim evidence conflicts with required_evidence")
        ids = a or r
        if not ids: raise ValidationError("CLAIM_EVIDENCE lacks canonical evidence")
        body = {"claim": str(claim), "evidence_ids": ids}
    elif t == "SPEAKER_RECIPIENT":
        if not isinstance(value, Mapping) or not _nonempty(value.get("speaker")) or not _nonempty(value.get("recipient")):
            raise ValidationError("SPEAKER_RECIPIENT requires canonical speaker+recipient")
        body = {"speaker": str(value["speaker"]), "recipient": str(value["recipient"])}
    elif t == "OT_NT_LINK":
        fields = ("ot_passage", "nt_passage", "relation_category", "confidence", "evidence_id")
        if not isinstance(value, Mapping) or any(not _nonempty(value.get(f)) for f in fields):
            raise ValidationError("OT_NT_LINK requires canonical five-field object")
        body = {f: str(value[f]) for f in fields}
    else: raise ValidationError(f"canonical projection not registered for {t}")
    return validate_answer_dto(t, {"schema": ANSWER_CONTRACT_VERSION, "task_type": t, **body})


def canonical_answer_dto(n: Mapping[str, Any]) -> dict[str, Any]:
    """Lossless CONTENT_NODE_SCHEMA v1.2 ground-truth projection; task_payload is never truth."""
    t, accepted = _type(n), n.get("accepted_answer")
    if t != "COMPOSITE_MULTI_STEP": return _value_dto(t, accepted, _required(n))
    if not isinstance(accepted, Mapping) or not accepted: raise ValidationError("COMPOSITE accepted_answer must be object")
    g = n.get("grading") if isinstance(n.get("grading"), Mapping) else {}
    steps = g.get("steps") if isinstance(g.get("steps"), list) else []
    if not steps: raise ValidationError("COMPOSITE projection is ambiguous without authored grading.steps")
    result, seen = [], set()
    for step in steps:
        if not isinstance(step, Mapping): raise ValidationError("COMPOSITE step must be object")
        sid = str(step.get("id") or step.get("step_id") or "").strip()
        if not sid or sid in seen or sid not in accepted: raise ValidationError(f"invalid/unmatched COMPOSITE step {sid or '<missing>'}")
        seen.add(sid); task = step.get("task") if isinstance(step.get("task"), Mapping) else None
        if task is not None:
            st = canonical_task_type(str(task.get("task_type") or task.get("response_mode") or "")); req = task.get("required_evidence") or []
            req = [x.strip() for x in req.split(";") if x.strip()] if isinstance(req, str) else list(req) if isinstance(req, Sequence) and not isinstance(req, (str, bytes)) else []
        elif step.get("accepted_choice") is not None: st, req = "SINGLE_CHOICE", []
        elif step.get("accepted_text") is not None: st, req = "LONG_TEXT", []
        else: raise ValidationError(f"COMPOSITE step {sid} lacks deterministic task type")
        nested = _value_dto(st, accepted[sid], req)
        result.append({"step_id": sid, "answer": {k: v for k, v in nested.items() if k not in {"schema", "task_type"}}})
    extra = set(map(str, accepted)) - seen
    if extra: raise ValidationError(f"uncontracted COMPOSITE canonical steps: {sorted(extra)}")
    return validate_answer_dto(t, {"schema": ANSWER_CONTRACT_VERSION, "task_type": t, "steps": result})


def _payload_truth(n: Mapping[str, Any]) -> bool:
    p = n.get("task_payload")
    return isinstance(p, Mapping) and any(_nonempty(p.get(k)) for k in _PAYLOAD_TRUTH_KEYS)


def _props_accept(g: Mapping[str, Any], text: str) -> bool:
    props = g.get("accepted_propositions")
    if not isinstance(props, Sequence) or isinstance(props, (str, bytes)) or not props: return False
    req = [x for x in props if isinstance(x, Mapping) and bool(x.get("required", True))]
    if not req: return False
    text = _norm(text)
    return all(any(_norm(a) and _norm(a) in text for a in ((x.get("aliases") or x.get("accepted") or []) if not isinstance((x.get("aliases") or x.get("accepted") or []), str) else [x.get("aliases") or x.get("accepted")])) for x in req)


def _explicit(n: Mapping[str, Any], dto: Mapping[str, Any]) -> tuple[str | None, str | None, str | None]:
    t = _type(n); g = n.get("grading") if isinstance(n.get("grading"), Mapping) else {}
    mismatch = lambda rep, why: (ProvenanceClass.MISMATCH_FAIL.value, rep, why)
    direct = lambda rep: (ProvenanceClass.AUTHORED_DIRECT_PASS.value, rep, "explicit task truth equals canonical ground truth")
    legacy = lambda rep: (ProvenanceClass.LEGACY_EXPLICIT_NORMALIZATION_PASS.value, rep, "explicit documented legacy truth equals canonical ground truth")
    if t in {"SINGLE_CHOICE", "COMBOBOX_SELECT", "PARALLEL_WITNESS_COMPARE"}:
        aliases = g.get("accepted_aliases")
        if aliases is not None:
            aliases = [aliases] if isinstance(aliases, str) else aliases
            canon = {_norm(n.get("accepted_answer"))} | {_norm(x) for x in (n.get("accepted_variants") or [])}
            if not isinstance(aliases, Sequence) or any(_norm(x) not in canon for x in aliases if _nonempty(x)): return mismatch("grading.accepted_aliases", "aliases conflict with canonical accepted_answer/accepted_variants")
        if _nonempty(g.get("accepted_choice")): return direct("grading.accepted_choice") if _norm(g["accepted_choice"]) == _norm(dto["choice"]) else mismatch("grading.accepted_choice", "choice conflict")
        if _nonempty(g.get("accepted_value")): return legacy("grading.accepted_value") if _norm(g["accepted_value"]) == _norm(dto["choice"]) else mismatch("grading.accepted_value", "legacy choice conflict")
    elif t == "MULTI_SELECT" and _nonempty(g.get("accepted_set")):
        v = g["accepted_set"]; return direct("grading.accepted_set") if isinstance(v, Sequence) and not isinstance(v, (str, bytes)) and {_norm(x) for x in v} == {_norm(x) for x in dto["choices"]} else mismatch("grading.accepted_set", "set conflict")
    elif t in {"SHORT_TEXT", "LONG_TEXT", "ARGUMENT"}:
        if _nonempty(g.get("accepted_text")):
            canon = {_norm(dto["text"])} | {_norm(x) for x in (n.get("accepted_variants") or [])}; return direct("grading.accepted_text") if _norm(g["accepted_text"]) in canon else mismatch("grading.accepted_text", "text conflict")
        if _nonempty(g.get("accepted_propositions")): return direct("grading.accepted_propositions") if _props_accept(g, dto["text"]) else mismatch("grading.accepted_propositions", "propositions reject canonical answer")
    elif t == "ORDERING" and _nonempty(g.get("accepted_order")):
        v = g["accepted_order"]; return direct("grading.accepted_order") if isinstance(v, Sequence) and not isinstance(v, (str, bytes)) and [_norm(x) for x in v] == [_norm(x) for x in dto["items"]] else mismatch("grading.accepted_order", "order conflict")
    elif t == "MATCHING" and _nonempty(g.get("accepted_pairs")):
        try: ok = {_norm(k): _norm(v) for k, v in _pairs(g["accepted_pairs"]).items()} == {_norm(k): _norm(v) for k, v in _pairs(dto["pairs"]).items()}
        except ValidationError: ok = False
        return direct("grading.accepted_pairs") if ok else mismatch("grading.accepted_pairs", "pair conflict")
    elif t == "EVIDENCE_SELECT" and _nonempty(g.get("required_evidence_ids")):
        v = g["required_evidence_ids"]; return direct("grading.required_evidence_ids") if isinstance(v, Sequence) and not isinstance(v, (str, bytes)) and {_norm(x) for x in v} == {_norm(x) for x in dto["evidence_ids"]} else mismatch("grading.required_evidence_ids", "evidence conflict")
    elif t == "CLAIM_EVIDENCE":
        claim = _props_accept(g, dto["claim"]) if _nonempty(g.get("accepted_propositions")) else _norm(g.get("accepted_text")) == _norm(dto["claim"]) if _nonempty(g.get("accepted_text")) else False
        ev = g.get("required_evidence_ids"); evidence = isinstance(ev, Sequence) and not isinstance(ev, (str, bytes)) and {_norm(x) for x in ev} == {_norm(x) for x in dto["evidence_ids"]} if _nonempty(ev) else False
        if _nonempty(g.get("accepted_propositions")) and not claim or _nonempty(g.get("accepted_text")) and not claim: return mismatch("grading.claim", "claim conflict")
        if _nonempty(ev) and not evidence: return mismatch("grading.required_evidence_ids", "claim evidence conflict")
        if claim and evidence: return direct("grading.claim+required_evidence_ids")
    elif t == "SPEAKER_RECIPIENT":
        if _nonempty(g.get("speaker")) or _nonempty(g.get("recipient")):
            ok = _nonempty(g.get("speaker")) and _nonempty(g.get("recipient")) and _norm(g["speaker"]) == _norm(dto["speaker"]) and _norm(g["recipient"]) == _norm(dto["recipient"]); return direct("grading.speaker+recipient") if ok else mismatch("grading.speaker+recipient", "speaker/recipient conflict")
        p = g.get("accepted_pairs")
        if isinstance(p, Mapping) and ("speaker" in p or "recipient" in p):
            ok = _norm(p.get("speaker")) == _norm(dto["speaker"]) and _norm(p.get("recipient")) == _norm(dto["recipient"]); return legacy("grading.accepted_pairs[speaker,recipient]") if ok else mismatch("grading.accepted_pairs", "legacy speaker/recipient conflict")
    elif t == "OT_NT_LINK":
        fields = ("ot_passage", "nt_passage", "relation_category", "confidence", "evidence_id")
        for key, fn in (("ot_nt_link", direct), ("accepted_link", legacy)):
            v = g.get(key)
            if isinstance(v, Mapping) and v:
                ok = all(_norm(v.get(f)) == _norm(dto.get(f)) for f in fields); return fn(f"grading.{key}") if ok else mismatch(f"grading.{key}", "OT/NT link conflict")
    elif t == "COMPOSITE_MULTI_STEP":
        accepted = n.get("accepted_answer"); steps = g.get("steps") if isinstance(g.get("steps"), list) else []
        if steps:
            if not isinstance(accepted, Mapping): return mismatch("grading.steps", "canonical composite is not object")
            for step in steps:
                if not isinstance(step, Mapping): return mismatch("grading.steps", "invalid step")
                sid = str(step.get("id") or step.get("step_id") or "").strip()
                if not sid or sid not in accepted: return mismatch("grading.steps", "step lacks canonical counterpart")
                task = step.get("task") if isinstance(step.get("task"), Mapping) else None
                ev = task.get("accepted_answer") if task is not None and "accepted_answer" in task else step.get("accepted_choice") if step.get("accepted_choice") is not None else step.get("accepted_text")
                if ev is not None and _norm(json.dumps(ev, ensure_ascii=False, sort_keys=True)) != _norm(json.dumps(accepted[sid], ensure_ascii=False, sort_keys=True)): return mismatch("grading.steps", f"step {sid} conflict")
            return direct("grading.steps")
    return None, None, None


def classify_provenance(n: Mapping[str, Any]) -> ProvenanceDecision:
    t = _type(n)
    if t not in CANONICAL_TASK_TYPES: return ProvenanceDecision(ProvenanceClass.AMBIGUOUS_FAIL.value, False, f"unsupported task type {t}", None)
    try: dto = canonical_answer_dto(n)
    except Exception as exc:
        c = ProvenanceClass.ADAPTER_INFERENCE_FAIL if _payload_truth(n) else ProvenanceClass.AMBIGUOUS_FAIL
        return ProvenanceDecision(c.value, False, f"canonical projection unavailable: {type(exc).__name__}: {exc}", None, warning="task_payload is presentation data, not ground truth" if c is ProvenanceClass.ADAPTER_INFERENCE_FAIL else None)
    pc, rep, reason = _explicit(n, dto)
    if pc: return ProvenanceDecision(pc, pc in RELEASE_PASS_CLASSES, reason or "", dto, rep, "legacy explicit representation" if pc == ProvenanceClass.LEGACY_EXPLICIT_NORMALIZATION_PASS.value else None)
    return ProvenanceDecision(ProvenanceClass.CANONICAL_LOSSLESS_NORMALIZATION_PASS.value, True, "deterministic mechanical projection of CONTENT_NODE_SCHEMA v1.2 canonical ground truth", dto, "accepted_answer/accepted_variants/required_evidence")


def provenance_contract_descriptor() -> dict[str, Any]:
    return {
        "schema": PROVENANCE_CONTRACT_VERSION,
        "canonical_ground_truth_fields": ["accepted_answer", "accepted_variants", "required_evidence"],
        "release_pass_classes": sorted(RELEASE_PASS_CLASSES),
        "failure_classes": [ProvenanceClass.ADAPTER_INFERENCE_FAIL.value, ProvenanceClass.MISMATCH_FAIL.value, ProvenanceClass.AMBIGUOUS_FAIL.value],
        "presentation_fields_never_truth": ["task_payload.correct", "task_payload.correct_evidence", "task_payload.ordered_items", "task_payload.pairs", "option position/order", "UI labels"],
        "task_types": {t: "canonical accepted_answer/required_evidence -> ANSWER_DTO_v1; explicit grading must be equivalent" for t in CANONICAL_TASK_TYPES},
        "invariant": "canonical and explicit task-specific truth must be equivalent or MISMATCH_FAIL",
        "fail_closed": "ambiguous projection or presentation-field inference never passes release",
    }
