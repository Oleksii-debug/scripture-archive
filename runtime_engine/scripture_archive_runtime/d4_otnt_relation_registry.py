from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
from pathlib import Path
import re
from typing import Any, Mapping

from .evidence import EvidenceRecord, EvidenceRuntime, PassageRef, Relation
from .models import Confidence


MANIFEST_PATH = Path("docs/evidence/D4_OTNT_INDEPENDENT_AUDIT_MANIFEST_v1.json")
RELATION_DIR = Path("docs/campaigns/OT/R06_D4_STAGE05_READABLE/relations")
EXPECTED_SOURCE_HEAD = "ab2ad3719781a4855a8040516bd86663e6a64d6c"
EXPECTED_AUDIT_COMMENT_ID = 5647653309
EXPECTED_RELATION_IDS = frozenset(f"REL-OTNT-D4-{index:04d}" for index in range(1, 25))
EXPECTED_REPAIR_REQUIRED = frozenset({"REL-OTNT-D4-0005", "REL-OTNT-D4-0006"})
EXPECTED_ACCEPTED = EXPECTED_RELATION_IDS - EXPECTED_REPAIR_REQUIRED
EXPECTED_SOURCE_STATUS = "DEVELOPER_SOURCE_AUDITED / INDEPENDENT_AUDIT_PENDING"
EXPECTED_FILE_BLOBS = {
    "relations_001_012.jsonl": "97d97fc9408f2874a29ce53375a3b12cd8cccd6e",
    "relations_013_024.jsonl": "dbc3a99ca26a51196582ee3fa191f80f370d1635",
}

_REFERENCE_RE = re.compile(r"^(?P<book>.+) (?P<chapter>[1-9][0-9]*):(?P<verses>.+)$")
_RANGE_RE = re.compile(r"^(?P<start>[1-9][0-9]*)(?:[–-](?P<end>[1-9][0-9]*))?$")
_MAX_RECORDS = 64
_MAX_LINE_BYTES = 16384


@dataclass(frozen=True)
class D4OTNTRelationBundle:
    runtime: EvidenceRuntime
    metadata: Mapping[str, Mapping[str, Any]]
    source_head: str
    audit_comment_id: int
    accepted_relation_ids: tuple[str, ...]
    repair_required_relation_ids: tuple[str, ...]


@dataclass(frozen=True)
class D4OTNTMaterializationResult:
    evidence_added: int
    relations_added: int
    evidence_unlocked: int


def _git_blob_sha(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


def _read_json(path: Path) -> Mapping[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Cannot load D4 OT↔NT manifest {path}: {exc}") from exc
    if not isinstance(value, Mapping):
        raise ValueError("D4 OT↔NT manifest must be an object")
    return value


def _require_text(value: object, field: str) -> str:
    if not isinstance(value, str) or not value or value != value.strip():
        raise ValueError(f"{field} must be non-empty trimmed text")
    if len(value) > 4096:
        raise ValueError(f"{field} exceeds maximum length")
    if any(ord(ch) < 0x20 and ch not in {"\t"} for ch in value):
        raise ValueError(f"{field} contains control text")
    return value


def _require_https(value: object, field: str) -> str:
    text = _require_text(value, field)
    if not text.startswith("https://"):
        raise ValueError(f"{field} must use https")
    return text


def _text_set(value: object, field: str) -> frozenset[str]:
    if not isinstance(value, list):
        raise ValueError(f"{field} must be a list")
    items = [_require_text(item, f"{field}[]") for item in value]
    if len(items) != len(set(items)):
        raise ValueError(f"{field} contains duplicates")
    return frozenset(items)


def _load_manifest(repo_root: Path) -> tuple[Mapping[str, Any], frozenset[str], frozenset[str]]:
    manifest = _read_json(repo_root / MANIFEST_PATH)
    if manifest.get("schema_version") != "scripture.evidence.d4-otnt-independent-audit.v1":
        raise ValueError("Unsupported D4 OT↔NT audit manifest schema")
    if manifest.get("source_head") != EXPECTED_SOURCE_HEAD:
        raise ValueError("D4 OT↔NT audit manifest source_head drift")

    audit = manifest.get("independent_audit")
    if not isinstance(audit, Mapping):
        raise ValueError("independent_audit must be an object")
    if audit.get("coordination_issue") != 78 or audit.get("comment_id") != EXPECTED_AUDIT_COMMENT_ID:
        raise ValueError("D4 OT↔NT audit manifest is not bound to the accepted independent verdict")
    verdict = _require_text(audit.get("verdict"), "independent_audit.verdict")
    if "22_OF_24_INDEPENDENTLY_SOURCE_ACCEPTED" not in verdict:
        raise ValueError("D4 OT↔NT audit verdict does not authorize the accepted set")

    accepted = _text_set(manifest.get("accepted_relation_ids"), "accepted_relation_ids")
    if accepted != EXPECTED_ACCEPTED:
        raise ValueError("D4 OT↔NT accepted relation set drift")

    repair_raw = manifest.get("repair_required")
    if not isinstance(repair_raw, Mapping):
        raise ValueError("repair_required must be an object")
    repair = frozenset(_require_text(key, "repair_required key") for key in repair_raw)
    if repair != EXPECTED_REPAIR_REQUIRED:
        raise ValueError("D4 OT↔NT repair-required relation set drift")
    for relation_id, reason in repair_raw.items():
        _require_text(reason, f"repair_required.{relation_id}")

    file_rows = manifest.get("source_relation_files")
    if not isinstance(file_rows, list) or len(file_rows) != 2:
        raise ValueError("source_relation_files must contain exactly two audited shards")
    declared: dict[str, str] = {}
    for row in file_rows:
        if not isinstance(row, Mapping):
            raise ValueError("source_relation_files entries must be objects")
        path_text = _require_text(row.get("path"), "source_relation_files.path")
        path = Path(path_text)
        if path.is_absolute() or ".." in path.parts or path.parent != RELATION_DIR:
            raise ValueError("D4 OT↔NT source file path escaped canonical relation directory")
        declared[path.name] = _require_text(row.get("git_blob_sha"), "source_relation_files.git_blob_sha")
    if declared != EXPECTED_FILE_BLOBS:
        raise ValueError("D4 OT↔NT source blob declaration drift")

    if accepted & repair or accepted | repair != EXPECTED_RELATION_IDS:
        raise ValueError("D4 OT↔NT audit partition is not exactly 24/24")
    return manifest, accepted, repair


def _load_relation_records(repo_root: Path) -> dict[str, Mapping[str, Any]]:
    records: dict[str, Mapping[str, Any]] = {}
    for filename, expected_blob in EXPECTED_FILE_BLOBS.items():
        path = repo_root / RELATION_DIR / filename
        try:
            data = path.read_bytes()
        except OSError as exc:
            raise ValueError(f"Cannot load D4 OT↔NT relation shard {filename}: {exc}") from exc
        if _git_blob_sha(data) != expected_blob:
            raise ValueError(f"D4 OT↔NT audited source blob mismatch: {filename}")
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise ValueError(f"D4 OT↔NT relation shard is not UTF-8: {filename}") from exc
        lines = text.splitlines()
        if len(lines) > _MAX_RECORDS:
            raise ValueError(f"D4 OT↔NT shard {filename} exceeds record bound")
        for line_number, line in enumerate(lines, 1):
            if not line.strip():
                continue
            if len(line.encode("utf-8")) > _MAX_LINE_BYTES:
                raise ValueError(f"D4 OT↔NT record exceeds line bound: {filename}:{line_number}")
            try:
                value = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid D4 OT↔NT JSONL at {filename}:{line_number}") from exc
            if not isinstance(value, Mapping):
                raise ValueError(f"D4 OT↔NT record must be an object: {filename}:{line_number}")
            relation_id = _require_text(value.get("relation_id"), "relation_id")
            if relation_id in records:
                raise ValueError(f"Duplicate D4 OT↔NT relation_id {relation_id}")
            records[relation_id] = value
    if frozenset(records) != EXPECTED_RELATION_IDS:
        raise ValueError("D4 OT↔NT source shards must contain the exact 24 canonical relations")
    return records


def _parse_passage(reference: str, *, relation_id: str, side: str) -> PassageRef:
    match = _REFERENCE_RE.fullmatch(reference)
    if not match:
        raise ValueError(f"{relation_id}.{side}_passage has unsupported authored reference syntax")
    book = match.group("book")
    chapter = int(match.group("chapter"))
    verse_parts = match.group("verses").split(",")
    segments: list[tuple[int, int]] = []
    for raw_part in verse_parts:
        part = raw_part.strip()
        segment = _RANGE_RE.fullmatch(part)
        if not segment:
            raise ValueError(f"{relation_id}.{side}_passage has unsupported verse segment {part!r}")
        start = int(segment.group("start"))
        end = int(segment.group("end") or start)
        if end < start:
            raise ValueError(f"{relation_id}.{side}_passage has descending verse range")
        segments.append((start, end))
    # PassageRef's legacy numeric fields can encode exactly one contiguous span.
    # For discontiguous authored references we keep only the first segment as a
    # numeric anchor and preserve the full authored reference verbatim in both
    # `reference` and passage_id. We never invent a continuous 7-13 style range.
    first_start, first_end = segments[0]
    contiguous = len(segments) == 1
    verse_end = first_end if contiguous and first_end != first_start else None
    return PassageRef(
        passage_id=f"{relation_id}:{side.upper()}:{reference}",
        book=book,
        chapter=chapter,
        verse_start=first_start,
        verse_end=verse_end,
        witness=None,
        reference=reference,
    )


def _validated_runtime_record(record: Mapping[str, Any]) -> tuple[EvidenceRecord, Relation, Mapping[str, Any]]:
    relation_id = _require_text(record.get("relation_id"), "relation_id")
    category = _require_text(record.get("relation_category"), f"{relation_id}.relation_category")
    confidence_text = _require_text(record.get("confidence_code"), f"{relation_id}.confidence_code")
    try:
        confidence = Confidence(confidence_text)
    except ValueError as exc:
        raise ValueError(f"{relation_id} has unsupported confidence_code") from exc
    if confidence is Confidence.T1:
        raise ValueError(f"{relation_id} illegally promotes OT↔NT relation truth to T1")

    source_status = _require_text(record.get("source_audit_status"), f"{relation_id}.source_audit_status")
    if source_status != EXPECTED_SOURCE_STATUS:
        raise ValueError(f"{relation_id} source_audit_status changed inside authored source")

    accepted_answer = _require_text(record.get("accepted_answer"), f"{relation_id}.accepted_answer")
    explicit_wording = _require_text(record.get("explicit_wording"), f"{relation_id}.explicit_wording")
    boundary = _require_text(record.get("interpretive_boundary"), f"{relation_id}.interpretive_boundary")
    rejected = _require_text(record.get("rejected_overclaim"), f"{relation_id}.rejected_overclaim")
    disputed_note = _require_text(record.get("disputed_note"), f"{relation_id}.disputed_note")
    nonvisual = _require_text(record.get("nonvisual_equivalent"), f"{relation_id}.nonvisual_equivalent")
    if not accepted_answer.startswith(f"{category}:"):
        raise ValueError(f"{relation_id} accepted_answer no longer preserves relation category")

    tx_flag = _require_text(record.get("textual_variant_flag"), f"{relation_id}.textual_variant_flag")
    if tx_flag not in {"none", "TX1"}:
        raise ValueError(f"{relation_id} has unsupported textual_variant_flag")
    tx1 = tx_flag == "TX1"

    ot_reference = _require_text(record.get("ot_passage"), f"{relation_id}.ot_passage")
    nt_reference = _require_text(record.get("nt_passage"), f"{relation_id}.nt_passage")
    ot_url = _require_https(record.get("ot_source_locator"), f"{relation_id}.ot_source_locator")
    nt_url = _require_https(record.get("nt_source_locator"), f"{relation_id}.nt_source_locator")
    ot = _parse_passage(ot_reference, relation_id=relation_id, side="ot")
    nt = _parse_passage(nt_reference, relation_id=relation_id, side="nt")

    evidence_id = f"EV-{relation_id}"
    evidence = EvidenceRecord(
        evidence_id=evidence_id,
        passage_refs=(ot, nt),
        proposition=accepted_answer,
        confidence=confidence,
        tx1=tx1,
        witness=None,
        relation_ids=(relation_id,),
    )
    relation = Relation(
        relation_id=relation_id,
        source_id=ot.passage_id,
        relation_type=category,
        target_id=nt.passage_id,
        witness=None,
        passage_ids=(ot.passage_id, nt.passage_id),
    )
    metadata = {
        "accepted_answer": accepted_answer,
        "explicit_wording": explicit_wording,
        "interpretive_boundary": boundary,
        "rejected_overclaim": rejected,
        "disputed_note": disputed_note,
        "nonvisual_equivalent": nonvisual,
        "confidence_code": confidence.value,
        "tx1": tx1,
        "ot_reference": ot_reference,
        "nt_reference": nt_reference,
        "ot_source_locator": ot_url,
        "nt_source_locator": nt_url,
    }
    return evidence, relation, metadata


def load_independently_audited_d4_otnt(repo_root: Path) -> D4OTNTRelationBundle:
    """Load only the exact D4 relation records accepted by independent W2-17 audit.

    Authored source shards remain byte-identical and retain their historical
    `INDEPENDENT_AUDIT_PENDING` field. Independent acceptance is a separate
    manifest bound to exact Git blob IDs and Issue #78 audit comment 5647653309.
    This prevents self-promotion inside the authored content and makes records
    0005/0006 fail closed until a later re-audit explicitly supersedes the gate.
    """
    repo_root = Path(repo_root).resolve()
    _, accepted, repair = _load_manifest(repo_root)
    records = _load_relation_records(repo_root)

    runtime = EvidenceRuntime()
    metadata: dict[str, Mapping[str, Any]] = {}
    for relation_id in sorted(accepted):
        evidence, relation, relation_metadata = _validated_runtime_record(records[relation_id])
        runtime.add_evidence(evidence)
        runtime.add_relation(relation)
        runtime.unlock(evidence.evidence_id)
        metadata[relation_id] = relation_metadata

    if len(runtime.evidence) != 22 or len(runtime.relations) != 22 or len(runtime.unlocked) != 22:
        raise ValueError("D4 OT↔NT audited runtime must materialize exactly 22 accepted relations")
    if set(runtime.relations) & set(repair):
        raise ValueError("Repair-required D4 OT↔NT relation entered audited runtime")
    return D4OTNTRelationBundle(
        runtime=runtime,
        metadata=metadata,
        source_head=EXPECTED_SOURCE_HEAD,
        audit_comment_id=EXPECTED_AUDIT_COMMENT_ID,
        accepted_relation_ids=tuple(sorted(accepted)),
        repair_required_relation_ids=tuple(sorted(repair)),
    )


def materialize_independently_audited_d4_otnt(
    target: EvidenceRuntime,
    bundle: D4OTNTRelationBundle,
) -> D4OTNTMaterializationResult:
    """Atomically preflight then add the accepted D4 OT↔NT projection to a runtime."""
    if not isinstance(target, EvidenceRuntime):
        raise TypeError("target must be EvidenceRuntime")
    if not isinstance(bundle, D4OTNTRelationBundle):
        raise TypeError("bundle must be D4OTNTRelationBundle")

    evidence_collisions = set(target.evidence) & set(bundle.runtime.evidence)
    relation_collisions = set(target.relations) & set(bundle.runtime.relations)
    if evidence_collisions:
        raise ValueError(f"D4 OT↔NT evidence ID collision: {sorted(evidence_collisions)!r}")
    if relation_collisions:
        raise ValueError(f"D4 OT↔NT relation ID collision: {sorted(relation_collisions)!r}")

    for evidence_id in sorted(bundle.runtime.evidence):
        target.add_evidence(bundle.runtime.evidence[evidence_id])
    for relation_id in sorted(bundle.runtime.relations):
        target.add_relation(bundle.runtime.relations[relation_id])
    for evidence_id in sorted(bundle.runtime.unlocked):
        target.unlock(evidence_id)
    return D4OTNTMaterializationResult(
        evidence_added=len(bundle.runtime.evidence),
        relations_added=len(bundle.runtime.relations),
        evidence_unlocked=len(bundle.runtime.unlocked),
    )


__all__ = [
    "D4OTNTRelationBundle",
    "D4OTNTMaterializationResult",
    "load_independently_audited_d4_otnt",
    "materialize_independently_audited_d4_otnt",
]
