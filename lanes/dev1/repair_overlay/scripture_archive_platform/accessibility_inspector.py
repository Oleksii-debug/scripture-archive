from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Mapping, Sequence

from scripture_archive_platform.transport.answer_contracts import (
    ANSWER_CONTRACT_VERSION,
    canonical_task_type,
)

INSPECTION_SCHEMA = "ACCESSIBILITY_INSPECTION_v1"

SUPPORTED_TASK_TYPES = frozenset(
    {
        "SHORT_TEXT",
        "LONG_TEXT",
        "ARGUMENT",
        "SINGLE_CHOICE",
        "MULTI_SELECT",
        "COMBOBOX_SELECT",
        "ORDERING",
        "MATCHING",
        "EVIDENCE_SELECT",
        "CLAIM_EVIDENCE",
        "SPEAKER_RECIPIENT",
        "PARALLEL_WITNESS_COMPARE",
        "OT_NT_LINK",
        "COMPOSITE_MULTI_STEP",
    }
)

_OPTION_TASK_TYPES = frozenset(
    {"SINGLE_CHOICE", "MULTI_SELECT", "COMBOBOX_SELECT", "PARALLEL_WITNESS_COMPARE"}
)
_EVIDENCE_OPTION_TASK_TYPES = frozenset({"EVIDENCE_SELECT", "CLAIM_EVIDENCE"})

_HAZARD_BOOL_KEYS = frozenset(
    {
        "mouse_only",
        "pointer_only",
        "drag_only",
        "color_only",
        "image_only",
        "hover_only",
        "timed_only",
        "visual_only",
        "spatial_only",
        "requires_mouse",
        "requires_pointer",
        "requires_drag",
        "requires_color_discrimination",
        "requires_image_recognition",
        "requires_hover",
        "timed_response_only",
    }
)
_HAZARD_MODE_KEYS = frozenset(
    {"interaction_mode", "input_mode", "control_mode", "response_mode", "visual_dependency"}
)
_HAZARD_MODE_MARKERS = (
    "mouse_only",
    "pointer_only",
    "drag_only",
    "drag_and_drop_only",
    "color_only",
    "image_only",
    "hover_only",
    "timed_only",
    "visual_only",
    "spatial_only",
)


@dataclass(frozen=True)
class AccessibilityFinding:
    code: str
    severity: str
    path: str
    message: str
    remediation: str

    def to_dict(self) -> dict[str, str]:
        return asdict(self)


@dataclass(frozen=True)
class AccessibilityReport:
    node_id: str
    task_type: str
    findings: tuple[AccessibilityFinding, ...]

    @property
    def passed(self) -> bool:
        return not any(item.severity == "error" for item in self.findings)

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema": INSPECTION_SCHEMA,
            "node_id": self.node_id,
            "task_type": self.task_type,
            "passed": self.passed,
            "findings": [item.to_dict() for item in self.findings],
        }

    def linear(self) -> tuple[str, ...]:
        status = "PASS" if self.passed else "FAIL"
        lines = [f"Accessibility {status}: {self.node_id} ({self.task_type})."]
        if not self.findings:
            lines.append("No blocking accessibility findings.")
        else:
            for item in self.findings:
                lines.append(
                    f"{item.severity.upper()} {item.code} at {item.path}: "
                    f"{item.message} Remediation: {item.remediation}"
                )
        return tuple(lines)


def _text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _sequence(value: Any) -> list[Any]:
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        return list(value)
    return []


def _finding(
    code: str,
    path: str,
    message: str,
    remediation: str,
    *,
    severity: str = "error",
) -> AccessibilityFinding:
    return AccessibilityFinding(code, severity, path, message, remediation)


def _normalize_mode(value: Any) -> str:
    raw = str(value).strip().casefold()
    for char in ("-", " ", "/", "\\", ":", "."):
        raw = raw.replace(char, "_")
    while "__" in raw:
        raw = raw.replace("__", "_")
    return raw


def _explicit_hazards(container: Mapping[str, Any], path: str) -> list[AccessibilityFinding]:
    findings: list[AccessibilityFinding] = []
    for key in sorted(_HAZARD_BOOL_KEYS):
        if container.get(key) is True:
            findings.append(
                _finding(
                    "A11Y_EXPLICIT_VISUAL_OR_POINTER_DEPENDENCY",
                    f"{path}.{key}",
                    f"{key}=true declares an inaccessible answer dependency.",
                    "Provide a keyboard-complete labelled textual equivalent and remove the *-only dependency.",
                )
            )
    for key in sorted(_HAZARD_MODE_KEYS):
        if key not in container:
            continue
        mode = _normalize_mode(container.get(key))
        if any(marker in mode for marker in _HAZARD_MODE_MARKERS):
            findings.append(
                _finding(
                    "A11Y_EXPLICIT_VISUAL_OR_POINTER_DEPENDENCY",
                    f"{path}.{key}",
                    f"{key} declares unsupported inaccessible mode {container.get(key)!r}.",
                    "Use semantic controls with a complete keyboard/nonvisual path.",
                )
            )
    return findings


def _labelled_items(
    value: Any,
    *,
    path: str,
    id_key: str = "id",
    label_key: str = "label",
) -> list[AccessibilityFinding]:
    findings: list[AccessibilityFinding] = []
    items = _sequence(value)
    if not items:
        return [
            _finding(
                "A11Y_SEMANTIC_ITEMS_MISSING",
                path,
                "The semantic answer surface has no labelled items.",
                "Provide at least one stable id + visible text label for every answer-bearing item.",
            )
        ]

    seen_ids: set[str] = set()
    for index, item in enumerate(items):
        item_path = f"{path}[{index}]"
        if not isinstance(item, Mapping):
            findings.append(
                _finding(
                    "A11Y_SEMANTIC_ITEM_INVALID",
                    item_path,
                    "Answer-bearing item is not an object.",
                    f"Use an object containing {id_key!r} and {label_key!r}.",
                )
            )
            continue
        item_id = _text(item.get(id_key))
        label = _text(item.get(label_key))
        if not item_id:
            findings.append(
                _finding(
                    "A11Y_ITEM_ID_MISSING",
                    f"{item_path}.{id_key}",
                    "Semantic control item has no stable id.",
                    "Provide a non-empty stable id.",
                )
            )
        elif item_id in seen_ids:
            findings.append(
                _finding(
                    "A11Y_ITEM_ID_DUPLICATE",
                    f"{item_path}.{id_key}",
                    f"Duplicate semantic item id {item_id!r}.",
                    "Use unique stable ids so labels and submitted values remain deterministic.",
                )
            )
        else:
            seen_ids.add(item_id)
        if not label:
            findings.append(
                _finding(
                    "A11Y_ITEM_LABEL_MISSING",
                    f"{item_path}.{label_key}",
                    "Semantic control item has no text label.",
                    "Provide a non-empty visible label announced by assistive technology.",
                )
            )
    return findings


def _matching_findings(value: Any) -> list[AccessibilityFinding]:
    pairs = _sequence(value)
    if not pairs:
        return [
            _finding(
                "A11Y_MATCHING_PAIRS_MISSING",
                "task.pairs",
                "Matching task has no labelled pair rows.",
                "Provide labelled left rows and labelled right-option controls.",
            )
        ]

    findings: list[AccessibilityFinding] = []
    seen_left: set[str] = set()
    for index, pair in enumerate(pairs):
        path = f"task.pairs[{index}]"
        if not isinstance(pair, Mapping):
            findings.append(
                _finding(
                    "A11Y_MATCHING_PAIR_INVALID",
                    path,
                    "Matching row is not an object.",
                    "Provide left_id, left_label and right_options.",
                )
            )
            continue
        left_id = _text(pair.get("left_id"))
        left_label = _text(pair.get("left_label"))
        if not left_id:
            findings.append(
                _finding(
                    "A11Y_ITEM_ID_MISSING",
                    f"{path}.left_id",
                    "Matching row has no stable left id.",
                    "Provide a non-empty left_id.",
                )
            )
        elif left_id in seen_left:
            findings.append(
                _finding(
                    "A11Y_ITEM_ID_DUPLICATE",
                    f"{path}.left_id",
                    f"Duplicate matching left id {left_id!r}.",
                    "Use one stable id per matching row.",
                )
            )
        else:
            seen_left.add(left_id)
        if not left_label:
            findings.append(
                _finding(
                    "A11Y_ITEM_LABEL_MISSING",
                    f"{path}.left_label",
                    "Matching row has no spoken text label.",
                    "Provide a non-empty left_label.",
                )
            )
        findings.extend(
            _labelled_items(
                pair.get("right_options"),
                path=f"{path}.right_options",
            )
        )
    return findings


def _step_findings(value: Any) -> list[AccessibilityFinding]:
    steps = _sequence(value)
    if not steps:
        return [
            _finding(
                "A11Y_COMPOSITE_STEPS_MISSING",
                "task.steps",
                "Composite task has no linear labelled step sequence.",
                "Provide ordered step objects with step_id and label or prompt.",
            )
        ]

    findings: list[AccessibilityFinding] = []
    seen_ids: set[str] = set()
    for index, step in enumerate(steps):
        path = f"task.steps[{index}]"
        if not isinstance(step, Mapping):
            findings.append(
                _finding(
                    "A11Y_COMPOSITE_STEP_INVALID",
                    path,
                    "Composite step is not an object.",
                    "Provide a step object with step_id and label or prompt.",
                )
            )
            continue
        step_id = _text(step.get("step_id"))
        label = _text(step.get("label")) or _text(step.get("prompt"))
        if not step_id:
            findings.append(
                _finding(
                    "A11Y_ITEM_ID_MISSING",
                    f"{path}.step_id",
                    "Composite step has no stable id.",
                    "Provide a non-empty step_id.",
                )
            )
        elif step_id in seen_ids:
            findings.append(
                _finding(
                    "A11Y_ITEM_ID_DUPLICATE",
                    f"{path}.step_id",
                    f"Duplicate composite step id {step_id!r}.",
                    "Use one stable id per step.",
                )
            )
        else:
            seen_ids.add(step_id)
        if not label:
            findings.append(
                _finding(
                    "A11Y_ITEM_LABEL_MISSING",
                    path,
                    "Composite step has neither a label nor a prompt.",
                    "Provide text that identifies the step and its expected response.",
                )
            )
    return findings


def inspect_renderable_task(task: Mapping[str, Any]) -> AccessibilityReport:
    """Inspect the actual packaged semantic task DTO.

    This is deliberately deterministic and read-only. It does not claim human NVDA
    verification; it blocks surface shapes that violate the project's documented
    keyboard/nonvisual acceptance matrix before they reach that acceptance stage.
    """
    if not isinstance(task, Mapping):
        finding = _finding(
            "A11Y_TASK_SURFACE_INVALID",
            "task",
            "Renderable task is not an object.",
            "Produce a mapping-based semantic task DTO before rendering.",
        )
        return AccessibilityReport("<unknown>", "<invalid>", (finding,))

    node_id = _text(task.get("node_id")) or "<unknown>"
    raw_task_type = _text(task.get("task_type"))
    task_type = canonical_task_type(raw_task_type) if raw_task_type else "<missing>"
    findings: list[AccessibilityFinding] = []

    if task_type not in SUPPORTED_TASK_TYPES:
        findings.append(
            _finding(
                "A11Y_RENDERER_UNSUPPORTED",
                "task.task_type",
                f"No qualified semantic accessibility contract is registered for {task_type!r}.",
                "Add a keyboard-first semantic renderer and inspector contract before publish.",
            )
        )

    for field, label in (
        ("heading", "task heading"),
        ("prompt", "task prompt"),
        ("source_scope", "visible source scope"),
    ):
        if not _text(task.get(field)):
            findings.append(
                _finding(
                    "A11Y_REQUIRED_TEXT_MISSING",
                    f"task.{field}",
                    f"The {label} is empty.",
                    f"Provide non-empty text for {field}.",
                )
            )

    answer_contract = task.get("answer_contract")
    if not isinstance(answer_contract, Mapping):
        findings.append(
            _finding(
                "A11Y_ANSWER_CONTRACT_MISSING",
                "task.answer_contract",
                "Semantic answer contract is missing.",
                f"Attach {ANSWER_CONTRACT_VERSION} for the rendered task type.",
            )
        )
    else:
        declared_type = _text(answer_contract.get("task_type"))
        declared_schema = _text(answer_contract.get("schema"))
        if declared_schema != ANSWER_CONTRACT_VERSION:
            findings.append(
                _finding(
                    "A11Y_ANSWER_CONTRACT_MISMATCH",
                    "task.answer_contract.schema",
                    f"Expected {ANSWER_CONTRACT_VERSION}, got {declared_schema or '<missing>'}.",
                    "Use the same public answer contract as the renderer and grader.",
                )
            )
        if declared_type and canonical_task_type(declared_type) != task_type:
            findings.append(
                _finding(
                    "A11Y_ANSWER_CONTRACT_MISMATCH",
                    "task.answer_contract.task_type",
                    "Answer contract type does not match the rendered task type.",
                    "Bind the answer contract to the exact rendered task type.",
                )
            )

    accessibility = task.get("accessibility")
    if not isinstance(accessibility, Mapping):
        findings.append(
            _finding(
                "A11Y_NONVISUAL_CONTRACT_MISSING",
                "task.accessibility",
                "Renderable task has no accessibility contract.",
                "Attach the canonical nonvisual equivalent and announcement contract.",
            )
        )
        accessibility = {}
    if not _text(accessibility.get("nonvisual_equivalent")):
        findings.append(
            _finding(
                "A11Y_NONVISUAL_CONTRACT_MISSING",
                "task.accessibility.nonvisual_equivalent",
                "Canonical functional nonvisual equivalent is empty.",
                "Author a complete keyboard/nonvisual equivalent; do not use a visual-only placeholder.",
            )
        )
    if not _text(accessibility.get("announcements")):
        findings.append(
            _finding(
                "A11Y_ANNOUNCEMENT_CONTRACT_MISSING",
                "task.accessibility.announcements",
                "Result/evidence/mastery/next-action announcement contract is empty.",
                "Provide explicit screen-reader announcement behavior for feedback and state changes.",
            )
        )

    if task_type in _OPTION_TASK_TYPES:
        findings.extend(_labelled_items(task.get("options"), path="task.options"))
    elif task_type == "ORDERING":
        findings.extend(_labelled_items(task.get("items"), path="task.items"))
    elif task_type == "MATCHING":
        findings.extend(_matching_findings(task.get("pairs")))
    elif task_type in _EVIDENCE_OPTION_TASK_TYPES:
        findings.extend(
            _labelled_items(task.get("evidence_options"), path="task.evidence_options")
        )
    elif task_type == "COMPOSITE_MULTI_STEP":
        findings.extend(_step_findings(task.get("steps")))

    findings.extend(_explicit_hazards(task, "task"))
    visual = task.get("visual")
    if isinstance(visual, Mapping):
        findings.extend(_explicit_hazards(visual, "task.visual"))
        if visual.get("media_slot"):
            media_text = (
                _text(accessibility.get("media_alt"))
                or _text(accessibility.get("text_equivalent"))
                or _text(accessibility.get("linear_equivalent"))
            )
            if not media_text:
                findings.append(
                    _finding(
                        "A11Y_MEDIA_TEXT_EQUIVALENT_MISSING",
                        "task.visual.media_slot",
                        "Answer-bearing media is present without an explicit textual equivalent.",
                        "Provide authored alt/text/linear equivalent that preserves answer-bearing information.",
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
    return AccessibilityReport(node_id, task_type, tuple(findings))
