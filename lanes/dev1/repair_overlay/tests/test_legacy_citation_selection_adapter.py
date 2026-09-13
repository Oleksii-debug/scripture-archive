from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
import unittest

from scripture_archive_runtime.answer_contracts import canonical_task_type
from scripture_archive_runtime.package_adapters import adapt_node_for_runtime, iter_nodes_from_payload
from scripture_archive_runtime.security import ValidationError


class LegacyCitationSelectionAdapterTests(unittest.TestCase):
    def test_real_ln01_source_is_unchanged_and_runtime_copy_is_exact_list(self) -> None:
        repo_root = Path(__file__).resolve().parents[4]
        source = repo_root / "docs" / "campaigns" / "LN" / "LN-01_CANONICAL_v1.2" / "nodes_part_01.json"
        source_before = source.read_bytes()
        payload = json.loads(source_before.decode("utf-8"))
        node = next(item for item in iter_nodes_from_payload(payload) if item.get("node_id") == "LN01-N01")
        node_before = deepcopy(dict(node))

        adapted = adapt_node_for_runtime(node, lane="DEV1-regression")

        expected = [
            "Matthew 26:17–19",
            "Mark 14:12–16",
            "Luke 22:7–13.",
        ]
        self.assertEqual(dict(node), node_before)
        self.assertEqual(source.read_bytes(), source_before)
        self.assertEqual(adapted["task_type"], "MULTI_SELECT")
        self.assertEqual(adapted["accepted_answer"], expected)
        self.assertEqual(adapted["answer_dto"]["choices"], expected)
        self.assertEqual(adapted["grading"]["accepted_set"], expected)

    def test_generic_multiselect_scalar_remains_strict(self) -> None:
        with self.assertRaisesRegex(ValidationError, "non-empty canonical list"):
            adapt_node_for_runtime({"task_type": "MULTI_SELECT", "accepted_answer": "A; B"})

    def test_ambiguous_legacy_scalars_fail_closed(self) -> None:
        for value in ("A", "A;;B", " ; "):
            with self.subTest(value=value):
                with self.assertRaisesRegex(ValidationError, "legacy citation selection"):
                    adapt_node_for_runtime({"response_mode": "citation selection", "accepted_answer": value})

    def test_canonical_legacy_mode_list_needs_no_scalar_normalization(self) -> None:
        adapted = adapt_node_for_runtime(
            {"response_mode": "citation selection", "accepted_answer": ["A", "B"]},
            lane="DEV1-regression",
        )
        self.assertEqual(adapted["accepted_answer"], ["A", "B"])
        self.assertEqual(adapted["answer_dto"]["choices"], ["A", "B"])

    def test_short_free_response_uses_established_short_text_contract(self) -> None:
        self.assertEqual("SHORT_TEXT", canonical_task_type("SHORT_FREE_RESPONSE"))
        adapted = adapt_node_for_runtime(
            {"task_type": "SHORT_FREE_RESPONSE", "accepted_answer": "Explicit authored answer"},
            lane="DEV1-regression",
        )
        self.assertEqual("SHORT_TEXT", adapted["task_type"])
        self.assertEqual("Explicit authored answer", adapted["answer_dto"]["text"])


if __name__ == "__main__":
    unittest.main()
