from __future__ import annotations

import json
from importlib import resources
from typing import Any, Mapping

from .chronology import (
    ChronologyAssertion,
    ChronologyLab,
    TemporalKind,
    TemporalRelation,
)
from .models import Confidence


CHRONOLOGY_PACK_SCHEMA = "scripture.chronology.source-pack.v1"
PA02_PACK_FILENAME = "chronology_pa02_damascus_road_v0_1.json"
PA02_PACK_ID = "CHR-PA02-DAMASCUS-ROAD-0.1"
PA02_UPSTREAM_PATH = "docs/evidence/PA02_DAMASCUS_ROAD_WITNESS_PACK_v0.1.md"
PA02_UPSTREAM_BLOB_SHA = "8ab52fd4c86d6cd4c766769d514ad26d5f599efd"
PA02_UPSTREAM_STATUS = "SOURCE_AUDITED / READY_FOR_CANONICAL_USE"
AUDITOR_ACCEPTED = "AUDITOR_ACCEPTED"
_ALLOWED_AUDIT_STATES = {
    "PENDING_INDEPENDENT_AUDIT",
    "SOURCE_AUDITED",
    AUDITOR_ACCEPTED,
}
_REQUIRED_POLICY_FLAGS = {
    "no_narrative_order_inference",
    "no_cross_witness_harmonization",
    "no_calendar_date_inference",
    "no_mission_or_task_order_inference",
    "production_requires_auditor_acceptance",
}
_ROOT_FIELDS = {
    "schema",
    "pack_id",
    "authoring_status",
    "source_audit_status",
    "upstream_source",
    "normalization_policy",
    "assertions",
}
_UPSTREAM_FIELDS = {"path", "blob_sha", "status"}
_POLICY_FIELDS = {"mode", *_REQUIRED_POLICY_FLAGS}
_ALLOWED_ASSERTION_FIELDS = {
    "assertion_id",
    "event_id",
    "event_label",
    "kind",
    "confidence",
    "source_scope",
    "temporal_label",
    "tx1",
    "witness",
    "passage_ids",
    "evidence_ids",
    "order_start",
    "order_end",
    "order_scale_id",
    "relative_to_event_id",
    "relative_relation",
    "uncertainty",
}
_REQUIRED_ASSERTION_FIELDS = {
    "assertion_id",
    "event_id",
    "event_label",
    "kind",
    "confidence",
    "source_scope",
    "temporal_label",
    "tx1",
    "passage_ids",
    "evidence_ids",
}


def _require_mapping(value: object, label: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise ValueError(f"{label} must be an object")
    return value


def _require_exact_fields(
    value: Mapping[str, Any], expected: set[str], label: str
) -> None:
    actual = set(value)
    unknown = actual - expected
    missing = expected - actual
    if unknown:
        raise ValueError(f"{label} has unsupported fields: {sorted(unknown)}")
    if missing:
        raise ValueError(f"{label} is missing fields: {sorted(missing)}")


def _require_text(value: object, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be a non-empty string")
    if value != value.strip():
        raise ValueError(f"{label} must not contain surrounding whitespace")
    if any(ord(char) < 0x20 or ord(char) == 0x7F for char in value):
        raise ValueError(f"{label} must not contain control characters")
    return value


def _require_string(value: object, label: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{label} must be a string")
    if any(ord(char) < 0x20 or ord(char) == 0x7F for char in value):
        raise ValueError(f"{label} must not contain control characters")
    return value


def _require_bool(value: object, label: str) -> bool:
    if type(value) is not bool:
        raise ValueError(f"{label} must be a boolean")
    return value


def _enum(enum_type, value: object, label: str):
    text = _require_text(value, label)
    try:
        return enum_type(text)
    except ValueError as exc:
        raise ValueError(f"Unsupported {label}: {text}") from exc


def load_pa02_chronology_document() -> dict[str, Any]:
    """Load the one bundled, allowlisted PA-02 chronology data document.

    There is deliberately no caller-controlled path. Content-pack import remains
    a separate security boundary and cannot turn an arbitrary file into trusted
    chronology through this helper.
    """

    package_root = resources.files(__package__)
    raw = package_root.joinpath("data", PA02_PACK_FILENAME).read_text(encoding="utf-8")
    document = json.loads(raw)
    if not isinstance(document, dict):
        raise ValueError("Chronology source pack root must be an object")
    return document


def validate_chronology_source_pack(
    document: Mapping[str, Any],
) -> tuple[ChronologyAssertion, ...]:
    """Validate the fixed PA-02 schema/provenance boundary without granting trust.

    This function proves schema/runtime compatibility and exact provenance pins.
    It never converts caller-owned data into production-trusted chronology.
    """

    root = _require_mapping(document, "chronology source pack")
    _require_exact_fields(root, _ROOT_FIELDS, "chronology source pack")
    if root.get("schema") != CHRONOLOGY_PACK_SCHEMA:
        raise ValueError("Unsupported chronology source-pack schema")
    if root.get("pack_id") != PA02_PACK_ID:
        raise ValueError("Unsupported chronology source-pack id")
    if root.get("authoring_status") != "AUTHORED":
        raise ValueError("chronology source pack must preserve AUTHORED status")

    audit_state = _require_text(root.get("source_audit_status"), "source_audit_status")
    if audit_state not in _ALLOWED_AUDIT_STATES:
        raise ValueError(f"Unsupported source_audit_status: {audit_state}")

    upstream = _require_mapping(root.get("upstream_source"), "upstream_source")
    _require_exact_fields(upstream, _UPSTREAM_FIELDS, "upstream_source")
    if upstream.get("path") != PA02_UPSTREAM_PATH:
        raise ValueError("upstream_source.path does not match pinned PA-02 source")
    if upstream.get("blob_sha") != PA02_UPSTREAM_BLOB_SHA:
        raise ValueError("upstream_source.blob_sha does not match pinned PA-02 source")
    if upstream.get("status") != PA02_UPSTREAM_STATUS:
        raise ValueError("upstream_source.status does not match pinned PA-02 source")

    policy = _require_mapping(root.get("normalization_policy"), "normalization_policy")
    _require_exact_fields(policy, _POLICY_FIELDS, "normalization_policy")
    if policy.get("mode") != "DIRECT_SOURCE_AUDITED_SCOPE_ONLY":
        raise ValueError("chronology pack must use direct source-audited normalization")
    for flag in sorted(_REQUIRED_POLICY_FLAGS):
        if _require_bool(policy.get(flag), f"normalization_policy.{flag}") is not True:
            raise ValueError(f"normalization_policy.{flag} must be true")

    payloads = root.get("assertions")
    if not isinstance(payloads, list) or not payloads:
        raise ValueError("chronology source pack must contain assertions")

    assertions: list[ChronologyAssertion] = []
    for index, raw_item in enumerate(payloads):
        item = _require_mapping(raw_item, f"assertions[{index}]")
        unknown_fields = set(item) - _ALLOWED_ASSERTION_FIELDS
        missing_fields = _REQUIRED_ASSERTION_FIELDS - set(item)
        if unknown_fields:
            raise ValueError(
                f"assertions[{index}] has unsupported fields: {sorted(unknown_fields)}"
            )
        if missing_fields:
            raise ValueError(
                f"assertions[{index}] is missing fields: {sorted(missing_fields)}"
            )

        passage_ids = item.get("passage_ids")
        evidence_ids = item.get("evidence_ids")
        if not isinstance(passage_ids, list) or not isinstance(evidence_ids, list):
            raise ValueError(
                f"assertions[{index}] passage_ids/evidence_ids must be arrays"
            )

        relative_raw = item.get("relative_relation")
        relative_relation = (
            None
            if relative_raw is None
            else _enum(
                TemporalRelation,
                relative_raw,
                f"assertions[{index}].relative_relation",
            )
        )

        assertion = ChronologyAssertion(
            assertion_id=_require_text(
                item.get("assertion_id"), f"assertions[{index}].assertion_id"
            ),
            event_id=_require_text(item.get("event_id"), f"assertions[{index}].event_id"),
            event_label=_require_text(
                item.get("event_label"), f"assertions[{index}].event_label"
            ),
            kind=_enum(TemporalKind, item.get("kind"), f"assertions[{index}].kind"),
            confidence=_enum(
                Confidence,
                item.get("confidence"),
                f"assertions[{index}].confidence",
            ),
            source_scope=_require_text(
                item.get("source_scope"), f"assertions[{index}].source_scope"
            ),
            temporal_label=_require_string(
                item.get("temporal_label"), f"assertions[{index}].temporal_label"
            ),
            tx1=_require_bool(item.get("tx1"), f"assertions[{index}].tx1"),
            witness=item.get("witness"),
            passage_ids=tuple(passage_ids),
            evidence_ids=tuple(evidence_ids),
            order_start=item.get("order_start"),
            order_end=item.get("order_end"),
            order_scale_id=item.get("order_scale_id"),
            relative_to_event_id=item.get("relative_to_event_id"),
            relative_relation=relative_relation,
            uncertainty=item.get("uncertainty"),
        )
        assertions.append(assertion)

    ChronologyLab(assertions)
    return tuple(assertions)


def materialize_audited_chronology() -> ChronologyLab:
    """Create production chronology only from the fixed bundled accepted pack.

    Production trust is intentionally not caller-injectable. Independent audit
    promotion must change the bundled package state on a reviewed repository
    lineage; arbitrary mappings cannot be supplied to this function.
    """

    source = load_pa02_chronology_document()
    if source.get("source_audit_status") != AUDITOR_ACCEPTED:
        raise ValueError(
            "Chronology source pack is not AUDITOR_ACCEPTED; production materialization is blocked"
        )
    return ChronologyLab(validate_chronology_source_pack(source))
