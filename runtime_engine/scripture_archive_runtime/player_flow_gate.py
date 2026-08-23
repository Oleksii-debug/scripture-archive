from __future__ import annotations

import copy
from dataclasses import dataclass
from typing import Any, Callable, Mapping, Sequence


class PlayerFlowGateError(ValueError):
    """Fail-closed exact-terminal player-flow validation error."""


@dataclass(frozen=True)
class PlayerFlowPolicy:
    required_lanes: tuple[str, ...] = ("D2", "D3", "D4")
    expected_nodes: int = 1196
    exercise_first_hint: bool = True


def _node_records(item: Any) -> Sequence[Mapping[str, Any]]:
    try:
        records = item.snapshot.collection("nodes").records
    except Exception as exc:  # pragma: no cover - exact error retained for gate evidence
        raise PlayerFlowGateError(f"cannot read validated node collection: {type(exc).__name__}: {exc}") from exc
    if not isinstance(records, Sequence):
        records = tuple(records)
    return records


def _default_dependencies() -> tuple[
    Callable[[Sequence[Mapping[str, Any]]], Any],
    Callable[[Mapping[str, Any], str], Mapping[str, Any]],
    Callable[[Mapping[str, Any]], Any],
]:
    from .application import RuntimeApplication
    from .content import ContentRepository
    from .package_adapters import adapt_node_for_runtime, derive_answer_dto

    def app_factory(records: Sequence[Mapping[str, Any]]) -> RuntimeApplication:
        return RuntimeApplication(ContentRepository(tuple(records)))

    return app_factory, adapt_node_for_runtime, derive_answer_dto


def _require_accessibility_event(event: Any, *, node_id: str, expected_type: str) -> None:
    if not isinstance(event, Mapping):
        raise PlayerFlowGateError(f"{node_id}: accessibility event is not an object")
    if event.get("event_type") != expected_type:
        raise PlayerFlowGateError(
            f"{node_id}: accessibility event type {event.get('event_type')!r} != {expected_type!r}"
        )
    for field in ("heading", "message", "status", "focus_target"):
        value = event.get(field)
        if not isinstance(value, str) or not value.strip():
            raise PlayerFlowGateError(f"{node_id}: accessibility {expected_type}.{field} is empty")


def _require_ground_truth_provenance(value: Any, *, lane: str, node_id: str) -> str:
    if not isinstance(value, Mapping):
        raise PlayerFlowGateError(f"{lane}:{node_id}: ground_truth_provenance missing from player payload")
    if value.get("schema") != "GROUND_TRUTH_PROVENANCE_v1":
        raise PlayerFlowGateError(f"{lane}:{node_id}: ground_truth_provenance schema mismatch")
    if value.get("release_pass") is not True:
        raise PlayerFlowGateError(f"{lane}:{node_id}: ground_truth_provenance is not release-pass")
    provenance_class = str(value.get("class") or "").strip()
    if not provenance_class:
        raise PlayerFlowGateError(f"{lane}:{node_id}: ground_truth_provenance class missing")
    return provenance_class


def run_player_flow_gate(
    inputs: Sequence[Any],
    *,
    policy: PlayerFlowPolicy = PlayerFlowPolicy(),
    application_factory: Callable[[Sequence[Mapping[str, Any]]], Any] | None = None,
    adapt_node: Callable[[Mapping[str, Any], str], Mapping[str, Any]] | None = None,
    derive_answer: Callable[[Mapping[str, Any]], Any] | None = None,
) -> dict[str, Any]:
    """Exercise canonical-answer load/hint/submit flow through runtime.v1 for every final node.

    `inputs` are already validated terminal lane inputs. This gate intentionally does not
    replace delivery readiness, content conformance, persistence, or real UI/NVDA acceptance.
    """
    if not inputs:
        raise PlayerFlowGateError("no validated final inputs supplied")

    lanes = [str(item.expectation.lane) for item in inputs]
    if len(lanes) != len(set(lanes)):
        raise PlayerFlowGateError(f"duplicate lane inputs: {lanes}")
    if frozenset(lanes) != frozenset(policy.required_lanes):
        missing = sorted(set(policy.required_lanes) - set(lanes))
        extra = sorted(set(lanes) - set(policy.required_lanes))
        raise PlayerFlowGateError(f"player-flow lane set mismatch; missing={missing}, extra={extra}")

    if application_factory is None or adapt_node is None or derive_answer is None:
        defaults = _default_dependencies()
        application_factory = application_factory or defaults[0]
        adapt_node = adapt_node or defaults[1]
        derive_answer = derive_answer or defaults[2]

    prepared: list[tuple[str, Mapping[str, Any], Mapping[str, Any], Any]] = []
    seen_ids: set[str] = set()
    task_type_counts: dict[str, int] = {}
    provenance_class_counts: dict[str, int] = {}
    for item in sorted(inputs, key=lambda row: str(row.expectation.lane)):
        lane = str(item.expectation.lane)
        for raw in _node_records(item):
            if not isinstance(raw, Mapping):
                raise PlayerFlowGateError(f"{lane}: node record is not an object")
            node_id = str(raw.get("node_id") or "").strip()
            if not node_id:
                raise PlayerFlowGateError(f"{lane}: node_id is missing")
            if node_id in seen_ids:
                raise PlayerFlowGateError(f"duplicate player-flow node_id {node_id}")
            seen_ids.add(node_id)
            adapted = adapt_node(raw, lane=lane)
            if not isinstance(adapted, Mapping):
                raise PlayerFlowGateError(f"{lane}:{node_id}: adapted node is not an object")
            if str(adapted.get("node_id") or "") != node_id:
                raise PlayerFlowGateError(f"{lane}:{node_id}: adapter changed stable node_id")
            answer = derive_answer(raw)
            prepared.append((lane, raw, adapted, answer))

    if len(prepared) != policy.expected_nodes:
        raise PlayerFlowGateError(
            f"player-flow total node count mismatch: {len(prepared)} != {policy.expected_nodes}"
        )

    app = application_factory(tuple(row[2] for row in prepared))
    load_pass = submit_pass = hint_pass = accessibility_pass = state_pass = 0
    hint_eligible = 0
    blockers: list[str] = []

    for lane, raw, adapted, answer in prepared:
        node_id = str(raw["node_id"])
        before = copy.deepcopy(raw)
        try:
            loaded = app.load_task(node_id)
            if loaded.get("api_version") != "runtime.v1":
                raise PlayerFlowGateError(f"{lane}:{node_id}: load_task api_version mismatch")
            task_payload = loaded.get("task")
            if not isinstance(task_payload, Mapping):
                raise PlayerFlowGateError(f"{lane}:{node_id}: load_task task payload missing")
            if task_payload.get("node_id") != node_id:
                raise PlayerFlowGateError(f"{lane}:{node_id}: load_task returned wrong node")
            if not task_payload.get("answer_contract"):
                raise PlayerFlowGateError(f"{lane}:{node_id}: answer_contract missing from player payload")
            nonvisual = task_payload.get("functional_nonvisual_equivalent")
            if not isinstance(nonvisual, str) or not nonvisual.strip():
                raise PlayerFlowGateError(f"{lane}:{node_id}: nonvisual equivalent missing from player payload")
            provenance_class = _require_ground_truth_provenance(
                task_payload.get("ground_truth_provenance"), lane=lane, node_id=node_id
            )
            provenance_class_counts[provenance_class] = provenance_class_counts.get(provenance_class, 0) + 1
            load_pass += 1
            task_type = str(task_payload.get("task_type") or "<missing>")
            task_type_counts[task_type] = task_type_counts.get(task_type, 0) + 1

            hints_available = int(task_payload.get("hints_available") or 0)
            if hints_available > 0:
                hint_eligible += 1
            if policy.exercise_first_hint and hints_available > 0:
                hint = app.request_hint(node_id)
                _require_accessibility_event(
                    hint.get("accessibility"), node_id=node_id, expected_type="hint"
                )
                if int((hint.get("hint") or {}).get("level") or 0) != 1:
                    raise PlayerFlowGateError(f"{lane}:{node_id}: first hint level is not H1")
                hint_pass += 1

            result = app.submit_answer(node_id, answer)
            grade = result.get("grade")
            if not isinstance(grade, Mapping) or grade.get("correctness") != "CORRECT":
                raise PlayerFlowGateError(
                    f"{lane}:{node_id}: canonical answer player submission is not CORRECT"
                )
            submit_pass += 1

            events = result.get("accessibility")
            if not isinstance(events, Sequence) or isinstance(events, (str, bytes)):
                raise PlayerFlowGateError(f"{lane}:{node_id}: submit accessibility events missing")
            by_type = {
                event.get("event_type"): event
                for event in events
                if isinstance(event, Mapping) and event.get("event_type")
            }
            _require_accessibility_event(by_type.get("grade"), node_id=node_id, expected_type="grade")
            _require_accessibility_event(by_type.get("branch"), node_id=node_id, expected_type="branch")
            accessibility_pass += 1

            memory = getattr(app, "memory", None)
            history = getattr(memory, "node_history", {}) if memory is not None else {}
            state = history.get(node_id) if isinstance(history, Mapping) else None
            if state is None or not bool(getattr(state, "completed", False)):
                raise PlayerFlowGateError(f"{lane}:{node_id}: runtime memory did not mark node complete")
            attempts = list(getattr(state, "attempts", ()) or ())
            if len(attempts) != 1:
                raise PlayerFlowGateError(f"{lane}:{node_id}: expected exactly one canonical attempt")
            if getattr(attempts[0], "answer_snapshot", object()) != answer:
                raise PlayerFlowGateError(f"{lane}:{node_id}: answer snapshot mismatch")
            state_pass += 1

            if raw != before:
                raise PlayerFlowGateError(f"{lane}:{node_id}: canonical input record mutated during player flow")
        except Exception as exc:
            blockers.append(f"{lane}:{node_id}:{type(exc).__name__}:{exc}")

    if blockers:
        raise PlayerFlowGateError(
            f"player-flow blockers: {len(blockers)} ({'; '.join(blockers[:10])})"
        )

    memory = getattr(app, "memory", None)
    mistakes = getattr(memory, "mistakes", {}) if memory is not None else {}
    if mistakes:
        raise PlayerFlowGateError(f"canonical-answer player flow recorded mistakes: {len(mistakes)}")

    session = getattr(app, "session", None)
    shown = list(getattr(session, "shown_node_ids", ()) or ()) if session is not None else []
    if len(set(shown)) != policy.expected_nodes:
        raise PlayerFlowGateError(
            f"player session shown-node count mismatch: {len(set(shown))} != {policy.expected_nodes}"
        )

    if sum(provenance_class_counts.values()) != policy.expected_nodes:
        raise PlayerFlowGateError(
            "ground-truth provenance count does not cover every player-flow node"
        )

    return {
        "schema": "R06_STAGE05_PLAYER_FLOW_GATE_RESULT_v1",
        "status": "PASS",
        "required_lanes": list(policy.required_lanes),
        "total_nodes": policy.expected_nodes,
        "load_task_pass_count": load_pass,
        "submit_answer_correct_count": submit_pass,
        "first_hint_eligible_count": hint_eligible,
        "first_hint_pass_count": hint_pass,
        "accessibility_grade_branch_pass_count": accessibility_pass,
        "runtime_state_completion_pass_count": state_pass,
        "canonical_input_mutation_count": 0,
        "mistake_count": 0,
        "session_unique_shown_count": len(set(shown)),
        "task_type_counts": dict(sorted(task_type_counts.items())),
        "ground_truth_provenance_class_counts": dict(sorted(provenance_class_counts.items())),
        "persistence_gate": "SEPARATE_REQUIRED",
        "security_gate": "SEPARATE_REQUIRED",
        "real_ui_nvda_gate": "SEPARATE_REQUIRED",
    }
