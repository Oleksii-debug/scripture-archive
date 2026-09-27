from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping

from .evidence import EvidenceRecord, EvidenceRuntime
from .models import Confidence


R05_EVIDENCE_INDEX = "R05_EVIDENCE_PROVENANCE_REGISTRY_v0.1_INDEX.json"


@dataclass(frozen=True)
class EvidenceRegistryBundle:
    """Source-safe runtime projection of the checked-in R05 evidence registry.

    Free-text provenance fields are retained verbatim in ``records`` for display/audit,
    but are deliberately not parsed into passages, witnesses, entities, relations, or
    chronology. ``node_evidence_ids`` is derived only from the registry's explicit
    structured ``node_id`` and ``evidence_record_id`` fields.
    """

    runtime: EvidenceRuntime
    node_evidence_ids: Mapping[str, tuple[str, ...]]
    records: Mapping[str, Mapping[str, Any]]
    registry_version: str
    status: str
    record_count: int


def _require_text(record: Mapping[str, Any], key: str, *, evidence_id: str = "registry") -> str:
    value = record.get(key)
    if not isinstance(value, str) or not value or value != value.strip():
        raise ValueError(f"{evidence_id}.{key} must be a non-empty trimmed string")
    return value


def _require_true(record: Mapping[str, Any], key: str, *, evidence_id: str) -> bool:
    """Require an explicit JSON boolean true without coercing provenance truth."""

    value = record.get(key)
    if value is not True:
        raise ValueError(f"{evidence_id}.{key} must be literal true")
    return True


def _load_json_object(path: Path) -> Mapping[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Cannot load evidence registry file {path.name}: {exc}") from exc
    if not isinstance(value, Mapping):
        raise ValueError(f"Evidence registry file {path.name} must contain a JSON object")
    return value


def load_r05_evidence_registry(repo_root: Path) -> EvidenceRegistryBundle:
    """Load the canonical R05 provenance registry without inventing source structure."""

    repo_root = Path(repo_root).resolve()
    evidence_dir = (repo_root / "docs" / "evidence").resolve()
    index_path = evidence_dir / R05_EVIDENCE_INDEX
    index = _load_json_object(index_path)

    registry_version = _require_text(index, "registry_version")
    if registry_version != "v0.1" or _require_text(index, "round") != "R05":
        raise ValueError("Unsupported evidence registry identity")
    status = _require_text(index, "status")
    if "INDEPENDENT_AUDIT_PENDING" not in status:
        raise ValueError("R05 registry status must preserve its explicit independent-audit gate")

    expected_count = index.get("record_count")
    if not isinstance(expected_count, int) or isinstance(expected_count, bool) or expected_count < 0:
        raise ValueError("registry.record_count must be a non-negative integer")
    part_files = index.get("part_files")
    if not isinstance(part_files, list) or not part_files:
        raise ValueError("registry.part_files must be a non-empty list")

    runtime = EvidenceRuntime()
    records: dict[str, Mapping[str, Any]] = {}
    node_links: dict[str, list[str]] = {}

    for raw_name in part_files:
        if not isinstance(raw_name, str) or not raw_name or Path(raw_name).name != raw_name or "/" in raw_name or "\\" in raw_name:
            raise ValueError("registry part_files must contain local basenames only")
        part_path = (evidence_dir / raw_name).resolve()
        if part_path.parent != evidence_dir:
            raise ValueError("Evidence registry part escaped evidence directory")
        part = _load_json_object(part_path)
        raw_records = part.get("records")
        if not isinstance(raw_records, list):
            raise ValueError(f"Evidence registry part {raw_name} must contain a records list")

        for raw_record in raw_records:
            if not isinstance(raw_record, Mapping):
                raise ValueError(f"Evidence registry part {raw_name} contains a non-object record")
            evidence_id = _require_text(raw_record, "evidence_record_id")
            if evidence_id in records:
                raise ValueError(f"Duplicate evidence_record_id {evidence_id}")
            node_id = _require_text(raw_record, "node_id", evidence_id=evidence_id)
            proposition = _require_text(raw_record, "claim", evidence_id=evidence_id)
            confidence_text = _require_text(raw_record, "confidence_code", evidence_id=evidence_id)
            try:
                confidence = Confidence(confidence_text)
            except ValueError as exc:
                raise ValueError(f"{evidence_id}.confidence_code is unsupported: {confidence_text}") from exc
            tx_flag = _require_text(raw_record, "textual_variant_flag", evidence_id=evidence_id)
            if tx_flag not in {"none", "TX1"}:
                raise ValueError(f"{evidence_id}.textual_variant_flag must be none or TX1")

            # These fields are required provenance truth, but remain verbatim. Parsing
            # them into witness/passage/relation objects would fabricate structure that the
            # registry does not explicitly encode. ``nonvisual_access`` is the registry's
            # explicit boolean accessibility gate, not free text, and must never be coerced
            # into invented descriptive prose.
            _require_text(raw_record, "source_scope", evidence_id=evidence_id)
            _require_text(raw_record, "required_evidence", evidence_id=evidence_id)
            _require_text(raw_record, "provenance_status", evidence_id=evidence_id)
            _require_true(raw_record, "nonvisual_access", evidence_id=evidence_id)

            runtime.add_evidence(
                EvidenceRecord(
                    evidence_id=evidence_id,
                    passage_refs=(),
                    proposition=proposition,
                    confidence=confidence,
                    tx1=tx_flag == "TX1",
                )
            )
            records[evidence_id] = dict(raw_record)
            node_links.setdefault(node_id, []).append(evidence_id)

    if len(records) != expected_count:
        raise ValueError(
            f"Evidence registry count mismatch: index={expected_count}, loaded={len(records)}"
        )

    return EvidenceRegistryBundle(
        runtime=runtime,
        node_evidence_ids={
            node_id: tuple(sorted(evidence_ids))
            for node_id, evidence_ids in sorted(node_links.items())
        },
        records=records,
        registry_version=registry_version,
        status=status,
        record_count=len(records),
    )
