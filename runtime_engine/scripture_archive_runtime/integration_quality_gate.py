from __future__ import annotations

from typing import Any, Mapping, Sequence

QUALITY_GATE_INPUT_SCHEMA = "R06_INTEGRATION_QUALITY_GATE_INPUT_v1"
QUALITY_GATE_RESULT_SCHEMA = "R06_INTEGRATION_QUALITY_GATE_RESULT_v1"


class IntegrationQualityGateError(ValueError):
    """Raised when the quality-blocker snapshot is malformed or ambiguous."""


def _text(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise IntegrationQualityGateError(f"{label} must be a non-empty string")
    return value.strip()


def evaluate_quality_blockers(payload: Mapping[str, Any]) -> dict[str, Any]:
    """Fail closed on explicitly integration-blocking open QA defects.

    The caller must construct this snapshot from freshly fetched coordinator/QA
    issue state. This function deliberately does not infer whether a defect blocks
    integration from severity or title; `blocks_integration` must be explicit.
    """
    if not isinstance(payload, Mapping):
        raise IntegrationQualityGateError("quality gate payload must be an object")
    if payload.get("schema") != QUALITY_GATE_INPUT_SCHEMA:
        raise IntegrationQualityGateError("unsupported quality gate input schema")

    repository = _text(payload.get("repository"), "repository")
    observed_at = _text(payload.get("observed_at"), "observed_at")
    raw_issues = payload.get("issues")
    if not isinstance(raw_issues, list):
        raise IntegrationQualityGateError("issues must be an array")

    seen: set[int] = set()
    open_blockers: list[dict[str, Any]] = []
    checked: list[dict[str, Any]] = []
    for raw in raw_issues:
        if not isinstance(raw, Mapping):
            raise IntegrationQualityGateError("each issue snapshot must be an object")
        number = raw.get("issue_number")
        if not isinstance(number, int) or number <= 0:
            raise IntegrationQualityGateError("issue_number must be a positive integer")
        if number in seen:
            raise IntegrationQualityGateError(f"duplicate issue snapshot: #{number}")
        seen.add(number)
        state = _text(raw.get("state"), f"issue #{number} state").lower()
        if state not in {"open", "closed"}:
            raise IntegrationQualityGateError(f"issue #{number} state must be open or closed")
        title = _text(raw.get("title"), f"issue #{number} title")
        owner = _text(raw.get("owner_lane"), f"issue #{number} owner_lane")
        if not isinstance(raw.get("blocks_integration"), bool):
            raise IntegrationQualityGateError(f"issue #{number} blocks_integration must be boolean")
        blocks = raw["blocks_integration"]
        item = {
            "issue_number": number,
            "state": state,
            "title": title,
            "owner_lane": owner,
            "blocks_integration": blocks,
        }
        checked.append(item)
        if blocks and state == "open":
            open_blockers.append(item)

    open_blockers.sort(key=lambda item: item["issue_number"])
    checked.sort(key=lambda item: item["issue_number"])
    return {
        "schema": QUALITY_GATE_RESULT_SCHEMA,
        "repository": repository,
        "observed_at": observed_at,
        "ready_for_isolated_candidate": not open_blockers,
        "open_blocker_count": len(open_blockers),
        "open_blockers": open_blockers,
        "checked_issues": checked,
    }
