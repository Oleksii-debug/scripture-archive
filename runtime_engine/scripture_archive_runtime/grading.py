from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, replace
from typing import Any, Callable, Iterable, Mapping, Sequence

from .answer_contracts import ANSWER_CONTRACT_VERSION, canonical_task_type, validate_answer_dto
from .models import Correctness, GradeResult, TaskDefinition


def normalize_text(value: Any) -> str:
    text = unicodedata.normalize("NFKC", str(value or "")).casefold()
    text = re.sub(r"[^\w\s]+", " ", text, flags=re.UNICODE)
    return " ".join(text.split())


def _listify(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [part.strip() for part in value.split(";") if part.strip()]
    if isinstance(value, Mapping):
        return [str(k) for k in value.keys()]
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes)):
        return [str(x) for x in value]
    return [str(value)]


def _structured_text(value: Any) -> str:
    if isinstance(value, Mapping):
        return "; ".join(f"{k}: {value[k]}" for k in sorted(value) if str(value[k]).strip())
    return str(value or "")


def _feedback(task: TaskDefinition, correctness: Correctness) -> str:
    if correctness is Correctness.CORRECT:
        return task.success_feedback
    if correctness is Correctness.PARTIAL:
        return task.partial_feedback
    return task.failure_feedback


def _result(task: TaskDefinition, correctness: Correctness, score: float, *, accepted: Any = None, evidence: Iterable[str] | None = None, uncertainty: str | None = None, details: Mapping[str, Any] | None = None) -> GradeResult:
    return GradeResult(
        correctness=correctness,
        score=max(0.0, min(1.0, score)),
        confidence=task.confidence,
        tx1=task.tx1,
        source_scope=task.source_scope,
        accepted_proposition=task.accepted_answer if accepted is None else accepted,
        evidence=tuple(evidence if evidence is not None else task.required_evidence),
        uncertainty=uncertainty or ("Textual-variant qualification applies; responsible translation traditions must not be penalized." if task.tx1 else None),
        feedback=_feedback(task, correctness),
        details=dict(details or {}),
    )


def _answer_mapping(answer: Any) -> Mapping[str, Any] | None:
    return answer if isinstance(answer, Mapping) else None


def _choice_value(answer: Any) -> Any:
    if isinstance(answer, Mapping) and "choice" in answer:
        return answer["choice"]
    return answer


def grade_single_choice(task: TaskDefinition, answer: Any) -> GradeResult:
    submitted = normalize_text(_choice_value(answer))
    configured = task.grading.get("accepted_choice")
    accepted_raw = configured if configured is not None else task.accepted_answer
    accepted = {normalize_text(accepted_raw)} | {normalize_text(v) for v in _listify(task.grading.get("accepted_choice_aliases") or task.accepted_variants)}
    correctness = Correctness.CORRECT if submitted and submitted in accepted else Correctness.INCORRECT
    return _result(task, correctness, 1.0 if correctness is Correctness.CORRECT else 0.0, accepted=accepted_raw)


def grade_multi_select(task: TaskDefinition, answer: Any) -> GradeResult:
    raw = answer.get("choices") if isinstance(answer, Mapping) and "choices" in answer else answer
    submitted = {normalize_text(v) for v in _listify(raw)}
    configured = task.grading.get("accepted_set")
    expected_raw = configured if configured is not None else task.accepted_answer
    expected = {normalize_text(v) for v in _listify(expected_raw)}
    if not expected:
        return _result(task, Correctness.INCORRECT, 0.0, details={"validation": "missing accepted set"})
    overlap = len(submitted & expected)
    extras = len(submitted - expected)
    score = max(0.0, (overlap - extras * 0.5) / len(expected))
    correctness = Correctness.CORRECT if submitted == expected else Correctness.PARTIAL if overlap else Correctness.INCORRECT
    return _result(task, correctness, score, accepted=sorted(expected), details={"expected_count": len(expected), "submitted_count": len(submitted)})


def _proposition_score(task: TaskDefinition, answer: Any) -> tuple[Correctness, float, dict[str, Any]]:
    if isinstance(answer, Mapping) and "text" in answer:
        answer = answer["text"]
    text = normalize_text(_structured_text(answer))
    config = task.grading.get("accepted_propositions")
    if config:
        required_hits = required_total = optional_hits = 0
        missed: list[str] = []
        matched: list[str] = []
        for item in config:
            if not isinstance(item, Mapping):
                continue
            pid = str(item.get("id", "proposition"))
            required = bool(item.get("required", True))
            aliases = _listify(item.get("aliases") or item.get("accepted") or [])
            hit = any(normalize_text(alias) in text for alias in aliases if normalize_text(alias))
            if required:
                required_total += 1
                if hit:
                    required_hits += 1
                else:
                    missed.append(pid)
            elif hit:
                optional_hits += 1
            if hit:
                matched.append(pid)
        if required_total == 0:
            return Correctness.INCORRECT, 0.0, {"mode": "proposition-groups", "validation": "no required propositions"}
        score = required_hits / required_total
        correctness = Correctness.CORRECT if required_hits == required_total else Correctness.PARTIAL if required_hits else Correctness.INCORRECT
        return correctness, score, {"mode": "proposition-groups", "matched": matched, "missed": missed, "optional_hits": optional_hits}

    accepted_text = task.grading.get("accepted_text")
    accepted_strings = ([accepted_text] if accepted_text is not None else [_structured_text(task.accepted_answer)])
    accepted_strings += _listify(task.grading.get("accepted_text_aliases") or task.accepted_variants)
    accepted_norm = [normalize_text(v) for v in accepted_strings if normalize_text(v)]
    if text in accepted_norm:
        return Correctness.CORRECT, 1.0, {"mode": "normalized-full-proposition"}
    for candidate in accepted_norm:
        if candidate and (candidate in text or text in candidate) and min(len(candidate.split()), len(text.split())) >= 3:
            ratio = min(len(text.split()), len(candidate.split())) / max(len(text.split()), len(candidate.split()))
            if ratio >= 0.7:
                return Correctness.PARTIAL, ratio, {"mode": "bounded-explicit-phrase"}
    return Correctness.INCORRECT, 0.0, {"mode": "bounded-explicit-phrase"}


def grade_text(task: TaskDefinition, answer: Any) -> GradeResult:
    correctness, score, details = _proposition_score(task, answer)
    return _result(task, correctness, score, details=details)


def grade_ordering(task: TaskDefinition, answer: Any) -> GradeResult:
    raw = answer.get("items") if isinstance(answer, Mapping) and "items" in answer else answer
    submitted = [normalize_text(x) for x in _listify(raw)]
    expected_raw = task.grading.get("accepted_order") or task.accepted_answer
    expected = [normalize_text(x) for x in _listify(expected_raw)]
    if not expected:
        return _result(task, Correctness.INCORRECT, 0.0, details={"validation": "missing accepted order"})
    positional = sum(1 for i, value in enumerate(submitted[: len(expected)]) if value == expected[i])
    score = positional / len(expected)
    correctness = Correctness.CORRECT if submitted == expected else Correctness.PARTIAL if positional else Correctness.INCORRECT
    return _result(task, correctness, score, accepted=expected, details={"positional_matches": positional})


def _pairs_mapping(answer: Any) -> Mapping[str, Any] | None:
    if isinstance(answer, Mapping) and "pairs" in answer:
        answer = answer["pairs"]
    if isinstance(answer, Mapping):
        return answer
    if isinstance(answer, list):
        result: dict[str, Any] = {}
        for item in answer:
            if not isinstance(item, Mapping) or "left" not in item or "right" not in item:
                return None
            result[str(item["left"])] = item["right"]
        return result
    return None


def grade_matching(task: TaskDefinition, answer: Any) -> GradeResult:
    submitted_map = _pairs_mapping(answer)
    expected = task.grading.get("accepted_pairs") or task.accepted_answer
    if submitted_map is None:
        return _result(task, Correctness.INCORRECT, 0.0, details={"validation": "matching answer must use pairs"})
    if not isinstance(expected, Mapping) or not expected:
        return _result(task, Correctness.INCORRECT, 0.0, details={"validation": "missing accepted pairs"})
    ne = {normalize_text(k): normalize_text(v) for k, v in expected.items()}
    ns = {normalize_text(k): normalize_text(v) for k, v in submitted_map.items()}
    hits = sum(1 for k, v in ne.items() if ns.get(k) == v)
    score = hits / len(ne)
    correctness = Correctness.CORRECT if hits == len(ne) and len(ns) == len(ne) else Correctness.PARTIAL if hits else Correctness.INCORRECT
    return _result(task, correctness, score, accepted=ne, details={"matched_pairs": hits, "pair_count": len(ne)})


def _canonical_evidence_values(task: TaskDefinition) -> Any:
    accepted = task.accepted_answer
    if isinstance(accepted, Mapping):
        return accepted.get("evidence_ids", accepted.get("evidence"))
    return accepted


def grade_evidence_select(task: TaskDefinition, answer: Any) -> GradeResult:
    raw = answer.get("evidence_ids") if isinstance(answer, Mapping) and "evidence_ids" in answer else answer
    submitted = {normalize_text(v) for v in _listify(raw)}
    configured = task.grading.get("required_evidence_ids")
    canonical = _canonical_evidence_values(task)
    expected_raw = configured if configured is not None else (canonical if _listify(canonical) else task.required_evidence)
    expected = {normalize_text(v) for v in _listify(expected_raw)}
    if not expected:
        return _result(task, Correctness.INCORRECT, 0.0, details={"validation": "missing required evidence"})
    hits = len(submitted & expected); extras = len(submitted - expected)
    score = max(0.0, (hits - 0.5 * extras) / len(expected))
    correctness = Correctness.CORRECT if submitted == expected else Correctness.PARTIAL if hits else Correctness.INCORRECT
    return _result(task, correctness, score, accepted=sorted(expected), evidence=sorted(expected), details={"evidence_hits": hits, "extras": extras})


def grade_claim_evidence(task: TaskDefinition, answer: Any) -> GradeResult:
    if not isinstance(answer, Mapping):
        return _result(task, Correctness.INCORRECT, 0.0, details={"validation": "claim/evidence answer must be object"})
    claim = answer.get("claim", "")
    evidence = answer.get("evidence_ids", answer.get("evidence", []))
    claim_task = task
    if isinstance(task.accepted_answer, Mapping):
        canonical_claim = task.accepted_answer.get("claim", task.accepted_answer.get("text"))
        if canonical_claim is not None:
            claim_task = replace(task, accepted_answer=canonical_claim)
    cc, cs, cd = _proposition_score(claim_task, {"text": claim})
    ev = grade_evidence_select(task, {"evidence_ids": evidence})
    score = round(cs * 0.6 + ev.score * 0.4, 6)
    correctness = Correctness.CORRECT if cc is Correctness.CORRECT and ev.correctness is Correctness.CORRECT else Correctness.PARTIAL if cc is not Correctness.INCORRECT or ev.correctness is not Correctness.INCORRECT else Correctness.INCORRECT
    return _result(task, correctness, score, details={"claim": cd, "evidence": ev.details})


def grade_speaker_recipient(task: TaskDefinition, answer: Any) -> GradeResult:
    if not isinstance(answer, Mapping):
        return _result(task, Correctness.INCORRECT, 0.0, details={"validation": "speaker/recipient answer must be object"})
    expected_speaker = normalize_text(task.grading.get("speaker") or (task.accepted_answer.get("speaker") if isinstance(task.accepted_answer, Mapping) else ""))
    expected_recipient = normalize_text(task.grading.get("recipient") or (task.accepted_answer.get("recipient") if isinstance(task.accepted_answer, Mapping) else ""))
    speaker = normalize_text(answer.get("speaker")); recipient = normalize_text(answer.get("recipient"))
    hits = int(speaker == expected_speaker) + int(recipient == expected_recipient)
    correctness = Correctness.CORRECT if hits == 2 else Correctness.PARTIAL if hits else Correctness.INCORRECT
    return _result(task, correctness, hits / 2.0, accepted={"speaker": expected_speaker, "recipient": expected_recipient}, details={"speaker_match": speaker == expected_speaker, "recipient_match": recipient == expected_recipient})


def grade_ot_nt_link(task: TaskDefinition, answer: Any) -> GradeResult:
    if not isinstance(answer, Mapping):
        return _result(task, Correctness.INCORRECT, 0.0, details={"validation": "OT_NT_LINK answer must be object"})
    expected = task.grading.get("ot_nt_link")
    if not isinstance(expected, Mapping):
        expected = task.accepted_answer if isinstance(task.accepted_answer, Mapping) else None
    if not isinstance(expected, Mapping):
        return _result(task, Correctness.INCORRECT, 0.0, details={"validation": "missing ot_nt_link ground truth"})
    fields = ("ot_passage", "nt_passage", "relation_category", "confidence", "evidence_id")
    matches = {field: normalize_text(answer.get(field)) == normalize_text(expected.get(field)) for field in fields}
    hits = sum(matches.values())
    correctness = Correctness.CORRECT if hits == len(fields) else Correctness.PARTIAL if hits else Correctness.INCORRECT
    uncertainty = task.grading.get("uncertainty")
    return _result(task, correctness, hits / len(fields), accepted=dict(expected), evidence=[str(expected.get("evidence_id", ""))], uncertainty=uncertainty, details={"field_matches": matches})


def _composite_steps(answer: Any) -> dict[str, Any] | None:
    if not isinstance(answer, Mapping):
        return None
    steps = answer.get("steps")
    if isinstance(steps, list):
        result = {}
        for step in steps:
            if isinstance(step, Mapping) and "step_id" in step:
                result[str(step["step_id"])] = step.get("answer")
        return result
    return dict(answer)


def grade_composite(task: TaskDefinition, answer: Any, registry: "GraderRegistry") -> GradeResult:
    submitted = _composite_steps(answer)
    if submitted is None:
        return _result(task, Correctness.INCORRECT, 0.0, details={"validation": "composite answer must use steps"})
    steps = task.grading.get("steps") or []
    if not steps:
        return _result(task, Correctness.INCORRECT, 0.0, details={"validation": "missing composite steps"})
    weighted = total_weight = 0.0; step_results: dict[str, Any] = {}; all_correct = True; any_progress = False
    for step in steps:
        if not isinstance(step, Mapping):
            continue
        step_id = str(step.get("id") or step.get("step_id"))
        weight = float(step.get("weight", 1.0))
        if isinstance(step.get("task"), Mapping):
            child_raw = dict(task.raw); child_raw.update(step["task"])
        else:
            child_raw = dict(task.raw)
            child_raw["task_type"] = canonical_task_type(str(step.get("task_type", "LONG_TEXT")))
            if "accepted_choice" in step:
                child_raw["accepted_answer"] = step["accepted_choice"]
                child_raw["grading"] = {"accepted_choice": step["accepted_choice"]}
            else:
                child_raw["accepted_answer"] = step.get("accepted_text", "")
                child_raw["grading"] = {"accepted_text": step.get("accepted_text", "")}
        child_raw["node_id"] = f"{task.node_id}:{step_id}"; child_raw["mission_id"] = task.mission_id
        child_raw.setdefault("confidence_code", task.confidence.value); child_raw.setdefault("textual_variant_flag", "TX1" if task.tx1 else "none")
        child_raw.setdefault("success_feedback", task.success_feedback); child_raw.setdefault("partial_feedback", task.partial_feedback); child_raw.setdefault("failure_feedback", task.failure_feedback)
        child_raw.setdefault("hints", {}); child_raw.setdefault("on_correct", "none"); child_raw.setdefault("on_partial", "none"); child_raw.setdefault("on_incorrect", "none"); child_raw.setdefault("on_hint_threshold", "none"); child_raw.setdefault("optional_evidence_unlock", "none"); child_raw.setdefault("later_retrieval_effect", "RETIRED"); child_raw.setdefault("mastery_domains", list(task.mastery_domains))
        child = TaskDefinition.from_canonical(child_raw)
        result = registry.grade(child, submitted.get(step_id), validate_dto=False)
        weighted += result.score * weight; total_weight += weight; step_results[step_id] = result.to_dict(); all_correct &= result.correctness is Correctness.CORRECT; any_progress |= result.score > 0
    score = weighted / total_weight if total_weight else 0.0
    correctness = Correctness.CORRECT if all_correct and total_weight else Correctness.PARTIAL if any_progress else Correctness.INCORRECT
    return _result(task, correctness, score, details={"steps": step_results})


@dataclass
class GraderRegistry:
    _graders: dict[str, Callable[[TaskDefinition, Any], GradeResult]]

    def __init__(self) -> None:
        self._graders = {}
        for name in ("SINGLE_CHOICE", "COMBOBOX_SELECT", "PARALLEL_WITNESS_COMPARE", "radio", "select", "classification"):
            self.register(name, grade_single_choice)
        for name in ("MULTI_SELECT", "checkboxes", "citation selection"):
            self.register(name, grade_multi_select)
        for name in ("SHORT_TEXT", "LONG_TEXT", "ARGUMENT", "free response", "free response + citation", "free response / comparison", "witness comparison"):
            self.register(name, grade_text)
        for name in ("ORDERING", "chronology"):
            self.register(name, grade_ordering)
        self.register("MATCHING", grade_matching)
        self.register("EVIDENCE_SELECT", grade_evidence_select)
        for name in ("CLAIM_EVIDENCE", "claim/evidence", "court"):
            self.register(name, grade_claim_evidence)
        self.register("SPEAKER_RECIPIENT", grade_speaker_recipient)
        self.register("OT_NT_LINK", grade_ot_nt_link)

    @staticmethod
    def _key(name: str) -> str:
        return canonical_task_type(name)

    def register(self, task_type: str, grader: Callable[[TaskDefinition, Any], GradeResult]) -> None:
        self._graders[self._key(task_type)] = grader

    def supported_types(self) -> tuple[str, ...]:
        return tuple(sorted(self._graders)) + ("COMPOSITE_MULTI_STEP",)

    def grade(self, task: TaskDefinition, answer: Any, *, validate_dto: bool = True) -> GradeResult:
        key = self._key(task.task_type)
        if validate_dto and isinstance(answer, Mapping) and answer.get("schema") == ANSWER_CONTRACT_VERSION:
            answer = validate_answer_dto(key, answer)
        if key == "COMPOSITE_MULTI_STEP":
            return grade_composite(task, answer, self)
        grader = self._graders.get(key)
        if grader is None:
            raise ValueError(f"No grader registered for task type: {task.task_type}")
        return grader(task, answer)
