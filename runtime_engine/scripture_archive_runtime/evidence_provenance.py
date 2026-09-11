from __future__ import annotations

from typing import Iterable

from .evidence import Claim, EvidenceRecord, EvidenceRuntime, Relation


def _clean_witness(value: str | None) -> str | None:
    if not isinstance(value, str):
        return None
    normalized = value.strip()
    return normalized or None


def resolve_evidence_witness(record: EvidenceRecord) -> str | None:
    """Resolve source-local witness attribution without harmonizing conflicts."""

    record_witness = _clean_witness(record.witness)
    passage_witnesses = {
        witness
        for passage in record.passage_refs
        if (witness := _clean_witness(passage.witness)) is not None
    }

    if record_witness is not None:
        if passage_witnesses and passage_witnesses != {record_witness}:
            return None
        return record_witness
    if len(passage_witnesses) == 1:
        return next(iter(passage_witnesses))
    return None


def resolve_support_witness(
    runtime: EvidenceRuntime,
    evidence_ids: Iterable[str],
    *,
    visible_evidence_ids: Iterable[str] | None = None,
) -> str | None:
    """Resolve one witness established by every record in visible support.

    The default visibility boundary is ``runtime.unlocked``. Missing, hidden,
    malformed, contradictory, or mixed-witness support fails closed to None.
    """

    requested = tuple(evidence_ids)
    if not requested:
        return None

    visible = set(runtime.unlocked if visible_evidence_ids is None else visible_evidence_ids)
    resolved: str | None = None
    for evidence_id in requested:
        if not isinstance(evidence_id, str) or not evidence_id or evidence_id not in visible:
            return None
        record = runtime.evidence.get(evidence_id)
        if record is None:
            return None
        witness = resolve_evidence_witness(record)
        if witness is None:
            return None
        if resolved is None:
            resolved = witness
        elif witness != resolved:
            return None
    return resolved


def validated_declared_witness(
    runtime: EvidenceRuntime,
    declared_witness: str | None,
    support_evidence_ids: Iterable[str],
    *,
    visible_evidence_ids: Iterable[str] | None = None,
) -> str | None:
    """Return declared source-local witness only when visible support proves it."""

    declared = _clean_witness(declared_witness)
    if declared is None:
        return None
    supported = resolve_support_witness(
        runtime,
        support_evidence_ids,
        visible_evidence_ids=visible_evidence_ids,
    )
    return declared if supported == declared else None


def validated_claim_witness(
    runtime: EvidenceRuntime,
    claim: Claim,
    *,
    visible_evidence_ids: Iterable[str] | None = None,
) -> str | None:
    """Resolve a claim witness from all of its explicit evidence support."""

    return validated_declared_witness(
        runtime,
        claim.witness,
        claim.required_evidence_ids,
        visible_evidence_ids=visible_evidence_ids,
    )


def validated_relation_witness(
    runtime: EvidenceRuntime,
    relation: Relation,
    support_evidence_ids: Iterable[str],
    *,
    visible_evidence_ids: Iterable[str] | None = None,
) -> str | None:
    """Resolve relation witness attribution from caller-identified visible support."""

    return validated_declared_witness(
        runtime,
        relation.witness,
        support_evidence_ids,
        visible_evidence_ids=visible_evidence_ids,
    )


def visible_relation_passage_ids(
    runtime: EvidenceRuntime,
    relation: Relation,
    support_evidence_ids: Iterable[str],
    *,
    visible_evidence_ids: Iterable[str] | None = None,
) -> tuple[str, ...]:
    """Return relation passage IDs actually backed by visible support records.

    Relation metadata alone cannot make a passage visible. Output preserves the
    declaration order and emits a duplicate passage ID at most once.
    """

    visible = set(runtime.unlocked if visible_evidence_ids is None else visible_evidence_ids)
    backed_passage_ids: set[str] = set()
    for evidence_id in support_evidence_ids:
        if not isinstance(evidence_id, str) or evidence_id not in visible:
            continue
        record = runtime.evidence.get(evidence_id)
        if record is None:
            continue
        backed_passage_ids.update(passage.passage_id for passage in record.passage_refs)

    result: list[str] = []
    seen: set[str] = set()
    for passage_id in relation.passage_ids:
        if passage_id in backed_passage_ids and passage_id not in seen:
            result.append(passage_id)
            seen.add(passage_id)
    return tuple(result)


__all__ = [
    "resolve_evidence_witness",
    "resolve_support_witness",
    "validated_declared_witness",
    "validated_claim_witness",
    "validated_relation_witness",
    "visible_relation_passage_ids",
]
