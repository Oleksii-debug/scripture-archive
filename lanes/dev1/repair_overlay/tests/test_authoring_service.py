import json
import tempfile
import unittest
from pathlib import Path

from scripture_archive_platform.authoring.service import AuthoringService
from scripture_archive_platform.content.loader import TaskPresentationMapper
from scripture_archive_platform.domain.registries import build_task_registries
from scripture_archive_platform.persistence.store import JsonFileStore


class ConstructorHardeningTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        ids = iter(["000000000001", "000000000002", "000000000003", "000000000004"])
        registry = build_task_registries()[0]
        self.service = AuthoringService(
            JsonFileStore(Path(self.tmp.name)), registry, TaskPresentationMapper(),
            clock=lambda: 1000, id_factory=lambda: next(ids),
        )

    def tearDown(self):
        self.tmp.cleanup()

    def populated_node(self, task_type="SHORT_TEXT"):
        d = self.service.new_node_from_task_type("Test node", task_type)
        n = d["node"]
        n.update({
            "node_id": "ZZ01-N99", "mission_id": "ZZ-01", "task_family": "source discipline",
            "difficulty": "2/6", "skill_target": "distinguish witnesses",
            "knowledge_target": "bounded proposition",
            "why_this_node_exists": "Distinct learning purpose without changing source truth.",
            "player_prompt": "Prompt", "source_scope_visible_to_player": "Fixture 1:1",
            "accepted_answer": "bounded answer", "accepted_variants": ["equivalent bounded answer"],
            "required_evidence": ["Fixture 1:1"], "rejected_answers": ["overclaim"],
            "rejection_reason": "Not stated in cited text.", "success_feedback": "Supported.",
            "partial_feedback": "Preserve source boundary.", "failure_feedback": "Re-read source.",
            "mastery_domains": ["SOURCE_SCOPE_DISCIPLINE"], "review_queue_rule": "ZZ_REVIEW",
            "later_retrieval_effect": "REVIEW_QUEUE ZZ_REVIEW",
        })
        n["hints"] = {f"H{i}": ("Guided answer with evidence." if i == 7 else f"Hint {i}") for i in range(1, 8)}
        return self.service.save_draft(d)

    def test_backward_shape_and_revision_stale_write_protection(self):
        d = self.service.new_draft("Node", "node")
        self.assertIn("campaign", d); self.assertIn("mission", d); self.assertIn("node", d)
        saved = self.service.save_draft(d)
        self.assertEqual(2, saved["revision"])
        with self.assertRaisesRegex(ValueError, "stale draft revision"):
            self.service.save_draft(d)

    def test_real_registry_mapper_preview_contract(self):
        d = self.populated_node()
        validation = self.service.validate_draft(d)
        self.assertTrue(validation["valid"], validation)
        preview = self.service.preview(d)
        self.assertEqual("ZZ01-N99", preview["renderable"]["node_id"])
        self.assertEqual("SHORT_TEXT", preview["renderable"]["task_type"])
        self.assertEqual("authoring-preview-heading", preview["focus_target"])

    def test_choice_publish_requires_declarative_options(self):
        d = self.populated_node("SINGLE_CHOICE")
        self.assertTrue(self.service.validate_draft(d)["valid"])
        with self.assertRaisesRegex(ValueError, "requires options"):
            self.service.prepare_publish_candidate(d)
        d["node"]["ui_metadata"]["options"] = [{"id":"a","label":"A"},{"id":"b","label":"B"}]
        d["node"]["answer_contract"] = {"accepted_choice_ids":["a"]}
        d = self.service.save_draft(d)
        candidate = self.service.prepare_publish_candidate(d)
        self.assertFalse(candidate["canonical_mutation_performed"])
        self.assertTrue(candidate["publish_manifest"]["requires_source_audit"])
        self.assertTrue(candidate["publish_change_record"]["requires_explicit_integration"])

    def test_keyboard_linear_reorder_is_pure_and_coordinate_free(self):
        d = self.populated_node("ORDERING")
        d["node"]["ui_metadata"]["items"] = [
            {"id":"a","label":"A"},{"id":"b","label":"B"},{"id":"c","label":"C"}
        ]
        moved = self.service.move_collection_item(d, "node.ui_metadata.items", 2, "up")
        self.assertEqual(["a","c","b"], [x["id"] for x in moved["node"]["ui_metadata"]["items"]])
        self.assertEqual(["a","b","c"], [x["id"] for x in d["node"]["ui_metadata"]["items"]])

    def test_fork_pins_stable_id(self):
        d = self.populated_node()
        forked = self.service.fork_record("node", d["node"], "Edit existing")
        forked["node"]["node_id"] = "ZZ01-N98"
        with self.assertRaisesRegex(ValueError, "Stable node ID"):
            self.service.save_draft(forked)

    def test_tx1_is_flag_not_confidence(self):
        d = self.populated_node()
        d["node"]["confidence_code"] = "TX1"
        self.assertFalse(self.service.validate_draft(d)["valid"])
        d["node"]["confidence_code"] = "T1"
        d["node"]["textual_variant_flag"] = "TX1"
        self.assertTrue(self.service.validate_draft(d)["valid"])

    def test_import_is_non_overwriting_inert_json_data(self):
        d = self.populated_node()
        d["node"]["player_prompt"] = "<script>literal data only</script>"
        imported = self.service.import_draft(json.dumps(d))
        self.assertNotEqual(d["draft_id"], imported["draft_id"])
        self.assertEqual("import_data_only", imported["change_record"][0]["action"])
        self.assertIn("<script>", imported["node"]["player_prompt"])


if __name__ == "__main__": unittest.main()
