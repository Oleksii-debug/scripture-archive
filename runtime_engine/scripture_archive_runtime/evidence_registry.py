from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping

from .evidence import EvidenceRecord, EvidenceRuntime
from .evidence_materialization import PA02_STRUCTURED_INDEX, load_pa02_structured_evidence
from .models import Confidence


R05_EVIDENCE_INDEX = "R05_EVIDENCE_PROVENANCE_REGISTRY_v0.1_INDEX.json"


@dataclass(frozen=True)
class EvidenceSubjectMetadata:
    """Validated canonical retrieval metadata from the PA-02 technical index."""

    subject_id: str
    kind: str
    display_name: str


@dataclass(frozen=True)
class EvidenceRegistryBundle:
    """Source-safe runtime projection of the checked-in evidence registries.

    R05 free-text provenance remains verbatim and is never parsed into invented
    passage/witness/entity/relation structure. Separately SOURCE_AUDITED PA-02
    records may be materialized only through the pinned explicit technical index.
    ``records`` and ``record_count`` continue to describe the R05 registry itself;
    ``runtime`` and ``node_evidence_ids`` may additionally contain those validated
    structured source records. ``subject_catalog`` preserves only the already-
    authored, validated technical retrieval tuple for each structured subject so
    downstream views can fail closed instead of trusting caller-supplied labels.
    """

    runtime: EvidenceRuntime
    node_evidence_ids: Mapping[str, tuple[str, ...]]
    records: Mapping[str, Mapping[str, Any]]
    subject_catalog: Mapping[str, EvidenceSubjectMetadata]
    registry_version: str
    status: str
    record_count: int


def _require_text(record: Mapping[str, Any], key: str, *, evidence_id: str = "registry") -> str:
    value = record.get(key)
    if not isinstance(value, str) or not value or value != value.strip():
        raise ValueError(f"{evidence_id}.{key} must be a non-empty trimmed string")
    return value


def _require_true_bool(record: Mapping[str, Any], key: str, *, evidence_id: str) -> None:
    """Validate legacy R05 boolean gates without coercing or rewriting them."""

    if record.get(key) is not True:
        raise ValueError(f"{evidence_id}.{key} must be true")


def _load_json_object(path: Path) -> Mapping[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Cannot load evidence registry file {path.name}: {exc}") from exc
    if not isinstance(value, Mapping):
        raise ValueError(f"Evidence registry file {path.name} must contain a JSON object")
    return value


def _load_pa02_subject_catalog(evidence_dir: Path) -> Mapping[str, EvidenceSubjectMetadata]:
    """Preserve validated PA-02 subject tuples without deriving source claims.

    The structured materializer remains the authority for source-pack pins,
    audit status, records and entity membership. This projection reads the same
    technical index only after materialization succeeds and retains its explicit
    subject tuple verbatim for downstream strict identity checks.
    """

    index = _load_json_object(evidence_dir / PA02_STRUCTURED_INDEX)
    raw_subjects = index.get("subjects")
    if not isinstance(raw_subjects, list) or not raw_subjects:
        raise ValueError("structured_subjects must be a non-empty list")

    catalog: dict[str, EvidenceSubjectMetadata] = {}
    for position, raw_subject in enumerate(raw_subjects):
        if not isinstance(raw_subject, Mapping):
            raise ValueError(f"structured_subjects[{position}] must be an object")
        context = f"structured_subjects[{position}]"
        subject_id = _require_text(raw_subject, "subject_id", evidence_id=context)
        kind = _require_text(raw_subject, "kind", evidence_id=context)
        display_name = _require_text(raw_subject, "display_name", evidence_id=context)
        if subject_id in catalog:
            raise ValueError(f"Duplicate structured evidence subject {subject_id}")
        catalog[subject_id] = EvidenceSubjectMetadata(
            subject_id=subject_id,
            kind=kind,
            display_name=display_name,
        )
    return catalog


def load_r05_evidence_registry(repo_root: Path) -> EvidenceRegistryBundle:
    """Load canonical R05 grading evidence plus explicitly audited source structure."""

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

            # These fields remain verbatim R05 grading provenance. Parsing them into
            # source objects would fabricate structure the R05 registry does not encode.
            _require_text(raw_record, "source_scope", evidence_id=evidence_id)
            _require_text(raw_record, "required_evidence", evidence_id=evidence_id)
            _require_text(raw_record, "provenance_status", evidence_id=evidence_id)
            _require_true_bool(raw_record, "nonvisual_access", evidence_id=evidence_id)

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

    structured_records, structured_node_links = load_pa02_structured_evidence(repo_root)
    subject_catalog = _load_pa02_subject_catalog(evidence_dir)
    for evidence_id, record in sorted(structured_records.items()):
        if evidence_id in runtime.evidence:
            raise ValueError(f"Structured evidence collides with R05 evidence id {evidence_id}")
        for subject_id in record.entity_ids:
            if subject_id not in subject_catalog:
                raise ValueError(
                    f"Structured evidence {evidence_id} references uncatalogued subject {subject_id}"
                )
        runtime.add_evidence(record)

    for node_id, evidence_ids in sorted(structured_node_links.items()):
        if node_id not in node_links:
            raise ValueError(
                f"Structured evidence node {node_id} is absent from the canonical R05 node registry"
            )
        destination = node_links[node_id]
        for evidence_id in evidence_ids:
            if evidence_id not in destination:
                destination.append(evidence_id)

    return EvidenceRegistryBundle(
        runtime=runtime,
        node_evidence_ids={
            node_id: tuple(sorted(evidence_ids))
            for node_id, evidence_ids in sorted(node_links.items())
        },
        records=records,
        subject_catalog={
            subject_id: subject_catalog[subject_id]
            for subject_id in sorted(subject_catalog)
        },
        registry_version=registry_version,
        status=status,
        record_count=len(records),
    )
