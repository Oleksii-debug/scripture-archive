from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Iterable, Mapping

from .models import Confidence


@dataclass(frozen=True)
class PassageRef:
    passage_id: str
    book: str
    chapter: int
    verse_start: int
    verse_end: int | None = None
    witness: str | None = None


@dataclass(frozen=True)
class Person:
    person_id: str
    name: str


@dataclass(frozen=True)
class Event:
    event_id: str
    name: str


@dataclass(frozen=True)
class Place:
    place_id: str
    name: str


@dataclass(frozen=True)
class Relation:
    relation_id: str
    source_id: str
    relation_type: str
    target_id: str
    witness: str | None = None
    passage_ids: tuple[str, ...] = ()


@dataclass(frozen=True)
class Claim:
    claim_id: str
    proposition: str
    confidence: Confidence
    tx1: bool = False
    source_scope: str = ""
    uncertainty: str | None = None
    required_evidence_ids: tuple[str, ...] = ()
    witness: str | None = None


@dataclass(frozen=True)
class EvidenceRecord:
    evidence_id: str
    passage_refs: tuple[PassageRef, ...]
    proposition: str
    confidence: Confidence
    tx1: bool = False
    witness: str | None = None
    entity_ids: tuple[str, ...] = ()
    relation_ids: tuple[str, ...] = ()


@dataclass(frozen=True)
class ProofResult:
    proven: bool
    claim_id: str
    accepted_evidence_ids: tuple[str, ...]
    missing_evidence_ids: tuple[str, ...]
    confidence: Confidence
    tx1: bool
    source_scope: str
    uncertainty: str | None

    def to_dict(self) -> dict:
        data = asdict(self)
        data["confidence"] = self.confidence.value
        return data


@dataclass
class EvidenceRuntime:
    evidence: dict[str, EvidenceRecord] = field(default_factory=dict)
    claims: dict[str, Claim] = field(default_factory=dict)
    relations: dict[str, Relation] = field(default_factory=dict)
    unlocked: set[str] = field(default_factory=set)

    def add_evidence(self, record: EvidenceRecord) -> None:
        if record.evidence_id in self.evidence:
            raise ValueError(f"Duplicate evidence_id {record.evidence_id}")
        self.evidence[record.evidence_id] = record

    def add_claim(self, claim: Claim) -> None:
        if claim.claim_id in self.claims:
            raise ValueError(f"Duplicate claim_id {claim.claim_id}")
        self.claims[claim.claim_id] = claim

    def add_relation(self, relation: Relation) -> None:
        if relation.relation_id in self.relations:
            raise ValueError(f"Duplicate relation_id {relation.relation_id}")
        self.relations[relation.relation_id] = relation

    def unlock(self, evidence_id: str) -> EvidenceRecord:
        if evidence_id not in self.evidence:
            raise KeyError(evidence_id)
        self.unlocked.add(evidence_id)
        return self.evidence[evidence_id]

    def select(self, evidence_ids: Iterable[str], *, unlocked_only: bool = True) -> tuple[EvidenceRecord, ...]:
        selected: list[EvidenceRecord] = []
        for evidence_id in evidence_ids:
            if evidence_id not in self.evidence:
                raise KeyError(evidence_id)
            if unlocked_only and evidence_id not in self.unlocked:
                raise PermissionError(f"Evidence not unlocked: {evidence_id}")
            selected.append(self.evidence[evidence_id])
        return tuple(selected)

    def prove_claim(self, claim_id: str, evidence_ids: Iterable[str]) -> ProofResult:
        claim = self.claims[claim_id]
        submitted = set(evidence_ids)
        for eid in submitted:
            if eid not in self.evidence:
                raise KeyError(eid)
            if eid not in self.unlocked:
                raise PermissionError(f"Evidence not unlocked: {eid}")
        required = set(claim.required_evidence_ids)
        missing = required - submitted
        if claim.witness is not None and required:
            # Import locally to keep the provenance helper layer reusable without
            # creating a module-import cycle at EvidenceRuntime definition time.
            from .evidence_provenance import resolve_evidence_witness

            declared_witness = (
                claim.witness
                if isinstance(claim.witness, str)
                and claim.witness
                and claim.witness == claim.witness.strip()
                else None
            )
            for eid in required & submitted:
                if declared_witness is None or resolve_evidence_witness(self.evidence[eid]) != declared_witness:
                    missing.add(eid)
        accepted = (submitted & required) - missing
        return ProofResult(
            not missing,
            claim_id,
            tuple(sorted(accepted)),
            tuple(sorted(missing)),
            claim.confidence,
            claim.tx1,
            claim.source_scope,
            claim.uncertainty,
        )

    def cross_references(self, entity_id: str) -> tuple[Relation, ...]:
        return tuple(r for r in self.relations.values() if r.source_id == entity_id or r.target_id == entity_id)

    def linearize(self, *, claim_id: str | None = None) -> list[str]:
        lines: list[str] = []
        claims = [self.claims[claim_id]] if claim_id else sorted(self.claims.values(), key=lambda c: c.claim_id)
        for claim in claims:
            tx = " TX1" if claim.tx1 else ""
            lines.append(f"Claim {claim.claim_id}: {claim.proposition} [{claim.confidence.value}{tx}]")
            for eid in claim.required_evidence_ids:
                record = self.evidence.get(eid)
                if record:
                    witness = f"; witness={record.witness}" if record.witness else ""
                    lines.append(f"Evidence {eid}: {record.proposition}{witness}")
        return lines
