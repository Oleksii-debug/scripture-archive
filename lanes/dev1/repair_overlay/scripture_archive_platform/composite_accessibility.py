from __future__ import annotations

from typing import Any, Mapping

from scripture_archive_platform.accessibility_inspector import (
    AccessibilityFinding,
    AccessibilityReport,
    inspect_renderable_task,
)
from scripture_archive_platform.transport.answer_contracts import canonical_task_type


_COMPOSITE_TEXT_CHILD_TYPES = frozenset({"SHORT_TEXT", "LONG_TEXT", "ARGUMENT"})


def _text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _repath(path: str, prefix: str) -> str:
    if path == "task":
        return prefix
    if path.startswith("task."):
        return prefix + path[4:]
    return f"{prefix}.{path}"


def _child_contract_missing(path: str) -> AccessibilityFinding:
    return AccessibilityFinding(
        code="A11Y_COMPOSITE_CHILD_CONTRACT_MISSING",
        severity="error",
        path=f"{path}.task_type",
        message="Composite child has no preserved semantic task/accessibility contract to inspect.",
        remediation=(
            "Author the child as a player-visible semantic step with task_type, answer contract, "
            "and accessibility metadata; grading-only steps cannot be accessibility-qualified."
        ),
    )


def _child_renderer_parity_mismatch(path: str, task_type: str) -> AccessibilityFinding:
    return AccessibilityFinding(
        code="A11Y_COMPOSITE_CHILD_RENDERER_PARITY_MISMATCH",
        severity="error",
        path=f"{path}.task_type",
        message=(
            "Packaged COMPOSITE_MULTI_STEP currently emits child answers only as {text: ...}, "
            f"but {task_type!r} requires a different semantic ANSWER_DTO shape."
        ),
        remediation=(
            "Use a text-answer child type (SHORT_TEXT, LONG_TEXT, or ARGUMENT), or implement "
            "semantic child renderer dispatch before allowing this composite to publish."
        ),
    )


def inspect_packaged_task(task: Mapping[str, Any]) -> AccessibilityReport:
    """Inspect a packaged task and recursively qualify composite child surfaces.

    TaskPresentationMapper passes only player-visible child metadata into this layer.
    Missing child semantics are therefore a qualification failure, not permission to
    infer them from grading truth. Even incomplete children are still inspected so
    explicit nested pointer/visual/media hazards cannot disappear behind the missing
    contract finding.

    The packaged COMPOSITE_MULTI_STEP renderer currently renders every child as one
    labelled text input and emits ``{step_id, answer: {text: ...}}``. Until that
    renderer dispatches child task types semantically, the inspector must fail closed
    for child contracts whose answer shape is not text-based; otherwise it could
    certify an interaction that the packaged UI cannot actually perform.
    """
    base = inspect_renderable_task(task)
    if not isinstance(task, Mapping):
        return base

    raw_type = _text(task.get("task_type"))
    if not raw_type or canonical_task_type(raw_type) != "COMPOSITE_MULTI_STEP":
        return base

    findings = list(base.findings)
    steps = task.get("steps")
    if not isinstance(steps, list):
        return base

    for index, step in enumerate(steps):
        path = f"task.steps[{index}]"
        if not isinstance(step, Mapping):
            continue  # Base inspector already reports the invalid step.

        child_type = _text(step.get("task_type"))
        canonical_child_type = canonical_task_type(child_type) if child_type else "<MISSING>"
        if not child_type:
            findings.append(_child_contract_missing(path))
        elif canonical_child_type not in _COMPOSITE_TEXT_CHILD_TYPES:
            findings.append(_child_renderer_parity_mismatch(path, canonical_child_type))

        step_id = _text(step.get("step_id")) or str(index + 1)
        label = _text(step.get("label")) or _text(step.get("prompt")) or f"Step {index + 1}"
        prompt = _text(step.get("prompt")) or label

        # Copy only the sanitized packaged child surface. Parent context supplies the
        # source scope when the child did not provide one. Accessibility is NOT
        # inherited: a missing child nonvisual contract must remain visible as a fail.
        child: dict[str, Any] = dict(step)
        child["node_id"] = f"{base.node_id}#{step_id}"
        child["task_type"] = canonical_child_type
        child["heading"] = label
        child["prompt"] = prompt
        child.setdefault("source_scope", task.get("source_scope"))
        child.setdefault("visual", {})

        child_report = inspect_packaged_task(child)
        for finding in child_report.findings:
            findings.append(
                AccessibilityFinding(
                    code=finding.code,
                    severity=finding.severity,
                    path=_repath(finding.path, path),
                    message=finding.message,
                    remediation=finding.remediation,
                )
            )

    severity_rank = {"error": 0, "warning": 1, "info": 2}
    findings.sort(
        key=lambda item: (
            severity_rank.get(item.severity, 9),
            item.code,
            item.path,
            item.message,
        )
    )
    return AccessibilityReport(base.node_id, base.task_type, tuple(findings))
