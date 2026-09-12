from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any, Mapping

from .evidence import EvidenceRecord, PassageRef
from .models import Confidence


PA02_STRUCTURED_INDEX = "R06_PA02_STRUCTURED_EVIDENCE_INDEX_v0.1.json"
_SOURCE_RECORD_HEADING = re.compile(r"^### (EV-PA-\d{4})$")
_SOURCE_FIELD = re.compile(r"^- `([a-z0-9_]+)`: (.*)$")


def _load_json_object(path: Path) -> Mapping[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Cannot load structured evidence index {path.name}: {exc}") from exc
    if not isinstance(value, Mapping):
        raise ValueError(f"Structured evidence index {path.name} must contain a JSON object")
    return value


def _require_text(record: Mapping[str, Any], key: str, *, context: str) -> str:
    value = record.get(key)
    if not isinstance(value, str) or not value or value != value.strip():
        raise ValueError(f"{context}.{key} must be a non-empty trimmed string")
    return value


def _git_blob_sha1(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


def _matches_pinned_git_blob(source_bytes: bytes, expected_blob: str) -> bool:
    """Match repository blob identity across Git's ordinary text checkout forms.

    The pin names the canonical Git blob, whose checked-in Markdown uses LF. A
    Windows checkout may expose the same tracked text as CRLF. Accept that one
    representation-only transform, but no whitespace/content/Unicode rewriting.
    """

    if _git_blob_sha1(source_bytes) == expected_blob:
        return True
    if b"\r\n" not in source_bytes:
        return False
    return _git_blob_sha1(source_bytes.replace(b"\r\n", b"\n")) == expected_blob


def _parse_source_pack(path: Path) -> Mapping[str, Mapping[str, str]]:
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise ValueError(f"Cannot load source-audited evidence pack {path.name}: {exc}") from exc

    records: dict[str, dict[str, str]] = {}
    current: dict[str, str] | None = None
    current_id: str | None = None
    for raw_line in text.splitlines():
        heading = _SOURCE_RECORD_HEADING.match(raw_line)
        if heading:
            current_id = heading.group(1)
            if current_id in records:
                raise ValueError(f"Duplicate source evidence record {current_id}")
            current = {}
            records[current_id] = current
            continue
        if current is None:
            continue
        match = _SOURCE_FIELD.match(raw_line)
        if match:
            key, value = match.groups()
            if key in current:
                raise ValueError(f"Duplicate {current_id}.{key} in source pack")
            current[key] = value.strip()
    return records


def _require_positive_int(value: Any, *, context: str) -> int:
    if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
        raise ValueError(f"{context} must be a positive integer")
    return value


def load_pa02_structured_evidence(
    repo_root: Path,
) -> tuple[Mapping[str, EvidenceRecord], Mapping[str, tuple[str, ...]]]:
    """Materialize explicit audited PA-02 source records without semantic inference.

    Claims/confidence/TX status remain owned by the SOURCE_AUDITED Markdown pack.
    The JSON index contains only technical runtime structure: passage coordinates,
    source-local witness tokens, retrieval entity ids, and explicit node unlock links.
    Repository blob drift fails closed; ordinary CRLF checkout representation is
    reduced only to LF for comparison with the pinned Git blob identity.
    """

    repo_root = Path(repo_root).resolve()
    evidence_dir = (repo_root / "docs" / "evidence").resolve()
    index_path = evidence_dir / PA02_STRUCTURED_INDEX
    index = _load_json_object(index_path)

    if _require_text(index, "schema", context="index") != "scripture.evidence.materialization-index.v1":
        raise ValueError("Unsupported structured evidence index schema")
    status = _require_text(index, "status", context="index")
    if "SOURCE_TRUTH_UNCHANGED" not in status or "DIFFERENT_WORKER_QA_REQUIRED" not in status:
        raise ValueError("Structured evidence index must preserve its source-truth and QA gates")

    raw_source_path = _require_text(index, "source_pack", context="index")
    source_relative = Path(raw_source_path)
    if source_relative.is_absolute() or ".." in source_relative.parts:
        raise ValueError("Structured evidence source_pack must stay inside the repository")
    source_path = (repo_root / source_relative).resolve()
    if source_path.parent != evidence_dir:
        raise ValueError("Structured evidence source_pack must live in docs/evidence")

    try:
        source_bytes = source_path.read_bytes()
    except OSError as exc:
        raise ValueError(f"Cannot load source-audited evidence pack {source_path.name}: {exc}") from exc
    expected_blob = _require_text(index, "source_pack_git_blob_sha1", context="index")
    actual_blob = _git_blob_sha1(source_bytes)
    if not _matches_pinned_git_blob(source_bytes, expected_blob):
        raise ValueError(
            f"Source evidence pack drifted: expected Git blob {expected_blob}, got {actual_blob}"
        )

    required_status = _require_text(index, "source_pack_required_status", context="index")
    if required_status != "SOURCE_AUDITED":
        raise ValueError("Only SOURCE_AUDITED structured evidence may be materialized")
    source_records = _parse_source_pack(source_path)

    witness_tokens_raw = index.get("witness_tokens")
    if not isinstance(witness_tokens_raw, list) or not witness_tokens_raw:
        raise ValueError("index.witness_tokens must be a non-empty list")
    witness_tokens: set[str] = set()
    for token in witness_tokens_raw:
        if not isinstance(token, str) or not token or token != token.strip():
            raise ValueError("index.witness_tokens must contain trimmed non-empty strings")
        if token in witness_tokens:
            raise ValueError(f"Duplicate witness token {token}")
        witness_tokens.add(token)

    raw_subjects = index.get("subjects")
    if not isinstance(raw_subjects, list) or not raw_subjects:
        raise ValueError("index.subjects must be a non-empty list")
    subject_ids: set[str] = set()
    for position, subject in enumerate(raw_subjects):
        if not isinstance(subject, Mapping):
            raise ValueError(f"index.subjects[{position}] must be an object")
        context = f"index.subjects[{position}]"
        subject_id = _require_text(subject, "subject_id", context=context)
        _require_text(subject, "kind", context=context)
        _require_text(subject, "display_name", context=context)
        if subject_id in subject_ids:
            raise ValueError(f"Duplicate structured evidence subject {subject_id}")
        subject_ids.add(subject_id)

    raw_records = index.get("records")
    if not isinstance(raw_records, list) or not raw_records:
        raise ValueError("index.records must be a non-empty list")

    records: dict[str, EvidenceRecord] = {}
    for raw in raw_records:
        if not isinstance(raw, Mapping):
            raise ValueError("index.records must contain objects")
        evidence_id = _require_text(raw, "evidence_id", context="record")
        if evidence_id in records:
            raise ValueError(f"Duplicate structured evidence id {evidence_id}")

        source = source_records.get(evidence_id)
        if source is None:
            raise ValueError(f"{evidence_id} is absent from the pinned source pack")
        if source.get("source_audit_status") != required_status:
            raise ValueError(f"{evidence_id} is not {required_status}")
        proposition = source.get("claim")
        if not proposition:
            raise ValueError(f"{evidence_id}.claim is missing from the source pack")
        try:
            confidence = Confidence(source.get("confidence_code", ""))
        except ValueError as exc:
            raise ValueError(f"{evidence_id}.confidence_code is unsupported") from exc
        tx_flag = source.get("textual_variant_flag")
        if tx_flag != "none":
            raise ValueError(
                f"{evidence_id}.textual_variant_flag={tx_flag!r} is not explicitly safe for this v0.1 materializer"
            )

        raw_witness = raw.get("witness")
        if raw_witness is not None and raw_witness not in witness_tokens:
            raise ValueError(f"{evidence_id}.witness is not an allowlisted source-local token")

        raw_passages = raw.get("passages")
        if not isinstance(raw_passages, list) or not raw_passages:
            raise ValueError(f"{evidence_id}.passages must be a non-empty list")
        passages: list[PassageRef] = []
        for position, passage in enumerate(raw_passages):
            if not isinstance(passage, Mapping):
                raise ValueError(f"{evidence_id}.passages[{position}] must be an object")
            context = f"{evidence_id}.passages[{position}]"
            passage_id = _require_text(passage, "passage_id", context=context)
            book = _require_text(passage, "book", context=context)
            chapter = _require_positive_int(passage.get("chapter"), context=f"{context}.chapter")
            verse_start = _require_positive_int(
                passage.get("verse_start"), context=f"{context}.verse_start"
            )
            verse_end_raw = passage.get("verse_end")
            verse_end = None
            if verse_end_raw is not None:
                verse_end = _require_positive_int(verse_end_raw, context=f"{context}.verse_end")
                if verse_end < verse_start:
                    raise ValueError(f"{context}.verse_end precedes verse_start")
            passage_witness = _require_text(passage, "witness", context=context)
            if passage_witness not in witness_tokens:
                raise ValueError(f"{context}.witness is not an allowlisted source-local token")
            passages.append(
                PassageRef(
                    passage_id=passage_id,
                    book=book,
                    chapter=chapter,
                    verse_start=verse_start,
                    verse_end=verse_end,
                    witness=passage_witness,
                )
            )

        if raw_witness is not None and any(
            passage.witness != raw_witness for passage in passages
        ):
            raise ValueError(f"{evidence_id} mixes passage witnesses under a single record witness")

        raw_entities = raw.get("entity_ids")
        if not isinstance(raw_entities, list) or not raw_entities:
            raise ValueError(f"{evidence_id}.entity_ids must be a non-empty list")
        entity_ids: list[str] = []
        for entity_id in raw_entities:
            if not isinstance(entity_id, str) or not entity_id or entity_id != entity_id.strip():
                raise ValueError(f"{evidence_id}.entity_ids must be trimmed non-empty strings")
            if entity_id not in subject_ids:
                raise ValueError(f"{evidence_id} references unknown structured subject {entity_id}")
            if entity_id in entity_ids:
                raise ValueError(f"{evidence_id} contains duplicate entity id {entity_id}")
            entity_ids.append(entity_id)

        records[evidence_id] = EvidenceRecord(
            evidence_id=evidence_id,
            passage_refs=tuple(passages),
            proposition=proposition,
            confidence=confidence,
            tx1=False,
            witness=raw_witness,
            entity_ids=tuple(entity_ids),
            relation_ids=(),
        )

    raw_node_links = index.get("node_links")
    if not isinstance(raw_node_links, Mapping):
        raise ValueError("index.node_links must be an object")
    node_links: dict[str, tuple[str, ...]] = {}
    for node_id, raw_ids in raw_node_links.items():
        if not isinstance(node_id, str) or not node_id or node_id != node_id.strip():
            raise ValueError("index.node_links keys must be trimmed node ids")
        if not isinstance(raw_ids, list) or not raw_ids:
            raise ValueError(f"index.node_links.{node_id} must be a non-empty list")
        ids: list[str] = []
        for evidence_id in raw_ids:
            if not isinstance(evidence_id, str) or evidence_id not in records:
                raise ValueError(f"{node_id} references unknown structured evidence {evidence_id!r}")
            if evidence_id in ids:
                raise ValueError(f"{node_id} repeats structured evidence {evidence_id}")
            ids.append(evidence_id)
        node_links[node_id] = tuple(ids)

    return records, node_links
