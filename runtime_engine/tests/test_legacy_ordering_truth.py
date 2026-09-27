from __future__ import annotations

import unittest

from scripture_archive_runtime.package_adapters import (
    adapt_node_for_runtime,
    normalize_legacy_ordering_truth,
)
from scripture_archive_runtime.security import ValidationError


class LegacyOrderingTruthTests(unittest.TestCase):
    def test_explicit_arrow_ordering_is_losslessly_normalized(self) -> None:
        node = {
            "node_id": "LN01-N09",
            "response_mode": "ordering",
            "accepted_answer": "Enter city → encounter man carrying water → follow him → prepare Passover.",
        }

        normalized = normalize_legacy_ordering_truth(node)

        self.assertEqual(
            normalized["accepted_answer"],
            [
                "Enter city",
                "encounter man carrying water",
                "follow him",
                "prepare Passover.",
            ],
        )
        self.assertEqual(
            node["accepted_answer"],
            "Enter city → encounter man carrying water → follow him → prepare Passover.",
        )

    def test_ambiguous_ordering_string_stays_fail_closed(self) -> None:
        with self.assertRaisesRegex(ValidationError, "explicit arrow-delimited ordering"):
            normalize_legacy_ordering_truth(
                {
                    "node_id": "X-N01",
                    "response_mode": "ordering",
                    "accepted_answer": "First, then second",
                }
            )

    def test_existing_ordering_array_is_preserved(self) -> None:
        node = {
            "node_id": "X-N02",
            "response_mode": "ordering",
            "accepted_answer": ["First", "Second"],
        }
        normalized = normalize_legacy_ordering_truth(node)
        self.assertEqual(normalized["accepted_answer"], ["First", "Second"])

    def test_arrow_chronology_is_losslessly_ordered_by_node_context(self) -> None:
        node = {
            "node_id": "X-N03",
            "response_mode": "chronology",
            "task_family": "local chronology",
            "accepted_answer": "First → Second",
        }
        normalized = normalize_legacy_ordering_truth(node)
        self.assertEqual(normalized["accepted_answer"], ["First", "Second"])

    def test_runtime_adapter_feeds_exact_order_to_strict_dto(self) -> None:
        node = {
            "node_id": "LN04-N08",
            "mission_id": "LN-04",
            "response_mode": "ordering",
            "accepted_answer": "B → C → A → D.",
        }
        adapted = adapt_node_for_runtime(node, lane="LN-04")
        self.assertEqual(
            adapted["answer_dto"],
            {
                "schema": "ANSWER_DTO_v1",
                "task_type": "ORDERING",
                "items": ["B", "C", "A", "D."],
            },
        )
        self.assertEqual(adapted["grading"]["accepted_order"], ["B", "C", "A", "D."])
        self.assertEqual(
            adapted["runtime_adapter"]["legacy_truth_normalization"],
            "explicit_arrow_ordering_v1",
        )


if __name__ == "__main__":
    unittest.main()
