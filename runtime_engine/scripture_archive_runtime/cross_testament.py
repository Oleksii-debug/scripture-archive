from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
import json
import unicodedata

from .evidence import EvidenceRecord, EvidenceRuntime, PassageRef, Relation
from .models import Confidence


SCHEMA_VERSION = "CROSS_TESTAMENT_v1"
NOT_STATED = "Not stated in cited text"
_STATUS_LINKS = "LINKS"
_STATUS_NOT_STATED = "NOT_STATED_IN_CITED_TEXT"
_VALID_TESTAMENTS = frozenset({"OT", "NT"})
_MAX_ID = 256
_MAX_BOOK = 96
_MAX_RELATION_TYPE = 128
_MAX_WITNESS = 256


@dataclass(frozen=True)
class EvidenceProvenance:
    evidence_id: str
    confidence: str
    tx1: bool
    witness: str | None

    def to_dict(self) -> dict[str, object]:
        return {
            "evidence_id": self.evidence_id,
            "confidence": self.confidence,
            "tx1": self.tx1,
            "witness": self.witness,
        }


@dataclass(frozen=True)
class CrossTestamentEndpoint:
    passage_id: str
    testament: str
    book: str
    chapter: int
    verse_start: int
    verse_end: int | None
    witness: str | None
    evidence: tuple[EvidenceProvenance, ...]

    def to_dict(self) -> dict[str, object]:
        return {
            "passage_id": self.passage_id,
            "testament": self.testament,
            "book": self.book,
            "chapter": self.chapter,
            "verse_start": self.verse_start,
            "verse_end": self.verse_end,
            "witness": self.witness,
            "evidence": [item.to_dict() for item in self.evidence],
        }


@dataclass(frozen=True)
class CrossTestamentLink:
    relation_id: str
    relation_type: str
    relation_witness: str | None
    ot: CrossTestamentEndpoint
    nt: CrossTestamentEndpoint

    def to_dict(self) -> dict[str, object]:
        return {
            "relation_id": self.relation_id,
            "relation_type": self.relation_type,
            "relation_witness": self.relation_witness,
            "ot": self.ot.to_dict(),
            "nt": self.nt.to_dict(),
        }


@dataclass(frozen=True)
class CrossTestamentProjection:
    links: tuple[CrossTestamentLink, ...]

    @property
    def status(self) -> str:
        return _STATUS_LINKS if self.links else _STATUS_NOT_STATED

    def to_dict(self) -> dict[str, object]:
        return {
            "schema": SCHEMA_VERSION,
            "status": self.status,
            "links": [link.to_dict() for link in self.links],
        }

    def stable_json(self) -> str:
        return json.dumps(
            self.to_dict(),
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        )

    def linearize(self) -> list[str]:
        if not self.links:
            return [NOT_STATED]
        lines: list[str] = []
        for link in self.links:
            lines.append(
                f"Relation {link.relation_id} [{link.relation_type}]: "
                f"OT {format_passage(link.ot)} ↔ NT {format_passage(link.nt)}"
            )
            if link.relation_witness:
                lines.append(f"Relation witness: {link.relation_witness}")
            lines.extend(_linearize_endpoint("OT", link.ot))
            lines.extend(_linearize_endpoint("NT", link.nt))
        return lines


def project_cross_testament(
    runtime: EvidenceRuntime,
    *,
    book_testaments: Mapping[str, str],
    unlocked_only: bool = True,
) -> CrossTestamentProjection:
    """Project only explicit, source-backed OT↔NT links from EvidenceRuntime.

    No link is created from topical similarity, shared entities, claims, or
    proximity. A projected Relation must explicitly name exactly two passage
    IDs; N-ary relations are not pairwise-expanded because that would invent
    semantics not stated by the source relation. By default, every named
    passage and every relation endpoint that resolves to evidence must be
    visible before any part of the relation is exposed.
    """
    if not isinstance(runtime, EvidenceRuntime):
        raise TypeError("runtime must be an EvidenceRuntime")
    if not isinstance(book_testaments, Mapping):
        raise TypeError("book_testaments must be a mapping")
    if not isinstance(unlocked_only, bool):
        raise TypeError("unlocked_only must be bool")

    all_passages, all_provenance = _index_passages(runtime.evidence)
    visible_evidence_ids = (
        set(runtime.unlocked) if unlocked_only else set(runtime.evidence)
    )
    unknown_unlocks = visible_evidence_ids - set(runtime.evidence)
    if unknown_unlocks:
        raise ValueError(f"Unlocked evidence is not registered: {sorted(unknown_unlocks)!r}")

    visible_provenance: dict[str, tuple[EvidenceProvenance, ...]] = {}
    for passage_id, provenance in all_provenance.items():
        filtered = tuple(
            item for item in provenance if item.evidence_id in visible_evidence_ids
        )
        if filtered:
            visible_provenance[passage_id] = filtered

    links: list[CrossTestamentLink] = []
    seen: set[tuple[str, str, str]] = set()
    for relation_id in sorted(runtime.relations):
        relation = runtime.relations[relation_id]
        _validate_relation(relation, expected_id=relation_id)
        ordered_ids = _dedupe_preserving_order(relation.passage_ids)
        if len(ordered_ids) != 2:
            continue

        for passage_id in ordered_ids:
            if passage_id not in all_passages:
                raise ValueError(
                    f"Relation {relation.relation_id} references unknown passage_id {passage_id}"
                )

        # Relation endpoint identity is part of the assertion. If an endpoint
        # names an evidence record, a locked endpoint suppresses the relation
        # even when the same passage is independently visible via other evidence.
        if unlocked_only and _relation_has_hidden_evidence_endpoint(
            relation,
            runtime.evidence,
            visible_evidence_ids,
        ):
            continue

        if any(passage_id not in visible_provenance for passage_id in ordered_ids):
            continue

        left_id, right_id = ordered_ids
        left = all_passages[left_id]
        right = all_passages[right_id]
        _validate_relation_witness(
            relation,
            (left, right),
            visible_provenance[left_id] + visible_provenance[right_id],
        )
        left_testament = _testament_for(left.book, book_testaments)
        right_testament = _testament_for(right.book, book_testaments)
        if left_testament == right_testament:
            continue

        ot_ref, nt_ref = (
            (left, right)
            if left_testament == "OT"
            else (right, left)
        )
        key = (relation.relation_id, ot_ref.passage_id, nt_ref.passage_id)
        if key in seen:
            continue
        seen.add(key)
        links.append(
            CrossTestamentLink(
                relation_id=relation.relation_id,
                relation_type=relation.relation_type,
                relation_witness=relation.witness,
                ot=_endpoint(
                    ot_ref,
                    "OT",
                    visible_provenance[ot_ref.passage_id],
                ),
                nt=_endpoint(
                    nt_ref,
                    "NT",
                    visible_provenance[nt_ref.passage_id],
                ),
            )
        )

    links.sort(key=lambda item: (item.relation_id, item.ot.passage_id, item.nt.passage_id))
    return CrossTestamentProjection(tuple(links))


def format_passage(endpoint: CrossTestamentEndpoint) -> str:
    verse = str(endpoint.verse_start)
    if endpoint.verse_end is not None and endpoint.verse_end != endpoint.verse_start:
        verse = f"{verse}-{endpoint.verse_end}"
    return f"{endpoint.book} {endpoint.chapter}:{verse} ({endpoint.passage_id})"


def _index_passages(
    evidence: Mapping[str, EvidenceRecord],
) -> tuple[dict[str, PassageRef], dict[str, tuple[EvidenceProvenance, ...]]]:
    passages: dict[str, PassageRef] = {}
    provenance: dict[str, list[EvidenceProvenance]] = {}
    for evidence_id in sorted(evidence):
        record = evidence[evidence_id]
        _validate_evidence(record, expected_id=evidence_id)
        for passage in record.passage_refs:
            _validate_passage(passage)
            _validate_record_passage_witness(record, passage)
            previous = passages.get(passage.passage_id)
            if previous is not None and previous != passage:
                raise ValueError(
                    f"Conflicting definitions for passage_id {passage.passage_id}"
                )
            passages[passage.passage_id] = passage
            provenance.setdefault(passage.passage_id, []).append(
                EvidenceProvenance(
                    evidence_id=record.evidence_id,
                    confidence=record.confidence.value,
                    tx1=record.tx1,
                    witness=record.witness,
                )
            )
    return passages, {
        passage_id: tuple(sorted(items, key=lambda item: item.evidence_id))
        for passage_id, items in provenance.items()
    }


def _validate_evidence(record: EvidenceRecord, *, expected_id: str) -> None:
    if not isinstance(record, EvidenceRecord):
        raise TypeError(f"Evidence {expected_id!r} must be EvidenceRecord")
    _require_text(record.evidence_id, "evidence_id", _MAX_ID)
    if record.evidence_id != expected_id:
        raise ValueError(
            f"Evidence mapping key {expected_id!r} does not match record id {record.evidence_id!r}"
        )
    if not isinstance(record.confidence, Confidence):
        raise ValueError(f"Evidence {record.evidence_id} has invalid confidence")
    if not isinstance(record.tx1, bool):
        raise ValueError(f"Evidence {record.evidence_id} tx1 must be bool")
    _optional_text(record.witness, "evidence witness", _MAX_WITNESS)
    if not isinstance(record.passage_refs, tuple):
        raise ValueError(f"Evidence {record.evidence_id} passage_refs must be tuple")


def _validate_passage(passage: PassageRef) -> None:
    if not isinstance(passage, PassageRef):
        raise TypeError("passage_refs must contain PassageRef")
    _require_text(passage.passage_id, "passage_id", _MAX_ID)
    _require_text(passage.book, "book", _MAX_BOOK)
    _positive_int(passage.chapter, "chapter")
    _positive_int(passage.verse_start, "verse_start")
    if passage.verse_end is not None:
        _positive_int(passage.verse_end, "verse_end")
        if passage.verse_end < passage.verse_start:
            raise ValueError("verse_end must be >= verse_start")
    _optional_text(passage.witness, "passage witness", _MAX_WITNESS)


def _validate_record_passage_witness(
    record: EvidenceRecord,
    passage: PassageRef,
) -> None:
    if (
        record.witness is not None
        and passage.witness is not None
        and record.witness != passage.witness
    ):
        raise ValueError(
            f"Evidence {record.evidence_id} witness conflicts with passage "
            f"{passage.passage_id} witness"
        )


def _validate_relation(relation: Relation, *, expected_id: str) -> None:
    if not isinstance(relation, Relation):
        raise TypeError(f"Relation {expected_id!r} must be Relation")
    _require_text(relation.relation_id, "relation_id", _MAX_ID)
    if relation.relation_id != expected_id:
        raise ValueError(
            f"Relation mapping key {expected_id!r} does not match relation id {relation.relation_id!r}"
        )
    _require_text(relation.source_id, "relation source_id", _MAX_ID)
    _require_text(relation.target_id, "relation target_id", _MAX_ID)
    _require_text(relation.relation_type, "relation_type", _MAX_RELATION_TYPE)
    _optional_text(relation.witness, "relation witness", _MAX_WITNESS)
    if not isinstance(relation.passage_ids, tuple):
        raise ValueError(f"Relation {relation.relation_id} passage_ids must be tuple")
    for passage_id in relation.passage_ids:
        _require_text(passage_id, "relation passage_id", _MAX_ID)


def _relation_has_hidden_evidence_endpoint(
    relation: Relation,
    evidence: Mapping[str, EvidenceRecord],
    visible_evidence_ids: set[str],
) -> bool:
    return any(
        endpoint_id in evidence and endpoint_id not in visible_evidence_ids
        for endpoint_id in (relation.source_id, relation.target_id)
    )


def _validate_relation_witness(
    relation: Relation,
    passages: tuple[PassageRef, PassageRef],
    provenance: tuple[EvidenceProvenance, ...],
) -> None:
    if relation.witness is None:
        return
    explicit_witnesses = {
        witness
        for witness in (
            *(passage.witness for passage in passages),
            *(item.witness for item in provenance),
        )
        if witness is not None
    }
    if explicit_witnesses and explicit_witnesses != {relation.witness}:
        raise ValueError(
            f"Relation {relation.relation_id} witness conflicts with supporting provenance"
        )


def _testament_for(book: str, book_testaments: Mapping[str, str]) -> str:
    if book not in book_testaments:
        raise ValueError(f"No explicit testament classification for book {book!r}")
    value = book_testaments[book]
    if not isinstance(value, str) or value not in _VALID_TESTAMENTS:
        raise ValueError(
            f"Invalid testament classification for book {book!r}: expected 'OT' or 'NT'"
        )
    return value


def _endpoint(
    passage: PassageRef,
    testament: str,
    provenance: tuple[EvidenceProvenance, ...],
) -> CrossTestamentEndpoint:
    return CrossTestamentEndpoint(
        passage_id=passage.passage_id,
        testament=testament,
        book=passage.book,
        chapter=passage.chapter,
        verse_start=passage.verse_start,
        verse_end=passage.verse_end,
        witness=passage.witness,
        evidence=provenance,
    )


def _linearize_endpoint(label: str, endpoint: CrossTestamentEndpoint) -> list[str]:
    witness = endpoint.witness or "not stated"
    lines = [f"{label} passage: {format_passage(endpoint)}; witness={witness}"]
    for item in endpoint.evidence:
        tx = "; TX1" if item.tx1 else ""
        evidence_witness = item.witness or "not stated"
        lines.append(
            f"{label} evidence {item.evidence_id}: confidence={item.confidence}{tx}; "
            f"witness={evidence_witness}"
        )
    return lines


def _dedupe_preserving_order(values: tuple[str, ...]) -> tuple[str, ...]:
    return tuple(dict.fromkeys(values))


def _require_text(value: object, field: str, limit: int) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{field} must be a string")
    if any(
        unicodedata.category(character).startswith("C")
        or character in {"\u2028", "\u2029"}
        for character in value
    ):
        raise ValueError(
            f"{field} must not contain control, format, surrogate, private-use, "
            "unassigned, or line-separator characters"
        )
    stripped = value.strip()
    if not stripped:
        raise ValueError(f"{field} must not be empty")
    if len(stripped) > limit:
        raise ValueError(f"{field} exceeds maximum length {limit}")
    if stripped != value:
        raise ValueError(f"{field} must not contain leading/trailing whitespace")
    return value


def _optional_text(value: object, field: str, limit: int) -> None:
    if value is None:
        return
    _require_text(value, field, limit)


def _positive_int(value: object, field: str) -> None:
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise ValueError(f"{field} must be a positive integer")
