from __future__ import annotations

from typing import Iterable

from .evidence import Claim, EvidenceRecord, EvidenceRuntime, Relation


def _contains_forbidden_control(value: str) -> bool:
    """Return whether an identity token contains unsafe control separators."""

    return any(
        ord(character) < 0x20
        or 0x7F <= ord(character) <= 0x9F
        or character in {"\u2028", "\u2029"}
        for character in value
    )


def _clean_witness(value: str | None) -> str | None:
    """Return an exact canonical witness token; never normalize malformed input."""

    if not isinstance(value, str) or not value or value != value.strip():
        return None
    if _contains_forbidden_control(value):
        return None
    return value


def _evidence_id_tuple(values: Iterable[str]) -> tuple[str, ...] | None:
    if isinstance(values, (str, bytes)):
        return None
    try:
        requested = tuple(values)
    except TypeError:
        return None
    if any(
        not isinstance(evidence_id, str)
        or not evidence_id
        or evidence_id != evidence_id.strip()
        for evidence_id in requested
    ):
        return None
    return requested


def _clean_relation_token(value: object) -> str | None:
    """Validate an exact relation identifier before any hashing/membership use."""

    if not isinstance(value, str) or not value or value != value.strip():
        return None
    if _contains_forbidden_control(value):
        return None
    return value


def _relation_passage_id_tuple(values: object) -> tuple[str, ...] | None:
    if isinstance(values, (str, bytes)):
        return None
    try:
        passage_ids = tuple(values)  # type: ignore[arg-type]
    except TypeError:
        return None
    if any(_clean_relation_token(passage_id) is None for passage_id in passage_ids):
        return None
    return passage_ids


def _validated_relation_tokens(
    relation: Relation,
) -> tuple[str, str, tuple[str, ...]] | None:
    """Validate relation identity/endpoints/passage IDs before set/dict membership."""

    if _clean_relation_token(relation.relation_id) is None:
        return None
    source_id = _clean_relation_token(relation.source_id)
    target_id = _clean_relation_token(relation.target_id)
    passage_ids = _relation_passage_id_tuple(relation.passage_ids)
    if source_id is None or target_id is None or passage_ids is None:
        return None
    return source_id, target_id, passage_ids


def resolve_evidence_witness(record: EvidenceRecord) -> str | None:
    """Resolve source-local witness attribution without harmonizing conflicts."""

    if record.witness is not None:
        record_witness = _clean_witness(record.witness)
        if record_witness is None:
            return None
    else:
        record_witness = None

    passage_witnesses: set[str] = set()
    for passage in record.passage_refs:
        if passage.witness is None:
            continue
        witness = _clean_witness(passage.witness)
        if witness is None:
            return None
        passage_witnesses.add(witness)

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

    requested = _evidence_id_tuple(evidence_ids)
    if not requested:
        return None

    visible = set(runtime.unlocked if visible_evidence_ids is None else visible_evidence_ids)
    resolved: str | None = None
    for evidence_id in requested:
        if evidence_id not in visible:
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


def _complete_relation_support(
    runtime: EvidenceRuntime,
    relation: Relation,
    support_evidence_ids: Iterable[str],
    *,
    visible_evidence_ids: Iterable[str] | None = None,
) -> tuple[str, ...] | None:
    """Validate caller support and require every evidence-backed relation endpoint."""

    relation_tokens = _validated_relation_tokens(relation)
    if relation_tokens is None:
        return None
    source_id, target_id, _ = relation_tokens

    requested = _evidence_id_tuple(support_evidence_ids)
    if requested is None:
        return None

    visible = set(runtime.unlocked if visible_evidence_ids is None else visible_evidence_ids)
    requested_set = set(requested)
    mandatory_endpoint_ids = {
        endpoint_id
        for endpoint_id in (source_id, target_id)
        if endpoint_id in runtime.evidence
    }
    if not mandatory_endpoint_ids.issubset(requested_set):
        return None

    for evidence_id in requested:
        if evidence_id not in runtime.evidence or evidence_id not in visible:
            return None
    return requested


def validated_relation_witness(
    runtime: EvidenceRuntime,
    relation: Relation,
    support_evidence_ids: Iterable[str],
    *,
    visible_evidence_ids: Iterable[str] | None = None,
) -> str | None:
    """Resolve relation witness only from complete visible support.

    Any relation endpoint that names an EvidenceRuntime evidence record is
    mandatory support. A caller cannot omit a contradictory or hidden evidence
    endpoint and still receive validated source-local witness attribution.
    Non-evidence endpoints remain valid when callers provide explicit canonical
    evidence support for the relation.
    """

    requested = _complete_relation_support(
        runtime,
        relation,
        support_evidence_ids,
        visible_evidence_ids=visible_evidence_ids,
    )
    if not requested:
        return None
    return validated_declared_witness(
        runtime,
        relation.witness,
        requested,
        visible_evidence_ids=visible_evidence_ids,
    )


def visible_relation_passage_ids(
    runtime: EvidenceRuntime,
    relation: Relation,
    support_evidence_ids: Iterable[str],
    *,
    visible_evidence_ids: Iterable[str] | None = None,
) -> tuple[str, ...]:
    """Return relation passage IDs backed by complete visible support records.

    Relation metadata alone cannot make a passage visible. If an evidence-backed
    relation endpoint is omitted, hidden, or missing from support, the entire
    relation passage projection fails closed instead of publishing partial
    provenance. Output preserves declaration order and de-duplicates IDs.
    """

    relation_tokens = _validated_relation_tokens(relation)
    if relation_tokens is None:
        return ()
    _, _, relation_passage_ids = relation_tokens

    requested = _complete_relation_support(
        runtime,
        relation,
        support_evidence_ids,
        visible_evidence_ids=visible_evidence_ids,
    )
    if not requested:
        return ()

    backed_passage_ids: set[str] = set()
    for evidence_id in requested:
        record = runtime.evidence[evidence_id]
        backed_passage_ids.update(passage.passage_id for passage in record.passage_refs)

    result: list[str] = []
    seen: set[str] = set()
    for passage_id in relation_passage_ids:
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
