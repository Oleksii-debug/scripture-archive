from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable, Mapping

from .models import BranchResolution, BranchTerminal, Correctness, TaskDefinition

NODE_RE = re.compile(r"\b[A-Z]{2,5}\d{2}-[NO]\d{2}\b")


def _parse_evidence_unlock(value: object) -> tuple[str, ...]:
    if value in (None, "", "none"):
        return ()
    if isinstance(value, str):
        return tuple(x.strip() for x in re.split(r"[;,]", value) if x.strip() and x.strip().casefold() != "none")
    if isinstance(value, Iterable):
        return tuple(str(x) for x in value)
    return (str(value),)


@dataclass
class BranchEngine:
    max_node_visits_per_session: int = 4

    def resolve(self, task: TaskDefinition, correctness: Correctness, *, hint_count: int = 0, hint_threshold: int | None = None) -> BranchResolution:
        if hint_threshold is not None and hint_count >= hint_threshold:
            raw = task.branches.get("on_hint_threshold", "return_to_current_node")
        elif correctness is Correctness.CORRECT:
            raw = task.branches.get("on_correct", "none")
        elif correctness is Correctness.PARTIAL:
            raw = task.branches.get("on_partial", "return_to_current_node")
        else:
            raw = task.branches.get("on_incorrect", "return_to_current_node")
        return self.parse_target(raw, task=task)

    def parse_target(self, raw_target: str, *, task: TaskDefinition | None = None) -> BranchResolution:
        raw = (raw_target or "none").strip()
        low = raw.casefold()
        evidence = _parse_evidence_unlock(task.optional_evidence_unlock if task else "none")
        retrieval = task.later_retrieval_effect if task else None
        if low in {"none", "n/a", "not used"}:
            return BranchResolution(BranchTerminal.NONE, raw, evidence_unlocks=evidence, retrieval_effect=retrieval)
        if low.startswith("return_to_current_node") or low.startswith("return current"):
            return BranchResolution(BranchTerminal.RETURN_CURRENT, raw, next_node_id=task.node_id if task else None, evidence_unlocks=evidence, retrieval_effect=retrieval)
        if raw.startswith("REVIEW_QUEUE"):
            queue = raw[len("REVIEW_QUEUE"):].strip() or None
            return BranchResolution(BranchTerminal.REVIEW_QUEUE, raw, queue_id=queue, evidence_unlocks=evidence, retrieval_effect=retrieval)
        if raw.startswith("DEFERRED_CAMPAIGN"):
            campaign = raw[len("DEFERRED_CAMPAIGN"):].strip() or None
            return BranchResolution(BranchTerminal.DEFERRED_CAMPAIGN, raw, campaign_id=campaign, evidence_unlocks=evidence, retrieval_effect=retrieval)
        if raw.startswith("RETIRED"):
            return BranchResolution(BranchTerminal.RETIRED, raw, evidence_unlocks=evidence, retrieval_effect=retrieval)
        if raw.startswith("RESOLVED_NODE"):
            match = NODE_RE.search(raw)
            return BranchResolution(BranchTerminal.RESOLVED_NODE, raw, next_node_id=match.group(0) if match else None, evidence_unlocks=evidence, retrieval_effect=retrieval)
        match = NODE_RE.search(raw)
        if match:
            return BranchResolution(BranchTerminal.NODE, raw, next_node_id=match.group(0), evidence_unlocks=evidence, retrieval_effect=retrieval)
        if any(token in low for token in ("recheck", "reread", "missing", "feedback", "guided")):
            return BranchResolution(BranchTerminal.RETURN_CURRENT, raw, next_node_id=task.node_id if task else None, evidence_unlocks=evidence, retrieval_effect=retrieval)
        raise ValueError(f"Unsupported/fake branch target: {raw}")

    def enforce_cycle_guard(self, next_node_id: str | None, visit_counts: Mapping[str, int]) -> None:
        if next_node_id and visit_counts.get(next_node_id, 0) >= self.max_node_visits_per_session:
            raise RuntimeError(f"Cycle protection triggered for {next_node_id}")

    def validate_reachability(self, nodes: Mapping[str, TaskDefinition]) -> list[str]:
        errors: list[str] = []
        for node_id, task in nodes.items():
            for branch_name in ("on_correct", "on_partial", "on_incorrect", "on_hint_threshold"):
                raw = task.branches.get(branch_name, "none")
                try:
                    resolution = self.parse_target(raw, task=task)
                except ValueError as exc:
                    errors.append(f"{node_id}.{branch_name}: {exc}")
                    continue
                if resolution.terminal in {BranchTerminal.NODE, BranchTerminal.RESOLVED_NODE}:
                    if not resolution.next_node_id or resolution.next_node_id not in nodes:
                        errors.append(f"{node_id}.{branch_name}: missing target {resolution.next_node_id or raw}")
            try:
                retrieval = self.parse_target(task.later_retrieval_effect, task=task)
                if retrieval.terminal is BranchTerminal.RESOLVED_NODE and (not retrieval.next_node_id or retrieval.next_node_id not in nodes):
                    errors.append(f"{node_id}.later_retrieval_effect: missing target {retrieval.next_node_id}")
            except ValueError as exc:
                errors.append(f"{node_id}.later_retrieval_effect: {exc}")
        return errors
