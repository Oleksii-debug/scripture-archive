from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from typing import Any, Callable, Iterable, Mapping, Sequence

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
    if isinstance(value, Sequence):
        return [str(x) for x in value]
    return [str(value)]


def _feedback(task: TaskDefinition, correctness: Correctness) -> str:
    if correctness is Correctness.CORRECT:
        return task.success_feedback
    if correctness is Correctness.PARTIAL:
        return task.partial_feedback
    return task.failure_feedback


def _result(task: TaskDefinition, correctness: Correctness, score: float, *, accepted: Any = None, evidence: Iterable[str] | None = None, uncertainty: str | None = None, details: Mapping[str, Any] | None = None) -> GradeResult:
    return GradeResult(correctness=correctness, score=max(0.0, min(1.0, score)), confidence=task.confidence, tx1=task.tx1, source_scope=task.source_scope, accepted_proposition=task.accepted_answer if accepted is None else accepted, evidence=tuple(evidence if evidence is not None else task.required_evidence), uncertainty=uncertainty or ("Textual-variant qualification applies; responsible translation traditions must not be penalized." if task.tx1 else None), feedback=_feedback(task, correctness), details=dict(details or {}))


def grade_single_choice(task: TaskDefinition, answer: Any) -> GradeResult:
    submitted = normalize_text(answer)
    accepted = {normalize_text(task.accepted_answer)} | {normalize_text(v) for v in _listify(task.accepted_variants)}
    correctness = Correctness.CORRECT if submitted and submitted in accepted else Correctness.INCORRECT
    return _result(task, correctness, 1.0 if correctness is Correctness.CORRECT else 0.0)


def grade_multi_select(task: TaskDefinition, answer: Any) -> GradeResult:
    submitted = {normalize_text(v) for v in _listify(answer)}
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
    text = normalize_text(answer)
    config = task.grading.get("accepted_propositions")
    if not config:
        accepted_strings = [task.accepted_answer] + _listify(task.accepted_variants)
        accepted_norm = [normalize_text(v) for v in accepted_strings if normalize_text(v)]
        if text in accepted_norm:
            return Correctness.CORRECT, 1.0, {"mode": "normalized-full-proposition"}
        for candidate in accepted_norm:
            if candidate and (candidate in text or text in candidate) and min(len(candidate.split()), len(text.split())) >= 3:
                ratio = min(len(text.split()), len(candidate.split())) / max(len(text.split()), len(candidate.split()))
                if ratio >= 0.7:
                    return Correctness.PARTIAL, ratio, {"mode": "bounded-explicit-phrase"}
        return Correctness.INCORRECT, 0.0, {"mode": "bounded-explicit-phrase"}
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
            if hit: required_hits += 1
            else: missed.append(pid)
        elif hit:
            optional_hits += 1
        if hit: matched.append(pid)
    if required_total == 0:
        return Correctness.INCORRECT, 0.0, {"mode": "proposition-groups", "validation": "no required propositions"}
    score = required_hits / required_total
    correctness = Correctness.CORRECT if required_hits == required_total else Correctness.PARTIAL if required_hits else Correctness.INCORRECT
    return correctness, score, {"mode": "proposition-groups", "matched": matched, "missed": missed, "optional_hits": optional_hits}


def grade_text(task: TaskDefinition, answer: Any) -> GradeResult:
    correctness, score, details = _proposition_score(task, answer)
    return _result(task, correctness, score, details=details)


def grade_ordering(task: TaskDefinition, answer: Any) -> GradeResult:
    submitted = [normalize_text(x) for x in _listify(answer)]
    expected = [normalize_text(x) for x in _listify(task.grading.get("accepted_order") or task.accepted_answer)]
    if not expected:
        return _result(task, Correctness.INCORRECT, 0.0, details={"validation": "missing accepted order"})
    positional = sum(1 for i, value in enumerate(submitted[:len(expected)]) if value == expected[i])
    score = positional / len(expected)
    correctness = Correctness.CORRECT if submitted == expected else Correctness.PARTIAL if positional else Correctness.INCORRECT
    return _result(task, correctness, score, accepted=expected, details={"positional_matches": positional})


def grade_matching(task: TaskDefinition, answer: Any) -> GradeResult:
    if not isinstance(answer, Mapping):
        return _result(task, Correctness.INCORRECT, 0.0, details={"validation": "matching answer must be object"})
    expected = task.grading.get("accepted_pairs") or task.accepted_answer
    if not isinstance(expected, Mapping) or not expected:
        return _result(task, Correctness.INCORRECT, 0.0, details={"validation": "missing accepted pairs"})
    ne = {normalize_text(k): normalize_text(v) for k, v in expected.items()}
    ns = {normalize_text(k): normalize_text(v) for k, v in answer.items()}
    hits = sum(1 for k, v in ne.items() if ns.get(k) == v)
    score = hits / len(ne)
    correctness = Correctness.CORRECT if hits == len(ne) and len(ns) == len(ne) else Correctness.PARTIAL if hits else Correctness.INCORRECT
    return _result(task, correctness, score, accepted=ne, details={"matched_pairs": hits, "pair_count": len(ne)})


def grade_evidence_select(task: TaskDefinition, answer: Any) -> GradeResult:
    submitted = {normalize_text(v) for v in _listify(answer)}
    configured = task.grading.get("required_evidence_ids")
    expected = {normalize_text(v) for v in _listify(configured if configured is not None else task.required_evidence)}
    if not expected:
        return _result(task, Correctness.INCORRECT, 0.0, details={"validation": "missing required evidence"})
    hits = len(submitted & expected); extras = len(submitted - expected)
    score = max(0.0, (hits - 0.5 * extras) / len(expected))
    correctness = Correctness.CORRECT if submitted == expected else Correctness.PARTIAL if hits else Correctness.INCORRECT
    return _result(task, correctness, score, accepted=sorted(expected), evidence=sorted(expected), details={"evidence_hits": hits, "extras": extras})


def grade_claim_evidence(task: TaskDefinition, answer: Any) -> GradeResult:
    if not isinstance(answer, Mapping):
        return _result(task, Correctness.INCORRECT, 0.0, details={"validation": "claim/evidence answer must be object"})
    cc, cs, cd = _proposition_score(task, answer.get("claim", ""))
    ev = grade_evidence_select(task, answer.get("evidence", []))
    score = round(cs * 0.6 + ev.score * 0.4, 6)
    correctness = Correctness.CORRECT if cc is Correctness.CORRECT and ev.correctness is Correctness.CORRECT else Correctness.PARTIAL if cc is not Correctness.INCORRECT or ev.correctness is not Correctness.INCORRECT else Correctness.INCORRECT
    return _result(task, correctness, score, details={"claim": cd, "evidence": ev.details})


def grade_composite(task: TaskDefinition, answer: Any, registry: "GraderRegistry") -> GradeResult:
    if not isinstance(answer, Mapping):
        return _result(task, Correctness.INCORRECT, 0.0, details={"validation": "composite answer must be object"})
    steps = task.grading.get("steps") or []
    if not steps:
        return _result(task, Correctness.INCORRECT, 0.0, details={"validation": "missing composite steps"})
    weighted = total_weight = 0.0; step_results = {}; all_correct = True; any_progress = False
    for step in steps:
        if not isinstance(step, Mapping): continue
        step_id = str(step["id"]); weight = float(step.get("weight", 1.0)); child_raw = dict(task.raw); child_raw.update(step.get("task") or {})
        child_raw["node_id"] = f"{task.node_id}:{step_id}"; child_raw["mission_id"] = task.mission_id
        for key, value in {"confidence_code":task.confidence.value,"textual_variant_flag":"TX1" if task.tx1 else "none","success_feedback":task.success_feedback,"partial_feedback":task.partial_feedback,"failure_feedback":task.failure_feedback,"hints":{},"on_correct":"none","on_partial":"none","on_incorrect":"none","on_hint_threshold":"none","optional_evidence_unlock":"none","later_retrieval_effect":"RETIRED","mastery_domains":list(task.mastery_domains)}.items(): child_raw.setdefault(key,value)
        result = registry.grade(TaskDefinition.from_canonical(child_raw), answer.get(step_id)); weighted += result.score * weight; total_weight += weight; step_results[step_id] = result.to_dict(); all_correct &= result.correctness is Correctness.CORRECT; any_progress |= result.score > 0
    score = weighted / total_weight if total_weight else 0.0
    correctness = Correctness.CORRECT if all_correct and total_weight else Correctness.PARTIAL if any_progress else Correctness.INCORRECT
    return _result(task, correctness, score, details={"steps": step_results})


@dataclass
class GraderRegistry:
    _graders: dict[str, Callable[[TaskDefinition, Any], GradeResult]]
    def __init__(self) -> None:
        self._graders = {}
        for name in ("single choice","single_choice","radio","combobox","combobox_select","select","classification"): self.register(name, grade_single_choice)
        for name in ("multi-select","multi_select","checkboxes","citation selection"): self.register(name, grade_multi_select)
        for name in ("short text","short_text","free response","long text","long_text","argument","free response + citation","free response / comparison","witness comparison"): self.register(name, grade_text)
        for name in ("ordering","chronology"): self.register(name, grade_ordering)
        self.register("matching", grade_matching)
        for name in ("evidence select","evidence_select"): self.register(name, grade_evidence_select)
        for name in ("claim/evidence","claim_evidence","court"): self.register(name, grade_claim_evidence)
    @staticmethod
    def _key(name: str) -> str: return " ".join(str(name).replace("-"," ").replace("_"," ").casefold().split())
    def register(self, task_type: str, grader: Callable[[TaskDefinition, Any], GradeResult]) -> None: self._graders[self._key(task_type)] = grader
    def supported_types(self) -> tuple[str, ...]: return tuple(sorted(self._graders)) + ("composite multi step", "composite",)
    def grade(self, task: TaskDefinition, answer: Any) -> GradeResult:
        key = self._key(task.task_type)
        if key in {"composite multi step","composite","composite multi-step"}: return grade_composite(task, answer, self)
        grader = self._graders.get(key)
        if grader is None:
            if "select" in key or "choice" in key: grader = grade_single_choice
            elif "order" in key or "chronolog" in key: grader = grade_ordering
            elif "evidence" in key and "claim" in key: grader = grade_claim_evidence
            elif "evidence" in key: grader = grade_evidence_select
            elif any(token in key for token in ("response","comparison","text","citation")): grader = grade_text
            else: raise ValueError(f"No grader registered for task type: {task.task_type}")
        return grader(task, answer)
