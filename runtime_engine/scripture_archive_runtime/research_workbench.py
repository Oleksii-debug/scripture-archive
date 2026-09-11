from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from .evidence import Claim, EvidenceRecord, EvidenceRuntime, PassageRef


MAX_SELECTION = 256
MAX_TEXT = 4096


def _text(value: object, field: str, *, allow_empty: bool = False, limit: int = MAX_TEXT) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{field} must be text")
    if len(value) > limit:
        raise ValueError(f"{field} exceeds {limit} characters")
    if not allow_empty and not value:
        raise ValueError(f"{field} must not be empty")
    if any(ord(char) < 32 or ord(char) == 127 for char in value):
        raise ValueError(f"{field} contains control characters")
    return value


def _positive_int(value: object, field: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise ValueError(f"{field} must be a positive integer")
    return value


def _bool(value: object, field: str) -> bool:
    if not isinstance(value, bool):
        raise ValueError(f"{field} must be boolean")
    return value


def _validate_passage(ref: PassageRef) -> None:
    _text(ref.passage_id, "passage_id", limit=256)
    _text(ref.book, "book", limit=256)
    _positive_int(ref.chapter, "chapter")
    _positive_int(ref.verse_start, "verse_start")
    if ref.verse_end is not None:
        _positive_int(ref.verse_end, "verse_end")
        if ref.verse_end < ref.verse_start:
            raise ValueError("verse_end must not precede verse_start")
    if ref.witness is not None:
        _text(ref.witness, "passage witness", limit=256)


def _record_witness(record: EvidenceRecord) -> str | None:
    if record.witness is not None:
        _text(record.witness, "evidence witness", limit=256)
    passage_witnesses: set[str] = set()
    for ref in record.passage_refs:
        _validate_passage(ref)
        if ref.witness is not None:
            passage_witnesses.add(ref.witness)
    if len(passage_witnesses) > 1:
        raise ValueError(f"evidence {record.evidence_id} mixes passage witnesses")
    passage_witness = next(iter(passage_witnesses), None)
    if record.witness is not None and passage_witness is not None and record.witness != passage_witness:
        raise ValueError(f"evidence {record.evidence_id} conflicts with passage witness")
    return record.witness or passage_witness


@dataclass(frozen=True)
class WorkbenchPassage:
    passage_id: str
    book: str
    chapter: int
    verse_start: int
    verse_end: int | None
    witness: str | None
    evidence_ids: tuple[str, ...]

    def to_dict(self) -> dict:
        return {
            "passage_id": self.passage_id,
            "book": self.book,
            "chapter": self.chapter,
            "verse_start": self.verse_start,
            "verse_end": self.verse_end,
            "witness": self.witness,
            "evidence_ids": list(self.evidence_ids),
        }


@dataclass(frozen=True)
class WorkbenchEvidence:
    evidence_id: str
    proposition: str
    confidence: str
    tx1: bool
    witness: str | None
    passage_ids: tuple[str, ...]

    def to_dict(self) -> dict:
        return {
            "evidence_id": self.evidence_id,
            "proposition": self.proposition,
            "confidence": self.confidence,
            "tx1": self.tx1,
            "witness": self.witness,
            "passage_ids": list(self.passage_ids),
        }


@dataclass(frozen=True)
class WorkbenchClaim:
    claim_id: str
    proposition: str
    confidence: str
    tx1: bool
    source_scope: str
    uncertainty: str | None
    witness: str | None
    evidence_ids: tuple[str, ...]

    def to_dict(self) -> dict:
        return {
            "claim_id": self.claim_id,
            "proposition": self.proposition,
            "confidence": self.confidence,
            "tx1": self.tx1,
            "source_scope": self.source_scope,
            "uncertainty": self.uncertainty,
            "witness": self.witness,
            "evidence_ids": list(self.evidence_ids),
        }


@dataclass(frozen=True)
class ResearchWorkbenchView:
    passages: tuple[WorkbenchPassage, ...]
    evidence: tuple[WorkbenchEvidence, ...]
    claims: tuple[WorkbenchClaim, ...]

    def semantic_rows(self) -> list[dict]:
        rows: list[dict] = []
        for passage in self.passages:
            rows.append({"kind": "passage", **passage.to_dict()})
        for record in self.evidence:
            rows.append({"kind": "evidence", **record.to_dict()})
        for claim in self.claims:
            rows.append({"kind": "claim", **claim.to_dict()})
        return rows

    def linearize(self) -> list[str]:
        lines: list[str] = []
        for passage in self.passages:
            end = passage.verse_end if passage.verse_end is not None else passage.verse_start
            lines.append(
                "Passage "
                f"{passage.passage_id}: {passage.book} {passage.chapter}:{passage.verse_start}-{end}; "
                f"witness={passage.witness or 'not_stated'}; evidence={','.join(passage.evidence_ids) or 'none'}"
            )
        for record in self.evidence:
            lines.append(
                "Evidence "
                f"{record.evidence_id}: {record.proposition}; confidence={record.confidence}; "
                f"tx1={'true' if record.tx1 else 'false'}; witness={record.witness or 'not_stated'}; "
                f"passages={','.join(record.passage_ids) or 'none'}"
            )
        for claim in self.claims:
            lines.append(
                "Claim "
                f"{claim.claim_id}: {claim.proposition}; confidence={claim.confidence}; "
                f"tx1={'true' if claim.tx1 else 'false'}; witness={claim.witness or 'not_stated'}; "
                f"source_scope={claim.source_scope or 'not_stated'}; "
                f"uncertainty={claim.uncertainty or 'not_stated'}; evidence={','.join(claim.evidence_ids)}"
            )
        return lines

    def to_dict(self) -> dict:
        return {
            "schema_version": 1,
            "passages": [item.to_dict() for item in self.passages],
            "evidence": [item.to_dict() for item in self.evidence],
            "claims": [item.to_dict() for item in self.claims],
            "semantic_rows": self.semantic_rows(),
            "linear": self.linearize(),
        }


def _claim_view(claim: Claim, records: dict[str, EvidenceRecord]) -> WorkbenchClaim:
    _text(claim.claim_id, "claim_id", limit=256)
    _text(claim.proposition, "claim proposition")
    _text(claim.source_scope, "source_scope", allow_empty=True)
    if claim.uncertainty is not None:
        _text(claim.uncertainty, "uncertainty")
    if claim.witness is not None:
        _text(claim.witness, "claim witness", limit=256)
    required = tuple(sorted(claim.required_evidence_ids))
    if len(required) != len(set(required)):
        raise ValueError(f"claim {claim.claim_id} repeats required evidence")
    for evidence_id in required:
        evidence_witness = _record_witness(records[evidence_id])
        if claim.witness is not None and evidence_witness is not None and claim.witness != evidence_witness:
            raise ValueError(f"claim {claim.claim_id} conflicts with evidence witness")
    return WorkbenchClaim(
        claim_id=claim.claim_id,
        proposition=claim.proposition,
        confidence=claim.confidence.value,
        tx1=_bool(claim.tx1, "claim tx1"),
        source_scope=claim.source_scope,
        uncertainty=claim.uncertainty,
        witness=claim.witness,
        evidence_ids=required,
    )


def build_research_workbench(
    runtime: EvidenceRuntime,
    evidence_ids: Iterable[str] | None = None,
    *,
    unlocked_only: bool = True,
) -> ResearchWorkbenchView:
    """Build a deterministic, read-only Workbench projection from canonical evidence runtime truth.

    By default only already-unlocked evidence participates. Claims are shown only when every
    required evidence record is visible in this projection; partially supported or zero-evidence
    claims are omitted rather than leaking hidden truth. In restricted scope, identifiers belonging
    to non-visible evidence or gated claims shadow coincident visible IDs so independent runtime
    namespaces cannot re-expose hidden identifiers through another semantic row.
    """

    _bool(unlocked_only, "unlocked_only")
    if evidence_ids is None:
        selected_ids = tuple(sorted(runtime.unlocked if unlocked_only else runtime.evidence))
    else:
        selected_ids = tuple(evidence_ids)
        for evidence_id in selected_ids:
            _text(evidence_id, "evidence_id", limit=256)
        if len(selected_ids) != len(set(selected_ids)):
            raise ValueError("evidence_ids must be unique")
        selected_ids = tuple(sorted(selected_ids))
    if len(selected_ids) > MAX_SELECTION:
        raise ValueError(f"evidence selection exceeds {MAX_SELECTION}")

    selected = runtime.select(selected_ids, unlocked_only=unlocked_only)
    record_by_id = {record.evidence_id: record for record in selected}
    visible_ids = set(record_by_id)
    registered_evidence_ids = set(runtime.evidence)
    nonvisible_evidence_ids = registered_evidence_ids - visible_ids if unlocked_only else set()
    nonvisible_claim_ids: set[str] = set()
    if unlocked_only:
        for claim in runtime.claims.values():
            if not isinstance(claim, Claim):
                raise ValueError("runtime claims must contain Claim values")
            _text(claim.claim_id, "claim_id", limit=256)
            required = set(claim.required_evidence_ids)
            if required and required.issubset(registered_evidence_ids) and not required.issubset(visible_ids):
                nonvisible_claim_ids.add(claim.claim_id)

    evidence_views: list[WorkbenchEvidence] = []
    passage_by_id: dict[str, WorkbenchPassage] = {}
    passage_evidence: dict[str, set[str]] = {}

    for record in sorted(selected, key=lambda item: item.evidence_id):
        _text(record.evidence_id, "evidence_id", limit=256)
        if record.evidence_id in nonvisible_claim_ids:
            raise ValueError(
                f"evidence {record.evidence_id} collides with non-visible claim id"
            )
        _text(record.proposition, "evidence proposition")
        witness = _record_witness(record)
        passage_ids: list[str] = []
        for ref in sorted(record.passage_refs, key=lambda item: item.passage_id):
            _validate_passage(ref)
            if ref.passage_id in nonvisible_evidence_ids:
                raise ValueError(
                    f"passage {ref.passage_id} collides with non-visible evidence id"
                )
            if ref.passage_id in nonvisible_claim_ids:
                raise ValueError(
                    f"passage {ref.passage_id} collides with non-visible claim id"
                )
            passage_ids.append(ref.passage_id)
            candidate = WorkbenchPassage(
                passage_id=ref.passage_id,
                book=ref.book,
                chapter=ref.chapter,
                verse_start=ref.verse_start,
                verse_end=ref.verse_end,
                witness=ref.witness,
                evidence_ids=(),
            )
            previous = passage_by_id.get(ref.passage_id)
            if previous is not None and previous.to_dict() != candidate.to_dict():
                raise ValueError(f"passage {ref.passage_id} has conflicting canonical metadata")
            passage_by_id[ref.passage_id] = candidate
            passage_evidence.setdefault(ref.passage_id, set()).add(record.evidence_id)
        evidence_views.append(
            WorkbenchEvidence(
                evidence_id=record.evidence_id,
                proposition=record.proposition,
                confidence=record.confidence.value,
                tx1=_bool(record.tx1, "evidence tx1"),
                witness=witness,
                passage_ids=tuple(sorted(set(passage_ids))),
            )
        )

    passages = tuple(
        WorkbenchPassage(
            passage_id=panel.passage_id,
            book=panel.book,
            chapter=panel.chapter,
            verse_start=panel.verse_start,
            verse_end=panel.verse_end,
            witness=panel.witness,
            evidence_ids=tuple(sorted(passage_evidence[panel.passage_id])),
        )
        for panel in sorted(passage_by_id.values(), key=lambda item: item.passage_id)
    )

    claims: list[WorkbenchClaim] = []
    for claim in sorted(runtime.claims.values(), key=lambda item: item.claim_id):
        required = set(claim.required_evidence_ids)
        if not required or not required.issubset(visible_ids):
            continue
        if claim.claim_id in nonvisible_evidence_ids:
            raise ValueError(
                f"claim {claim.claim_id} collides with non-visible evidence id"
            )
        claims.append(_claim_view(claim, record_by_id))

    return ResearchWorkbenchView(passages, tuple(evidence_views), tuple(claims))
