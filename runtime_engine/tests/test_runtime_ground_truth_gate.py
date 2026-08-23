import unittest

from scripture_archive_runtime.application import RuntimeApplication
from scripture_archive_runtime.content import ContentRepository
from scripture_archive_runtime.security import ValidationError
from tests.fixtures import LN01_N03, node_from


class RuntimeGroundTruthGateTests(unittest.TestCase):
    @staticmethod
    def _command(command, payload, request_id="gate"):
        return {
            "api_version": "runtime.v1",
            "command": command,
            "request_id": request_id,
            "payload": payload,
        }

    @staticmethod
    def _valid_choice_answer():
        return {
            "schema": "ANSWER_DTO_v1",
            "task_type": "SINGLE_CHOICE",
            "choice": LN01_N03["accepted_answer"],
        }

    def test_load_exposes_non_answer_provenance_metadata(self):
        app = RuntimeApplication(ContentRepository([LN01_N03]))
        loaded = app.load_task("LN01-N03")
        provenance = loaded["task"]["ground_truth_provenance"]
        self.assertEqual(provenance["schema"], "GROUND_TRUTH_PROVENANCE_v1")
        self.assertTrue(provenance["release_pass"])
        self.assertIn(provenance["class"], {
            "AUTHORED_DIRECT_PASS",
            "CANONICAL_LOSSLESS_NORMALIZATION_PASS",
            "LEGACY_EXPLICIT_NORMALIZATION_PASS",
        })
        self.assertNotIn("canonical_dto", provenance)

    def test_runtime_rejects_conflicting_explicit_grading_truth_before_render(self):
        bad = node_from(
            LN01_N03,
            task_type="SINGLE_CHOICE",
            grading={"accepted_choice": "DIRECT TEXT in Mark."},
        )
        app = RuntimeApplication(ContentRepository([bad]))
        with self.assertRaisesRegex(ValidationError, "MISMATCH_FAIL"):
            app.load_task("LN01-N03")
        self.assertIsNone(app.current_node_id)

    def test_task_payload_cannot_rescue_missing_canonical_ground_truth(self):
        bad = node_from(
            LN01_N03,
            task_type="SINGLE_CHOICE",
            accepted_answer="",
            task_payload={"correct": "DIRECT TEXT in Mark."},
        )
        app = RuntimeApplication(ContentRepository([bad]))
        with self.assertRaisesRegex(ValidationError, "ADAPTER_INFERENCE_FAIL"):
            app.load_task("LN01-N03")

    def test_runtime_command_requires_answer_dto_object(self):
        app = RuntimeApplication(ContentRepository([LN01_N03]))
        app.handle(self._command("load_task", {"node_id": "LN01-N03"}, "load"))
        with self.assertRaisesRegex(ValidationError, "ANSWER_DTO_v1 object form"):
            app.handle(self._command("submit_answer", {
                "node_id": "LN01-N03",
                "answer": LN01_N03["accepted_answer"],
            }, "submit-raw"))

    def test_runtime_command_rejects_unknown_answer_fields(self):
        app = RuntimeApplication(ContentRepository([LN01_N03]))
        app.handle(self._command("load_task", {"node_id": "LN01-N03"}, "load"))
        answer = self._valid_choice_answer()
        answer["derived_correctness"] = True
        with self.assertRaisesRegex(ValidationError, "Unknown answer DTO fields"):
            app.handle(self._command("submit_answer", {
                "node_id": "LN01-N03",
                "answer": answer,
            }, "submit-extra"))

    def test_runtime_command_accepts_versioned_dto_and_preserves_confidence_tx1(self):
        node = node_from(LN01_N03, textual_variant_flag="TX1")
        app = RuntimeApplication(ContentRepository([node]))
        app.handle(self._command("load_task", {"node_id": "LN01-N03"}, "load"))
        out = app.handle(self._command("submit_answer", {
            "node_id": "LN01-N03",
            "answer": self._valid_choice_answer(),
        }, "submit"))
        self.assertEqual(out["grade"]["correctness"], "CORRECT")
        self.assertEqual(out["grade"]["confidence"], "T2")
        self.assertTrue(out["grade"]["tx1"])
        self.assertIn("translation", out["grade"]["uncertainty"].casefold())


if __name__ == "__main__":
    unittest.main()
