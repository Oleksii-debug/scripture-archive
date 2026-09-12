import pytest

from scripture_archive_runtime.package_adapters import adapt_node_for_runtime, derive_answer_dto
from scripture_archive_runtime.provenance import classify_provenance
from scripture_archive_runtime.security import ValidationError


def test_legacy_ordering_uses_only_explicit_canonical_arrow_sequence():
    node = {
        "response_mode": "ordering",
        "accepted_answer": "Enter city → encounter man carrying water → follow him → prepare Passover.",
        "task_payload": {"ordered_items": ["WRONG", "PRESENTATION", "ORDER"]},
    }

    dto = derive_answer_dto(node)
    assert dto["items"] == [
        "Enter city",
        "encounter man carrying water",
        "follow him",
        "prepare Passover.",
    ]

    adapted = adapt_node_for_runtime(node, lane="DEV1-regression")
    assert adapted["accepted_answer"] == dto["items"]
    assert adapted["grading"]["accepted_order"] == dto["items"]
    decision = classify_provenance(adapted)
    assert decision.release_pass is True
    assert decision.canonical_dto["items"] == dto["items"]


def test_legacy_ordering_without_explicit_arrow_fails_closed_even_with_payload_order():
    node = {
        "response_mode": "ordering",
        "accepted_answer": "Enter city, then follow the man, then prepare Passover.",
        "task_payload": {"ordered_items": ["Enter city", "follow the man", "prepare Passover"]},
    }

    with pytest.raises(ValidationError, match="explicit canonical arrow sequence"):
        derive_answer_dto(node)
    with pytest.raises(ValidationError, match="explicit canonical arrow sequence"):
        adapt_node_for_runtime(node, lane="DEV1-regression")
