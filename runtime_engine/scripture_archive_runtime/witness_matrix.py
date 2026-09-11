from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable, Mapping, Sequence

from .evidence import EvidenceRecord, EvidenceRuntime, Relation

WITNESS_MATRIX_SCHEMA = "witness-matrix.v1"
PARALLEL_WITNESS_RELATION = "parallel_witness"
NOT_STATED = "not_stated_in_visible_scope"
STATED = "stated"


@dataclass(frozen=True)
class WitnessCell:
    witness: str
    status: str
    evidence: tuple[Mapping[str, Any], ...]

    def to_dict(self) -> dict[str, Any]:
        return {
            "witness": self.witness,
            "status": self.status,
            "evidence": [dict(item) for item in self.evidence],
        }


@dataclass(frozen=True)
class WitnessMatrixRow:
    row_id: str
    evidence_ids: tuple[str, ...]
    cells: tuple[WitnessCell, ...]
    relations: tuple[Mapping[str, Any], ...]
    claims: tuple[Mapping[str, Any], ...]
    unassigned_evidence: tuple[Mapping[str, Any], ...]

    def to_dict(self) -> dict[str, Any]:
        return {
            "row_id": self.row_id,
            "evidence_ids": list(self.evidence_ids),
            "cells": [cell.to_dict() for cell in self.cells],
            "relations": [dict(item) for item in self.relations],
            "claims": [dict(item) for item in self.claims],
            "unassigned_evidence": [dict(item) for item in self.unassigned_evidence],
        }


@dataclass(frozen=True)
class WitnessMatrix:
    witnesses: tuple[str, ...]
    evidence_scope: str
    rows: tuple[WitnessMatrixRow, ...]
    schema: str = WITNESS_MATRIX_SCHEMA

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema": self.schema,
            "evidence_scope": self.evidence_scope,
            "witnesses": list(self.witnesses),
            "absence_semantics": (
                f"{NOT_STATED} means this derived row has no visible witness-local record; "
                "it is not denial, contradiction, or proof that the source omits the proposition."
            ),
            "contradiction_semantics": "not_inferred",
            "rows": [row.to_dict() for row in self.rows],
        }

    def linearize(self) -> list[str]:
        lines = [
            "Witness Matrix",
            f"Evidence scope: {self.evidence_scope}",
            (
                "Absence rule: a not-stated cell means no visible witness-local record in this "
                "derived row; it is not denial or a contradiction finding."
            ),
        ]
        for index, row in enumerate(self.rows, start=1):
            lines.append(f"Comparison row {index}: {', '.join(row.evidence_ids)}")
            for cell in row.cells:
                lines.append(f"{cell.witness}: {cell.status}")
                for record in cell.evidence:
                    tx1 = " TX1" if record["tx1"] else ""
                    lines.append(
                        f"  Evidence {record['evidence_id']}: {record['proposition']} "
                        f"[{record['confidence']}{tx1}]"
                    )
                    for passage in record["passage_refs"]:
                        verse = str(passage["verse_start"])
                        if passage["verse_end"] is not None:
                            verse += f"-{passage['verse_end']}"
                        lines.append(
                            f"    Passage {passage['passage_id']}: "
                            f"{passage['book']} {passage['chapter']}:{verse}"
                        )
            for claim in row.claims:
                tx1 = " TX1" if claim["tx1"] else ""
                lines.append(
                    f"Claim {claim['claim_id']}: {claim['proposition']} "
                    f"[{claim['confidence']}{tx1}]"
                )
                if claim["source_scope"]:
                    lines.append(f"  Source scope: {claim['source_scope']}")
                if claim["uncertainty"]:
                    lines.append(f"  Uncertainty: {claim['uncertainty']}")
            for record in row.unassigned_evidence:
                lines.append(
                    f"Unassigned witness evidence {record['evidence_id']}: {record['proposition']}"
                )
        return lines


def build_witness_matrix(
    runtime: EvidenceRuntime,
    *,
    witnesses: Sequence[str],
    evidence_ids: Iterable[str] | None = None,
    include_locked_evidence: bool = False,
) -> WitnessMatrix:
    normalized_witnesses = _validate_witnesses(witnesses)
    selected_ids = _select_evidence_ids(
        runtime,
        evidence_ids=evidence_ids,
        include_locked_evidence=include_locked_evidence,
    )
    visible_relations = tuple(
        relation
        for relation in sorted(runtime.relations.values(), key=lambda item: item.relation_id)
        if relation.relation_type == PARALLEL_WITNESS_RELATION
        and relation.source_id in selected_ids
        and relation.target_id in selected_ids
    )
    components = _parallel_components(selected_ids, visible_relations)

    rows: list[WitnessMatrixRow] = []
    for component in components:
        component_set = set(component)
        relations = tuple(
            _relation_payload(relation)
            for relation in visible_relations
            if relation.source_id in component_set and relation.target_id in component_set
        )
        assigned: dict[str, list[Mapping[str, Any]]] = {
            witness: [] for witness in normalized_witnesses
        }
        unassigned: list[Mapping[str, Any]] = []
        for evidence_id in component:
            record = runtime.evidence[evidence_id]
            payload = _evidence_payload(record)
            resolved_witness = _record_witness(record)
            if resolved_witness in assigned:
                assigned[resolved_witness].append(payload)
            else:
                unassigned.append(
                    {
                        **payload,
                        "resolved_witness": resolved_witness,
                    }
                )

        safe_claims = tuple(
            _claim_payload(claim)
            for claim in sorted(runtime.claims.values(), key=lambda item: item.claim_id)
            if claim.required_evidence_ids
            and set(claim.required_evidence_ids).issubset(component_set)
        )
        cells = tuple(
            WitnessCell(
                witness=witness,
                status=STATED if assigned[witness] else NOT_STATED,
                evidence=tuple(assigned[witness]),
            )
            for witness in normalized_witnesses
        )
        rows.append(
            WitnessMatrixRow(
                row_id="parallel:" + "|".join(component),
                evidence_ids=component,
                cells=cells,
                relations=relations,
                claims=safe_claims,
                unassigned_evidence=tuple(unassigned),
            )
        )

    return WitnessMatrix(
        witnesses=normalized_witnesses,
        evidence_scope="all_runtime_evidence" if include_locked_evidence else "unlocked_only",
        rows=tuple(rows),
    )


def _validate_witnesses(witnesses: Sequence[str]) -> tuple[str, ...]:
    normalized: list[str] = []
    seen: set[str] = set()
    for raw in witnesses:
        if not isinstance(raw, str) or not raw.strip():
            raise ValueError("Witness names must be non-empty strings")
        witness = raw.strip()
        if witness in seen:
            raise ValueError(f"Duplicate witness: {witness}")
        seen.add(witness)
        normalized.append(witness)
    if len(normalized) < 2:
        raise ValueError("Witness Matrix requires at least two witnesses")
    return tuple(normalized)


def _select_evidence_ids(
    runtime: EvidenceRuntime,
    *,
    evidence_ids: Iterable[str] | None,
    include_locked_evidence: bool,
) -> set[str]:
    if evidence_ids is None:
        selected = set(runtime.evidence) if include_locked_evidence else set(runtime.unlocked)
    else:
        selected = set()
        for evidence_id in evidence_ids:
            if evidence_id not in runtime.evidence:
                raise KeyError(evidence_id)
            if not include_locked_evidence and evidence_id not in runtime.unlocked:
                raise PermissionError(f"Evidence not unlocked: {evidence_id}")
            selected.add(evidence_id)
    unknown_unlocked = selected - set(runtime.evidence)
    if unknown_unlocked:
        raise ValueError(f"Unlocked evidence missing from runtime: {sorted(unknown_unlocked)}")
    return selected


def _parallel_components(
    evidence_ids: set[str],
    relations: Sequence[Relation],
) -> tuple[tuple[str, ...], ...]:
    parent = {evidence_id: evidence_id for evidence_id in evidence_ids}

    def find(item: str) -> str:
        while parent[item] != item:
            parent[item] = parent[parent[item]]
            item = parent[item]
        return item

    def union(left: str, right: str) -> None:
        left_root = find(left)
        right_root = find(right)
        if left_root == right_root:
            return
        if left_root < right_root:
            parent[right_root] = left_root
        else:
            parent[left_root] = right_root

    for relation in relations:
        union(relation.source_id, relation.target_id)

    grouped: dict[str, list[str]] = {}
    for evidence_id in sorted(evidence_ids):
        grouped.setdefault(find(evidence_id), []).append(evidence_id)
    return tuple(
        sorted(
            (tuple(sorted(items)) for items in grouped.values()),
            key=lambda items: items,
        )
    )


def _record_witness(record: EvidenceRecord) -> str | None:
    record_witness = record.witness.strip() if record.witness and record.witness.strip() else None
    passage_witnesses = {
        passage.witness.strip()
        for passage in record.passage_refs
        if passage.witness and passage.witness.strip()
    }
    if record_witness is not None:
        if passage_witnesses and passage_witnesses != {record_witness}:
            return None
        return record_witness
    if len(passage_witnesses) == 1:
        return next(iter(passage_witnesses))
    return None


def _evidence_payload(record: EvidenceRecord) -> dict[str, Any]:
    return {
        "evidence_id": record.evidence_id,
        "proposition": record.proposition,
        "confidence": record.confidence.value,
        "tx1": record.tx1,
        "witness": record.witness,
        "entity_ids": list(record.entity_ids),
        "relation_ids": list(record.relation_ids),
        "passage_refs": [
            {
                "passage_id": passage.passage_id,
                "book": passage.book,
                "chapter": passage.chapter,
                "verse_start": passage.verse_start,
                "verse_end": passage.verse_end,
                "witness": passage.witness,
            }
            for passage in record.passage_refs
        ],
    }


def _relation_payload(relation: Relation) -> dict[str, Any]:
    return {
        "relation_id": relation.relation_id,
        "source_id": relation.source_id,
        "relation_type": relation.relation_type,
        "target_id": relation.target_id,
        "witness": relation.witness,
        "passage_ids": list(relation.passage_ids),
    }


def _claim_payload(claim) -> dict[str, Any]:
    return {
        "claim_id": claim.claim_id,
        "proposition": claim.proposition,
        "confidence": claim.confidence.value,
        "tx1": claim.tx1,
        "source_scope": claim.source_scope,
        "uncertainty": claim.uncertainty,
        "required_evidence_ids": list(claim.required_evidence_ids),
        "witness": claim.witness,
    }
