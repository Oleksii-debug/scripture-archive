#!/usr/bin/env python3
from __future__ import annotations

import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
for entry in (
    REPO_ROOT / "runtime_engine",
    REPO_ROOT / "runtime_engine" / "tests",
    REPO_ROOT / "tools",
):
    if str(entry) not in sys.path:
        sys.path.insert(0, str(entry))

from fixtures import LN01_N03
from scripture_archive_runtime.content_packs import ContentPackStore, inspect_content_pack
from validate_dev2_corrected_runtime_compat import (
    PACK_ID,
    PACK_VERSION,
    PARALLEL_WITNESS_FALLBACK_REASON,
    CompatibilityError,
    _project_nodes_for_current_runtime,
    _runtime_compatibility,
    write_preintegration_pack,
)


class D2CorrectedRuntimeCompatibilityTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_pack_writer_is_deterministic_and_installable(self) -> None:
        node = copy.deepcopy(LN01_N03)
        first = self.root / "first.zip"
        second = self.root / "second.zip"
        a = write_preintegration_pack([node], first, expected_node_count=1)
        b = write_preintegration_pack([copy.deepcopy(node)], second, expected_node_count=1)
        self.assertEqual(first.read_bytes(), second.read_bytes())
        self.assertEqual(a["archive_sha256"], b["archive_sha256"])
        inspected = inspect_content_pack(first)
        self.assertEqual(PACK_ID, inspected.manifest.pack_id)
        self.assertEqual(PACK_VERSION, inspected.manifest.version)
        self.assertEqual(1, inspected.node_count)

    def test_generic_runtime_self_grade_and_load_path_accepts_canonical_fixture(self) -> None:
        node = copy.deepcopy(LN01_N03)
        runtime = _runtime_compatibility([node], expected_node_count=1)
        self.assertEqual(1, runtime["repository_nodes"])
        self.assertEqual(1, runtime["self_grade_correct"])
        self.assertEqual(1, runtime["runtime_load_pass"])

        archive = self.root / "fixture.zip"
        write_preintegration_pack([node], archive, expected_node_count=1)
        store = ContentPackStore(self.root / "store")
        inspected = store.install(archive)
        self.assertEqual(1, inspected.node_count)
        store.activate(PACK_ID, PACK_VERSION)
        self.assertEqual({PACK_ID: PACK_VERSION}, store.active_versions())

    def _parallel_witness_fixture(self):
        node = copy.deepcopy(LN01_N03)
        synthesis = "Witness-safe synthesis for current-runtime compatibility."
        witnesses = ["Luke 22:8"]
        node["task_type"] = "PARALLEL_WITNESS_COMPARE"
        node["response_mode"] = "PARALLEL_WITNESS_COMPARE"
        node["task_family"] = "parallel_witness_compare"
        node["accepted_answer"] = {"synthesis": synthesis, "witnesses": witnesses}
        node["accepted_variants"] = {
            "synthesis_aliases": [synthesis],
            "witnesses": witnesses,
        }
        node["grading"] = {
            "accepted_propositions": [
                {"id": "P1", "required": True, "aliases": [synthesis]}
            ],
            "provenance_required": True,
            "required_witnesses": witnesses,
        }
        node["response_contract"] = {
            "kind": "witness_compare",
            "answer_dto": {
                "shape": "object",
                "fields": {"synthesis": "string", "witnesses": "array[passage]"},
            },
        }
        node["runtime_fallback"] = {
            "task_type": "LONG_TEXT",
            "accepted_answer": synthesis,
            "reason": PARALLEL_WITNESS_FALLBACK_REASON,
        }
        return node

    def test_parallel_witness_structured_path_is_lossless_and_source_immutable(self) -> None:
        node = self._parallel_witness_fixture()
        original = copy.deepcopy(node)
        projected, structured_ids = _project_nodes_for_current_runtime([node])
        self.assertEqual(original, node)
        self.assertEqual([node["node_id"]], structured_ids)
        self.assertEqual("PARALLEL_WITNESS_COMPARE", projected[0]["task_type"])
        self.assertEqual(node["accepted_answer"], projected[0]["accepted_answer"])

        runtime = _runtime_compatibility([node], expected_node_count=1)
        self.assertEqual(1, runtime["structured_witness_count"])
        self.assertEqual([node["node_id"]], runtime["structured_witness_node_ids"])
        self.assertEqual(0, runtime["runtime_fallback_count"])
        self.assertEqual([], runtime["runtime_fallback_node_ids"])

    def test_parallel_witness_historical_fallback_metadata_mismatch_fails_closed(self) -> None:
        node = self._parallel_witness_fixture()
        node["runtime_fallback"]["accepted_answer"] = "Different synthesis"
        with self.assertRaisesRegex(CompatibilityError, "historical runtime_fallback metadata changed"):
            _project_nodes_for_current_runtime([node])

    def test_parallel_witness_truth_binding_mismatch_fails_closed(self) -> None:
        node = self._parallel_witness_fixture()
        node["grading"]["required_witnesses"] = ["Acts 1:1"]
        with self.assertRaisesRegex(CompatibilityError, "structured witness truth bindings changed"):
            _project_nodes_for_current_runtime([node])

    def test_conflicting_explicit_grading_truth_fails_closed(self) -> None:
        node = copy.deepcopy(LN01_N03)
        node["grading"] = {"accepted_choice": "CONTRADICTS CANONICAL ANSWER"}
        with self.assertRaisesRegex(
            CompatibilityError,
            "provenance rejects corrected node",
        ):
            _runtime_compatibility([node], expected_node_count=1)

    def test_missing_nonvisual_equivalent_fails_before_runtime_promotion(self) -> None:
        node = copy.deepcopy(LN01_N03)
        node["functional_nonvisual_equivalent"] = ""
        with self.assertRaisesRegex(
            CompatibilityError,
            "current runtime rejected corrected D2 corpus",
        ):
            _runtime_compatibility([node], expected_node_count=1)

    def test_workflow_requalifies_when_runtime_or_bound_package_changes(self) -> None:
        workflow = (
            REPO_ROOT
            / ".github"
            / "workflows"
            / "r06-d2-corrected-runtime-preintegration.yml"
        ).read_text(encoding="utf-8")
        required_trigger_surfaces = (
            "tools/validate_dev2_corrected_runtime_compat.py",
            "tools/test_validate_dev2_corrected_runtime_compat.py",
            "tools/validate_dev2_evidence_bundle.py",
            "runtime_engine/scripture_archive_runtime/**",
            "lanes/dev1/repair_overlay/scripture_archive_platform/**",
            "lanes/dev1/repair_overlay/frontend/**",
            "docs/campaigns/PA/R06_DEV2_MATERIALIZATION_05/**",
        )
        for trigger in required_trigger_surfaces:
            self.assertGreaterEqual(
                workflow.count(f"      - '{trigger}'"),
                2,
                f"push and pull_request must both requalify on {trigger}",
            )
        self.assertIn('PYTHONDONTWRITEBYTECODE: "1"', workflow)
        self.assertNotIn("python -m py_compile tools/validate_dev2_corrected_runtime_compat.py", workflow)
        self.assertIn('dirty="$(git status --porcelain)"', workflow)
        self.assertIn("D2_RUNTIME_PREINTEGRATION_WORKTREE_DIRTY", workflow)


if __name__ == "__main__":
    unittest.main()
