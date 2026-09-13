from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
from pathlib import Path
from typing import Any, Mapping

from .evidence import EvidenceRecord, EvidenceRuntime, PassageRef, Relation
from .models import Confidence


PACK_FILENAME = "OTNT_RELATION_PACK_v0.1.json"
SCHEMA_VERSION = "scripture.evidence.otnt-relation-pack.v1"
PACK_ID = "OTNT_WEBU_PRIMARY_v0.1"
PENDING_STATUS = "AUTHOR_COMPLETE_PENDING_INDEPENDENT_SOURCE_AUDIT"
SOURCE_AUDITED_STATUS = "SOURCE_AUDITED"
PENDING_AUDIT_STATE = "PENDING_INDEPENDENT_SOURCE_AUDIT"
SOURCE_AUDITED_STATE = "SOURCE_AUDITED"
RUNTIME_VISIBILITY = "GLOBAL_RESEARCH_UNLOCKED_AFTER_SOURCE_AUDIT"

_MAX_TEXT = 2048
_MAX_ITEMS = 512


@dataclass(frozen=True)
class OTNTRelationPack:
    runtime: EvidenceRuntime
    status: str
    audit_state: str
    pack_id: str
    version: str
    book_testaments: Mapping[str, str]
    source_edition: Mapping[str, str]
    relation_metadata: Mapping[str, Mapping[str, Any]]

    @property
    def source_audited(self) -> bool:
        return self.status == SOURCE_AUDITED_STATUS and self.audit_state == SOURCE_AUDITED_STATE


@dataclass(frozen=True)
class OTNTMaterializationResult:
    evidence_added: int
    relations_added: int
    evidence_unlocked: int
    source_audited: bool


def _contains_forbidden_control(value: str) -> bool:
    return any(
        ord(character) < 0x20
        or 0x7F <= ord(character) <= 0x9F
        or character in {"\u2028", "\u2029"}
        for character in value
    )


def _require_text(
    value: object,
    field: str,
    *,
    maximum: int = _MAX_TEXT,
) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{field} must be a string")
    if not value or value != value.strip():
        raise ValueError(f"{field} must be a non-empty trimmed string")
    if len(value) > maximum:
        raise ValueError(f"{field} exceeds maximum length {maximum}")
    if _contains_forbidden_control(value):
        raise ValueError(f"{field} contains forbidden control text")
    return value


def _optional_text(value: object, field: str) -> str | None:
    if value is None:
        return None
    return _require_text(value, field)


def _require_object(value: object, field: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise ValueError(f"{field} must be an object")
    return value


def _require_list(value: object, field: str) -> list[Any]:
    if not isinstance(value, list):
        raise ValueError(f"{field} must be a list")
    if len(value) > _MAX_ITEMS:
        raise ValueError(f"{field} exceeds maximum item count {_MAX_ITEMS}")
    return value


def _positive_int(value: object, field: str) -> int:
    if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
        raise ValueError(f"{field} must be a positive integer")
    return value


def _require_bool(value: object, field: str) -> bool:
    if not isinstance(value, bool):
        raise ValueError(f"{field} must be bool")
    return value


def _require_https(value: object, field: str) -> str:
    text = _require_text(value, field)
    if not text.startswith("https://"):
        raise ValueError(f"{field} must use https")
    return text


def _unique_text_list(value: object, field: str) -> tuple[str, ...]:
    items = _require_list(value, field)
    result: list[str] = []
    seen: set[str] = set()
    for index, item in enumerate(items):
        text = _require_text(item, f"{field}[{index}]")
        if text in seen:
            raise ValueError(f"{field} contains duplicate value {text}")
        seen.add(text)
        result.append(text)
    return tuple(result)


def _load_json_object(path: Path) -> Mapping[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Cannot load OT↔NT relation pack {path.name}: {exc}") from exc
    if not isinstance(value, Mapping):
        raise ValueError("OT↔NT relation pack must contain a JSON object")
    return value


def _validate_audit(raw: Mapping[str, Any], status: str) -> str:
    state = _require_text(raw.get("state"), "audit.state")
    auditor = _optional_text(raw.get("auditor"), "audit.auditor")
    accepted_at = _optional_text(raw.get("accepted_at"), "audit.accepted_at")
    evidence_ref = _optional_text(raw.get("evidence_ref"), "audit.evidence_ref")

    if status == PENDING_STATUS:
        if state != PENDING_AUDIT_STATE:
            raise ValueError("Pending OT↔NT pack must preserve PENDING_INDEPENDENT_SOURCE_AUDIT")
        if any(value is not None for value in (auditor, accepted_at, evidence_ref)):
            raise ValueError("Pending OT↔NT pack cannot contain acceptance metadata")
        return state

    if status == SOURCE_AUDITED_STATUS:
        if state != SOURCE_AUDITED_STATE:
            raise ValueError("SOURCE_AUDITED pack must carry audit.state=SOURCE_AUDITED")
        if any(value is None for value in (auditor, accepted_at, evidence_ref)):
            raise ValueError("SOURCE_AUDITED pack requires auditor, accepted_at, and evidence_ref")
        return state

    raise ValueError(f"Unsupported OT↔NT pack status {status!r}")


def load_otnt_relation_pack(repo_root: Path) -> OTNTRelationPack:
    """Validate the authored OT↔NT pack without treating authoring as source audit.

    The loader never parses free text into relations. Passage/evidence/relation
    identities must all be explicit structured fields. A pending pack is returned
    as a candidate runtime with every evidence item locked.
    """

    repo_root = Path(repo_root).resolve()
    evidence_dir = (repo_root / "docs" / "evidence").resolve()
    path = (evidence_dir / PACK_FILENAME).resolve()
    if path.parent != evidence_dir:
        raise ValueError("OT↔NT relation pack escaped evidence directory")
    root = _load_json_object(path)

    if _require_text(root.get("schema_version"), "schema_version") != SCHEMA_VERSION:
        raise ValueError("Unsupported OT↔NT relation-pack schema")
    pack_id = _require_text(root.get("pack_id"), "pack_id")
    if pack_id != PACK_ID:
        raise ValueError("Unsupported OT↔NT relation-pack identity")
    version = _require_text(root.get("version"), "version")
    status = _require_text(root.get("status"), "status")
    if _require_text(root.get("runtime_visibility"), "runtime_visibility") != RUNTIME_VISIBILITY:
        raise ValueError("OT↔NT relation pack runtime_visibility must preserve the source-audit gate")

    source_edition_raw = _require_object(root.get("source_edition"), "source_edition")
    source_edition = {
        "edition_id": _require_text(source_edition_raw.get("edition_id"), "source_edition.edition_id"),
        "name": _require_text(source_edition_raw.get("name"), "source_edition.name"),
        "license": _require_text(source_edition_raw.get("license"), "source_edition.license"),
        "license_url": _require_https(source_edition_raw.get("license_url"), "source_edition.license_url"),
        "retrieved_date": _require_text(source_edition_raw.get("retrieved_date"), "source_edition.retrieved_date"),
    }
    if source_edition["edition_id"] != "engwebu":
        raise ValueError("OT↔NT relation pack must preserve the declared engwebu edition identity")
    if source_edition["license"] != "Public Domain":
        raise ValueError("OT↔NT relation pack source edition must preserve Public Domain licensing")

    audit_state = _validate_audit(
        _require_object(root.get("audit"), "audit"),
        status,
    )

    passages: dict[str, PassageRef] = {}
    passage_testaments: dict[str, str] = {}
    passage_urls: dict[str, str] = {}
    for index, raw_value in enumerate(_require_list(root.get("passages"), "passages")):
        raw = _require_object(raw_value, f"passages[{index}]")
        passage_id = _require_text(raw.get("passage_id"), f"passages[{index}].passage_id")
        if passage_id in passages:
            raise ValueError(f"Duplicate passage_id {passage_id}")
        testament = _require_text(raw.get("testament"), f"{passage_id}.testament")
        if testament not in {"OT", "NT"}:
            raise ValueError(f"{passage_id}.testament must be OT or NT")
        book = _require_text(raw.get("book"), f"{passage_id}.book")
        chapter = _positive_int(raw.get("chapter"), f"{passage_id}.chapter")
        verse_start = _positive_int(raw.get("verse_start"), f"{passage_id}.verse_start")
        verse_end = _positive_int(raw.get("verse_end"), f"{passage_id}.verse_end")
        if verse_end < verse_start:
            raise ValueError(f"{passage_id}.verse_end must be >= verse_start")
        witness = _optional_text(raw.get("witness"), f"{passage_id}.witness")
        if _require_text(raw.get("source_classification"), f"{passage_id}.source_classification") != "T1":
            raise ValueError(f"{passage_id} source_classification must be T1")
        _require_bool(raw.get("tx1"), f"{passage_id}.tx1")
        source_url = _require_https(raw.get("source_url"), f"{passage_id}.source_url")
        excerpt = _require_text(raw.get("excerpt"), f"{passage_id}.excerpt")
        excerpt_sha256 = _require_text(raw.get("excerpt_sha256"), f"{passage_id}.excerpt_sha256", maximum=64)
        if len(excerpt_sha256) != 64 or any(ch not in "0123456789abcdef" for ch in excerpt_sha256):
            raise ValueError(f"{passage_id}.excerpt_sha256 must be lowercase SHA-256 hex")
        actual_hash = hashlib.sha256(excerpt.encode("utf-8")).hexdigest()
        if actual_hash != excerpt_sha256:
            raise ValueError(f"{passage_id} excerpt SHA-256 mismatch")
        passages[passage_id] = PassageRef(
            passage_id=passage_id,
            book=book,
            chapter=chapter,
            verse_start=verse_start,
            verse_end=verse_end,
            witness=witness,
        )
        passage_testaments[passage_id] = testament
        passage_urls[passage_id] = source_url

    if not passages:
        raise ValueError("OT↔NT relation pack must contain at least one passage")

    runtime = EvidenceRuntime()
    evidence_passages: dict[str, str] = {}
    declared_relation_ids: dict[str, tuple[str, ...]] = {}
    for index, raw_value in enumerate(_require_list(root.get("evidence"), "evidence")):
        raw = _require_object(raw_value, f"evidence[{index}]")
        evidence_id = _require_text(raw.get("evidence_id"), f"evidence[{index}].evidence_id")
        if evidence_id in runtime.evidence:
            raise ValueError(f"Duplicate evidence_id {evidence_id}")
        passage_id = _require_text(raw.get("passage_id"), f"{evidence_id}.passage_id")
        passage = passages.get(passage_id)
        if passage is None:
            raise ValueError(f"{evidence_id} references unknown passage_id {passage_id}")
        proposition = _require_text(raw.get("proposition"), f"{evidence_id}.proposition")
        confidence_text = _require_text(raw.get("confidence_code"), f"{evidence_id}.confidence_code")
        try:
            confidence = Confidence(confidence_text)
        except ValueError as exc:
            raise ValueError(f"{evidence_id}.confidence_code is unsupported") from exc
        if confidence is not Confidence.T1:
            raise ValueError(f"{evidence_id}.confidence_code must be T1")
        tx1 = _require_bool(raw.get("tx1"), f"{evidence_id}.tx1")
        witness = _optional_text(raw.get("witness"), f"{evidence_id}.witness")
        if witness != passage.witness:
            raise ValueError(f"{evidence_id}.witness must match its passage witness")
        relation_ids = _unique_text_list(raw.get("relation_ids"), f"{evidence_id}.relation_ids")
        runtime.add_evidence(
            EvidenceRecord(
                evidence_id=evidence_id,
                passage_refs=(passage,),
                proposition=proposition,
                confidence=confidence,
                tx1=tx1,
                witness=witness,
                relation_ids=relation_ids,
            )
        )
        evidence_passages[evidence_id] = passage_id
        declared_relation_ids[evidence_id] = relation_ids

    if not runtime.evidence:
        raise ValueError("OT↔NT relation pack must contain at least one evidence record")

    relation_metadata: dict[str, Mapping[str, Any]] = {}
    for index, raw_value in enumerate(_require_list(root.get("relations"), "relations")):
        raw = _require_object(raw_value, f"relations[{index}]")
        relation_id = _require_text(raw.get("relation_id"), f"relations[{index}].relation_id")
        if relation_id in runtime.relations:
            raise ValueError(f"Duplicate relation_id {relation_id}")
        source_evidence_id = _require_text(raw.get("source_evidence_id"), f"{relation_id}.source_evidence_id")
        target_evidence_id = _require_text(raw.get("target_evidence_id"), f"{relation_id}.target_evidence_id")
        if source_evidence_id == target_evidence_id:
            raise ValueError(f"{relation_id} endpoints must be distinct")
        if source_evidence_id not in runtime.evidence or target_evidence_id not in runtime.evidence:
            raise ValueError(f"{relation_id} references unknown evidence endpoint")
        relation_type = _require_text(raw.get("relation_type"), f"{relation_id}.relation_type")
        relation_confidence = _require_text(raw.get("relation_confidence"), f"{relation_id}.relation_confidence")
        if relation_confidence != "T2":
            raise ValueError(f"{relation_id}.relation_confidence must be T2")
        tx1 = _require_bool(raw.get("tx1"), f"{relation_id}.tx1")
        witness = _optional_text(raw.get("witness"), f"{relation_id}.witness")
        passage_ids = _unique_text_list(raw.get("passage_ids"), f"{relation_id}.passage_ids")
        expected_passages = (
            evidence_passages[source_evidence_id],
            evidence_passages[target_evidence_id],
        )
        if passage_ids != expected_passages:
            raise ValueError(f"{relation_id}.passage_ids must exactly match endpoint passage order")
        if passage_testaments[passage_ids[0]] == passage_testaments[passage_ids[1]]:
            raise ValueError(f"{relation_id} endpoints must span OT and NT")
        source_basis = _require_text(raw.get("source_basis"), f"{relation_id}.source_basis")
        source_urls = _unique_text_list(raw.get("source_urls"), f"{relation_id}.source_urls")
        expected_urls = (
            passage_urls[passage_ids[0]],
            passage_urls[passage_ids[1]],
        )
        if source_urls != expected_urls:
            raise ValueError(f"{relation_id}.source_urls must exactly match endpoint sources")
        if relation_id not in declared_relation_ids[source_evidence_id]:
            raise ValueError(f"{source_evidence_id} does not declare relation {relation_id}")
        if relation_id not in declared_relation_ids[target_evidence_id]:
            raise ValueError(f"{target_evidence_id} does not declare relation {relation_id}")
        runtime.add_relation(
            Relation(
                relation_id=relation_id,
                source_id=source_evidence_id,
                relation_type=relation_type,
                target_id=target_evidence_id,
                witness=witness,
                passage_ids=passage_ids,
            )
        )
        relation_metadata[relation_id] = {
            "confidence_code": relation_confidence,
            "tx1": tx1,
            "source_basis": source_basis,
            "source_urls": source_urls,
        }

    if not runtime.relations:
        raise ValueError("OT↔NT relation pack must contain at least one relation")

    known_relation_ids = set(runtime.relations)
    for evidence_id, relation_ids in declared_relation_ids.items():
        unknown = set(relation_ids) - known_relation_ids
        if unknown:
            raise ValueError(f"{evidence_id} declares unknown relation IDs: {sorted(unknown)!r}")

    book_testaments: dict[str, str] = {}
    for passage_id, passage in passages.items():
        testament = passage_testaments[passage_id]
        previous = book_testaments.get(passage.book)
        if previous is not None and previous != testament:
            raise ValueError(f"Conflicting testament classification for book {passage.book!r}")
        book_testaments[passage.book] = testament

    return OTNTRelationPack(
        runtime=runtime,
        status=status,
        audit_state=audit_state,
        pack_id=pack_id,
        version=version,
        book_testaments=book_testaments,
        source_edition=source_edition,
        relation_metadata=relation_metadata,
    )


def materialize_otnt_relation_pack(
    target: EvidenceRuntime,
    bundle: OTNTRelationPack,
) -> OTNTMaterializationResult:
    """Add the pack to the production evidence runtime only after independent audit.

    Pending authored content is intentionally inert. An audited pack is
    preflighted for identity collisions before any target mutation, then evidence
    and relations are copied and the newly added evidence is globally unlocked for
    read-only research projection.
    """

    if not isinstance(target, EvidenceRuntime):
        raise TypeError("target must be EvidenceRuntime")
    if not isinstance(bundle, OTNTRelationPack):
        raise TypeError("bundle must be OTNTRelationPack")
    if not bundle.source_audited:
        return OTNTMaterializationResult(0, 0, 0, False)

    evidence_ids = set(bundle.runtime.evidence)
    relation_ids = set(bundle.runtime.relations)
    evidence_collisions = evidence_ids & set(target.evidence)
    relation_collisions = relation_ids & set(target.relations)
    if evidence_collisions:
        raise ValueError(f"OT↔NT evidence ID collision: {sorted(evidence_collisions)!r}")
    if relation_collisions:
        raise ValueError(f"OT↔NT relation ID collision: {sorted(relation_collisions)!r}")

    for evidence_id in sorted(bundle.runtime.evidence):
        target.add_evidence(bundle.runtime.evidence[evidence_id])
    for relation_id in sorted(bundle.runtime.relations):
        target.add_relation(bundle.runtime.relations[relation_id])
    for evidence_id in sorted(bundle.runtime.evidence):
        target.unlock(evidence_id)

    return OTNTMaterializationResult(
        evidence_added=len(evidence_ids),
        relations_added=len(relation_ids),
        evidence_unlocked=len(evidence_ids),
        source_audited=True,
    )


__all__ = [
    "PACK_FILENAME",
    "OTNTRelationPack",
    "OTNTMaterializationResult",
    "load_otnt_relation_pack",
    "materialize_otnt_relation_pack",
]
