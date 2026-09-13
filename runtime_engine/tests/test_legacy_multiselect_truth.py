from __future__ import annotations

import unittest

from scripture_archive_runtime.package_adapters import adapt_node_for_runtime, normalize_legacy_multiselect_truth
from scripture_archive_runtime.security import ValidationError


class LegacyMultiSelectTruthTests(unittest.TestCase):
    def test_explicit_semicolon_citation_selection_is_losslessly_normalized(self) -> None:
        node = {
            "node_id": "LN01-N01",
            "response_mode": "citation selection",
            "accepted_answer": "Matthew 26:17–19; Mark 14:12–16; Luke 22:7–13.",
        }

        normalized = normalize_legacy_multiselect_truth(node)

        self.assertEqual(
            normalized["accepted_answer"],
            ["Matthew 26:17–19", "Mark 14:12–16", "Luke 22:7–13."],
        )
        self.assertEqual(node["accepted_answer"], "Matthew 26:17–19; Mark 14:12–16; Luke 22:7–13.")

    def test_ambiguous_multiselect_string_stays_fail_closed(self) -> None:
        with self.assertRaisesRegex(ValidationError, "explicit semicolon-delimited citation selection"):
            normalize_legacy_multiselect_truth(
                {
                    "node_id": "X-N01",
                    "response_mode": "checkboxes",
                    "accepted_answer": "A; B",
                }
            )

    def test_single_citation_string_stays_fail_closed(self) -> None:
        with self.assertRaisesRegex(ValidationError, "explicit semicolon-delimited citation selection"):
            normalize_legacy_multiselect_truth(
                {
                    "node_id": "X-N02",
                    "response_mode": "citation selection",
                    "accepted_answer": "Matthew 26:17–19",
                }
            )

    def test_existing_multiselect_array_is_preserved(self) -> None:
        node = {
            "node_id": "X-N03",
            "response_mode": "citation selection",
            "accepted_answer": ["A", "B"],
        }
        normalized = normalize_legacy_multiselect_truth(node)
        self.assertEqual(normalized["accepted_answer"], ["A", "B"])

    def test_runtime_adapter_feeds_normalized_truth_to_strict_dto(self) -> None:
        node = {
            "node_id": "X-N04",
            "response_mode": "citation selection",
            "accepted_answer": "A; B; C",
        }
        adapted = adapt_node_for_runtime(node, lane="TEST")
        self.assertEqual(adapted["answer_dto"], {"type": "MULTI_SELECT", "choices": ["A", "B", "C"]})
        self.assertEqual(adapted["grading"]["accepted_set"], ["A", "B", "C"])
        self.assertEqual(
            adapted["runtime_adapter"]["legacy_truth_normalization"],
            "explicit_semicolon_citation_selection_v1",
        )


if __name__ == "__main__":
    unittest.main()
