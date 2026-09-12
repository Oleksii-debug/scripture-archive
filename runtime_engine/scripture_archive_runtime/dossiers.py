from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any

from .evidence import EvidenceRecord, EvidenceRuntime
from .evidence_provenance import (
    resolve_evidence_witness,
    validated_claim_witness,
    validated_relation_witness,
)
from .models import Confidence


NOT_STATED = "Not stated in cited text"
CURRENT_SCOPE_UNAVAILABLE = "No cited support available in current scope"


class DossierKind(str, Enum):
    PERSON = "PERSON"
    EVENT = "EVENT"
    PLACE = "PLACE"
    THEME = "THEME"


@dataclass(frozen=True)
class DossierSubject:
    subject_id: str
    kind: DossierKind
    display_name: str

    def __post_init__(self) -> None:
        if not isinstance(self.subject_id, str) or not self.subject_id.strip():
            raise ValueError("subject_id must be a non-empty string")
        if not isinstance(self.kind, DossierKind):
            raise ValueError("kind must be a DossierKind")
        if not isinstance(self.display_name, str) or not self.display_name.strip():
            raise ValueError("display_name must be a non-empty string")


@dataclass(frozen=True)
class DossierRow:
    row_type: str
    row_id: str
    proposition: str
    confidence: Confidence | None = None
    tx1: bool = False
    witness: str | None = None
    source_scope: str = ""
    uncertainty: str | None = None
    passage_ids: tuple[str, ...] = ()
    passage_witnesses: tuple[tuple[str, str | None], ...] = ()
    evidence_ids: tuple[str, ...] = ()
    relation_type: str | None = None
    related_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "row_type": self.row_type,
            "row_id": self.row_id,
            "proposition": self.proposition,
            "confidence": self.confidence.value if self.confidence else None,
            "tx1": self.tx1,
            "witness": self.witness,
            "source_scope": self.source_scope,
            "uncertainty": self.uncertainty,
            "passage_ids": list(self.passage_ids),
            "passage_witnesses": [
                {"passage_id": passage_id, "witness": witness}
                for passage_id, witness in self.passage_witnesses
            ],
            "evidence_ids": list(self.evidence_ids),
            "relation_type": self.relation_type,
            "related_id": self.related_id,
        }


@dataclass(frozen=True)
class DossierView:
    subject: DossierSubject
    rows: tuple[DossierRow, ...]
    source_absence_established: bool = False

    @property
    def stated(self) -> bool:
        return bool(self.rows)

    @property
    def status_text(self) -> str:
        if self.stated:
            return "Supported by cited canonical records"
        if self.source_absence_established:
            return NOT_STATED
        return CURRENT_SCOPE_UNAVAILABLE

    def semantic_rows(self) -> tuple[dict[str, Any], ...]:
        return tuple(row.to_dict() for row in self.rows)

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema": "scripture.dossier-view.v1",
            "subject": {
                "subject_id": self.subject.subject_id,
                "kind": self.subject.kind.value,
                "display_name": self.subject.display_name,
            },
            "stated": self.stated,
            "status_text": self.status_text,
            "rows": [row.to_dict() for row in self.rows],
        }

    def linearize(self) -> tuple[str, ...]:
        lines = [
            f"Dossier {self.subject.kind.value} {self.subject.subject_id}: "
            f"{self.subject.display_name}"
        ]
        if not self.rows:
            return tuple(lines + [self.status_text])
        for row in self.rows:
            fields = [f"{row.row_type} {row.row_id}: {row.proposition}"]
            if row.confidence is not None:
                fields.append(f"confidence={row.confidence.value}")
            fields.append(f"TX1={'true' if row.tx1 else 'false'}")
            if row.witness:
                fields.append(f"witness={row.witness}")
            if row.source_scope:
                fields.append(f"source_scope={row.source_scope}")
            if row.uncertainty:
                fields.append(f"uncertainty={row.uncertainty}")
            if row.relation_type:
                fields.append(f"relation_type={row.relation_type}")
            if row.related_id:
                fields.append(f"related_id={row.related_id}")
            if row.passage_ids:
                fields.append("passages=" + ",".join(row.passage_ids))
            if row.passage_witnesses:
                fields.append(
                    "passage_witnesses="
                    + ",".join(
                        f"{passage_id}@{witness or 'not_stated'}"
                        for passage_id, witness in row.passage_witnesses
                    )
                )
            if row.evidence_ids:
                fields.append("evidence=" + ",".join(row.evidence_ids))
            lines.append(" | ".join(fields))
        return tuple(lines)


class DossierAssembler:
    """Build read-only dossier views from explicit EvidenceRuntime truth.

    The assembler never creates canonical facts. Locked evidence and dependent
    claims/relations are omitted from the default player-safe view. Witness
    attribution is delegated to the shared fail-closed provenance validator:
    absent, malformed, contradictory, mixed or hidden support never acquires a
    declared witness merely because a claim/relation metadata field says so.
    """

    def __init__(self, runtime: EvidenceRuntime):
        self.runtime = runtime

    @staticmethod
    def _record_witness(record: EvidenceRecord) -> tuple[bool, str | None]:
        """Distinguish safe witness-less evidence from unsafe witness metadata."""
        has_declared_witness = record.witness is not None or any(
            passage.witness is not None for passage in record.passage_refs
        )
        resolved = resolve_evidence_witness(record)
        if has_declared_witness and resolved is None:
            return False, None
        return True, resolved

    @staticmethod
    def _passage_ids(records: tuple[EvidenceRecord, ...]) -> tuple[str, ...]:
        return tuple(
            sorted(
                {
                    passage.passage_id
                    for record in records
                    for passage in record.passage_refs
                }
            )
        )

    @staticmethod
    def _passage_witnesses(records: tuple[EvidenceRecord, ...]) -> tuple[tuple[str, str | None], ...]:
        refs = {
            (
                passage.passage_id,
                passage.witness.strip()
                if isinstance(passage.witness, str) and passage.witness.strip()
                else None,
            )
            for record in records
            for passage in record.passage_refs
        }
        return tuple(sorted(refs, key=lambda item: (item[0], item[1] or "")))

    def build(
        self,
        subject: DossierSubject,
        *,
        unlocked_only: bool = True,
    ) -> DossierView:
        all_evidence = tuple(sorted(self.runtime.evidence.values(), key=lambda item: item.evidence_id))
        canonical_subject_support = any(
            subject.subject_id in record.entity_ids for record in all_evidence
        ) or any(
            subject.subject_id in {relation.source_id, relation.target_id}
            for relation in self.runtime.relations.values()
        )
        candidate_evidence = tuple(
            record
            for record in all_evidence
            if not unlocked_only or record.evidence_id in self.runtime.unlocked
        )
        visible_evidence = tuple(
            record for record in candidate_evidence if self._record_witness(record)[0]
        )
        visible_evidence_ids = {record.evidence_id for record in visible_evidence}

        subject_evidence = tuple(
            record for record in visible_evidence if subject.subject_id in record.entity_ids
        )
        subject_evidence_ids = {record.evidence_id for record in subject_evidence}

        rows: list[DossierRow] = []
        for record in subject_evidence:
            _safe, effective_witness = self._record_witness(record)
            rows.append(
                DossierRow(
                    row_type="EVIDENCE",
                    row_id=record.evidence_id,
                    proposition=record.proposition,
                    confidence=record.confidence,
                    tx1=record.tx1,
                    witness=effective_witness,
                    passage_ids=self._passage_ids((record,)),
                    passage_witnesses=self._passage_witnesses((record,)),
                    evidence_ids=(record.evidence_id,),
                )
            )

        for claim in sorted(self.runtime.claims.values(), key=lambda item: item.claim_id):
            required = tuple(sorted(set(claim.required_evidence_ids)))
            if not required or not subject_evidence_ids.intersection(required):
                continue
            if any(evidence_id not in self.runtime.evidence for evidence_id in required):
                continue
            if any(evidence_id not in visible_evidence_ids for evidence_id in required):
                continue
            required_records = tuple(self.runtime.evidence[evidence_id] for evidence_id in required)
            claim_witness = None
            if claim.witness is not None:
                claim_witness = validated_claim_witness(
                    self.runtime,
                    claim,
                    visible_evidence_ids=visible_evidence_ids,
                )
                if claim_witness is None:
                    continue
            rows.append(
                DossierRow(
                    row_type="CLAIM",
                    row_id=claim.claim_id,
                    proposition=claim.proposition,
                    confidence=claim.confidence,
                    tx1=claim.tx1,
                    witness=claim_witness,
                    source_scope=claim.source_scope,
                    uncertainty=claim.uncertainty,
                    passage_ids=self._passage_ids(required_records),
                    passage_witnesses=self._passage_witnesses(required_records),
                    evidence_ids=required,
                )
            )

        for relation in sorted(self.runtime.relations.values(), key=lambda item: item.relation_id):
            if subject.subject_id not in {relation.source_id, relation.target_id}:
                continue
            support = tuple(
                record
                for record in visible_evidence
                if relation.relation_id in record.relation_ids
            )
            if unlocked_only and not support:
                continue
            support_ids = tuple(sorted(record.evidence_id for record in support))
            relation_witness = None
            if relation.witness is not None:
                relation_witness = validated_relation_witness(
                    self.runtime,
                    relation,
                    support_ids,
                    visible_evidence_ids=visible_evidence_ids,
                )
                if relation_witness is None:
                    continue
            related_id = relation.target_id if relation.source_id == subject.subject_id else relation.source_id
            if unlocked_only and related_id in self.runtime.evidence and related_id not in visible_evidence_ids:
                continue
            if unlocked_only and related_id in self.runtime.claims:
                related_claim = self.runtime.claims[related_id]
                related_required = set(related_claim.required_evidence_ids)
                if related_required and not related_required.issubset(visible_evidence_ids):
                    continue
            support_passages = self._passage_ids(support)
            relation_passages = () if unlocked_only else tuple(sorted(set(relation.passage_ids)))
            rows.append(
                DossierRow(
                    row_type="RELATION",
                    row_id=relation.relation_id,
                    proposition=f"{subject.subject_id} {relation.relation_type} {related_id}",
                    witness=relation_witness,
                    passage_ids=tuple(sorted(set(relation_passages).union(support_passages))),
                    passage_witnesses=self._passage_witnesses(support),
                    evidence_ids=support_ids,
                    relation_type=relation.relation_type,
                    related_id=related_id,
                )
            )

        row_order = {"EVIDENCE": 0, "CLAIM": 1, "RELATION": 2}
        rows.sort(key=lambda row: (row_order[row.row_type], row.row_id))
        source_absence_established = not unlocked_only and not canonical_subject_support
        return DossierView(
            subject=subject,
            rows=tuple(rows),
            source_absence_established=source_absence_established,
        )
