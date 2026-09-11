from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable, Mapping, Sequence

from .evidence import EvidenceRecord, EvidenceRuntime, Relation
from .evidence_provenance import validated_claim_witness, validated_relation_witness

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
    selection_scope: str
    rows: tuple[WitnessMatrixRow, ...]
    schema: str = WITNESS_MATRIX_SCHEMA

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema": self.schema,
            "evidence_scope": self.evidence_scope,
            "selection_scope": self.selection_scope,
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
            f"Selection scope: {self.selection_scope}",
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
                    lines.extend(_linear_evidence(record, indent="  "))
            for relation in row.relations:
                relation_line = (
                    f"Relation {relation['relation_id']}: {relation['source_id']} --"
                    f"{relation['relation_type']}--> {relation['target_id']}"
                )
                if relation["witness"]:
                    relation_line += f"; witness={relation['witness']}"
                lines.append(relation_line)
                if relation["passage_ids"]:
                    lines.append(f"  Passage IDs: {', '.join(relation['passage_ids'])}")
            for claim in row.claims:
                tx1 = " TX1" if claim["tx1"] else ""
                lines.append(
                    f"Claim {claim['claim_id']}: {claim['proposition']} "
                    f"[{claim['confidence']}{tx1}]"
                )
                if claim["witness"]:
                    lines.append(f"  Witness: {claim['witness']}")
                lines.append(
                    "  Required evidence IDs: "
                    + (", ".join(claim["required_evidence_ids"]) or "none")
                )
                if claim["source_scope"]:
                    lines.append(f"  Source scope: {claim['source_scope']}")
                if claim["uncertainty"]:
                    lines.append(f"  Uncertainty: {claim['uncertainty']}")
            for record in row.unassigned_evidence:
                tx1 = " TX1" if record["tx1"] else ""
                lines.append(
                    f"Unassigned witness evidence {record['evidence_id']}: "
                    f"{record['proposition']} [{record['confidence']}{tx1}]"
                )
                lines.extend(_linear_evidence_metadata(record, indent="  "))
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
        witnesses=set(normalized_witnesses),
        evidence_ids=evidence_ids,
        include_locked_evidence=include_locked_evidence,
    )
    visible_passage_ids = {
        passage.passage_id
        for evidence_id in selected_ids
        for passage in runtime.evidence[evidence_id].passage_refs
    }
    visible_relations = tuple(
        relation
        for relation in sorted(runtime.relations.values(), key=lambda item: item.relation_id)
        if relation.relation_type == PARALLEL_WITNESS_RELATION
        and relation.source_id in selected_ids
        and relation.target_id in selected_ids
    )
    visible_relation_ids_by_evidence: dict[str, set[str]] = {
        evidence_id: set() for evidence_id in selected_ids
    }
    for relation in visible_relations:
        visible_relation_ids_by_evidence[relation.source_id].add(relation.relation_id)
        visible_relation_ids_by_evidence[relation.target_id].add(relation.relation_id)
    components = _parallel_components(selected_ids, visible_relations)

    rows: list[WitnessMatrixRow] = []
    for component in components:
        component_set = set(component)
        relations = tuple(
            _relation_payload(
                relation,
                visible_passage_ids=visible_passage_ids,
                witness=validated_relation_witness(
                    runtime,
                    relation,
                    (relation.source_id, relation.target_id),
                    visible_evidence_ids=component_set,
                ),
            )
            for relation in visible_relations
            if relation.source_id in component_set and relation.target_id in component_set
        )
        assigned: dict[str, list[Mapping[str, Any]]] = {
            witness: [] for witness in normalized_witnesses
        }
        unassigned: list[Mapping[str, Any]] = []
        for evidence_id in component:
            record = runtime.evidence[evidence_id]
            payload = _evidence_payload(
                record,
                visible_relation_ids=visible_relation_ids_by_evidence[evidence_id],
            )
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
            _claim_payload(
                claim,
                witness=validated_claim_witness(
                    runtime,
                    claim,
                    visible_evidence_ids=component_set,
                ),
            )
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
        selection_scope="requested_witnesses" if evidence_ids is None else "explicit_evidence_ids",
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
    witnesses: set[str],
    evidence_ids: Iterable[str] | None,
    include_locked_evidence: bool,
) -> set[str]:
    allowed = set(runtime.evidence) if include_locked_evidence else set(runtime.unlocked)
    unknown_unlocked = allowed - set(runtime.evidence)
    if unknown_unlocked:
        raise ValueError(f"Unlocked evidence missing from runtime: {sorted(unknown_unlocked)}")

    if evidence_ids is None:
        return {
            evidence_id
            for evidence_id in allowed
            if _record_witness_signals(runtime.evidence[evidence_id]) & witnesses
        }

    selected: set[str] = set()
    for evidence_id in evidence_ids:
        if evidence_id not in runtime.evidence:
            raise KeyError(evidence_id)
        if not include_locked_evidence and evidence_id not in runtime.unlocked:
            raise PermissionError(f"Evidence not unlocked: {evidence_id}")
        selected.add(evidence_id)
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


def _record_witness_signals(record: EvidenceRecord) -> set[str]:
    signals: set[str] = set()
    if record.witness and record.witness.strip():
        signals.add(record.witness.strip())
    signals.update(
        passage.witness.strip()
        for passage in record.passage_refs
        if passage.witness and passage.witness.strip()
    )
    return signals


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


def _evidence_payload(
    record: EvidenceRecord,
    *,
    visible_relation_ids: set[str],
) -> dict[str, Any]:
    return {
        "evidence_id": record.evidence_id,
        "proposition": record.proposition,
        "confidence": record.confidence.value,
        "tx1": record.tx1,
        "witness": record.witness,
        "entity_ids": list(record.entity_ids),
        "relation_ids": [
            relation_id for relation_id in record.relation_ids
            if relation_id in visible_relation_ids
        ],
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


def _relation_payload(
    relation: Relation,
    *,
    visible_passage_ids: set[str],
    witness: str | None,
) -> dict[str, Any]:
    return {
        "relation_id": relation.relation_id,
        "source_id": relation.source_id,
        "relation_type": relation.relation_type,
        "target_id": relation.target_id,
        "witness": witness,
        "passage_ids": [
            passage_id for passage_id in relation.passage_ids
            if passage_id in visible_passage_ids
        ],
    }


def _claim_payload(claim, *, witness: str | None) -> dict[str, Any]:
    return {
        "claim_id": claim.claim_id,
        "proposition": claim.proposition,
        "confidence": claim.confidence.value,
        "tx1": claim.tx1,
        "source_scope": claim.source_scope,
        "uncertainty": claim.uncertainty,
        "required_evidence_ids": list(claim.required_evidence_ids),
        "witness": witness,
    }


def _linear_evidence(record: Mapping[str, Any], *, indent: str) -> list[str]:
    tx1 = " TX1" if record["tx1"] else ""
    lines = [
        f"{indent}Evidence {record['evidence_id']}: {record['proposition']} "
        f"[{record['confidence']}{tx1}]"
    ]
    lines.extend(_linear_evidence_metadata(record, indent=indent + "  "))
    return lines


def _linear_evidence_metadata(record: Mapping[str, Any], *, indent: str) -> list[str]:
    lines: list[str] = []
    if record["witness"]:
        lines.append(f"{indent}Record witness: {record['witness']}")
    if record["entity_ids"]:
        lines.append(f"{indent}Entity IDs: {', '.join(record['entity_ids'])}")
    if record["relation_ids"]:
        lines.append(f"{indent}Visible relation IDs: {', '.join(record['relation_ids'])}")
    for passage in record["passage_refs"]:
        verse = str(passage["verse_start"])
        if passage["verse_end"] is not None:
            verse += f"-{passage['verse_end']}"
        witness = f"; witness={passage['witness']}" if passage["witness"] else ""
        lines.append(
            f"{indent}Passage {passage['passage_id']}: "
            f"{passage['book']} {passage['chapter']}:{verse}{witness}"
        )
    return lines
