import itertools
import json
import tempfile
import unittest
from pathlib import Path

from scripture_archive_platform.authoring.service import AuthoringService
from scripture_archive_platform.content.loader import TaskPresentationMapper
from scripture_archive_platform.domain.models import BUILTIN_TASK_TYPES
from scripture_archive_platform.domain.registries import build_task_registries
from scripture_archive_platform.persistence.store import JsonFileStore


class ConstructorHardeningTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.ids = itertools.count(1)
        self.registry = build_task_registries()[0]
        self.service = AuthoringService(
            JsonFileStore(Path(self.tmp.name)), self.registry, TaskPresentationMapper(),
            clock=lambda: 1000, id_factory=lambda: f"{next(self.ids):012d}",
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

    @staticmethod
    def populate_task_payload(draft, task_type):
        node = draft["node"]
        ui = node["ui_metadata"]
        if task_type in {"SINGLE_CHOICE", "COMBOBOX_SELECT", "PARALLEL_WITNESS_COMPARE"}:
            ui["options"] = [{"id": "a", "label": "A"}, {"id": "b", "label": "B"}]
            node["answer_contract"] = {"accepted_choice_ids": ["a"]}
        elif task_type == "MULTI_SELECT":
            ui["options"] = [{"id": "a", "label": "A"}, {"id": "b", "label": "B"}]
            node["answer_contract"] = {"accepted_choice_ids": ["a", "b"]}
        elif task_type == "ORDERING":
            ui["items"] = [{"id": "a", "label": "A"}, {"id": "b", "label": "B"}]
            node["answer_contract"] = {"accepted_order": ["b", "a"]}
        elif task_type == "MATCHING":
            ui["pairs"] = [
                {"left": "L1", "right": "R1"},
                {"left": "L2", "right": "R2"},
            ]
            node["answer_contract"] = {"accepted_pairs": {"L1": "R1", "L2": "R2"}}
        elif task_type == "EVIDENCE_SELECT":
            ui["evidence_options"] = [
                {"id": "e1", "label": "Evidence 1"},
                {"id": "e2", "label": "Evidence 2"},
            ]
            node["answer_contract"] = {"accepted_choice_ids": ["e1"]}
        elif task_type == "CLAIM_EVIDENCE":
            ui["evidence_options"] = [
                {"id": "e1", "label": "Evidence 1"},
                {"id": "e2", "label": "Evidence 2"},
            ]
            node["answer_contract"] = {
                "accepted_value": {"claim": "bounded claim", "evidence_ids": ["e1"]}
            }
        elif task_type == "COMPOSITE_MULTI_STEP":
            ui["steps"] = [{
                "step_id": "s1",
                "prompt": "State the bounded proposition.",
                "answer_contract": {"task_type": "SHORT_TEXT"},
            }]
            node["answer_contract"] = {
                "accepted_value": {
                    "schema": "ANSWER_DTO_v1",
                    "task_type": "COMPOSITE_MULTI_STEP",
                    "steps": [{"step_id": "s1", "answer": {"text": "bounded answer"}}],
                }
            }
        elif task_type == "OT_NT_LINK":
            ui["relation_types"] = [
                {"id": "DIRECT_QUOTATION", "label": "Direct quotation"},
            ]
        return draft

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
        self.assertTrue(validation["valid_for_publish"], validation)
        preview = self.service.preview(d)
        self.assertEqual("ZZ01-N99", preview["renderable"]["node_id"])
        self.assertEqual("SHORT_TEXT", preview["renderable"]["task_type"])
        self.assertEqual("authoring-preview-heading", preview["focus_target"])

    def test_every_builtin_has_registry_contract_and_valid_minimal_publish_fixture(self):
        listed = {item["id"]: item for item in self.registry.list()}
        self.assertEqual(set(BUILTIN_TASK_TYPES), set(listed))
        for task_type in BUILTIN_TASK_TYPES:
            with self.subTest(task_type=task_type):
                registry_row = listed[task_type]
                contract = registry_row.get("authoring_contract")
                self.assertIsInstance(contract, dict)
                self.assertTrue(contract)
                self.assertIsInstance(contract.get("answer_fields"), dict)
                self.assertTrue(contract["answer_fields"])

                d = self.populate_task_payload(self.populated_node(task_type), task_type)
                result = self.service.validate_draft(d)
                self.assertTrue(result["valid"], result)
                self.assertTrue(result["valid_for_publish"], result)
                self.assertEqual([], result["publish_blockers"])
                candidate = self.service.prepare_publish_candidate(d)
                self.assertFalse(candidate["canonical_mutation_performed"])

    def test_every_builtin_rejects_malformed_or_empty_task_payload(self):
        for task_type in BUILTIN_TASK_TYPES:
            with self.subTest(task_type=task_type):
                d = self.populate_task_payload(self.populated_node(task_type), task_type)
                definition = self.registry.get(task_type)
                collection = definition.authoring_contract.get("collection")
                if collection is None:
                    d["node"]["answer_contract"] = []
                else:
                    d["node"]["ui_metadata"][collection] = []
                result = self.service.validate_draft(d)
                self.assertFalse(result["valid_for_publish"], result)
                self.assertTrue(result["errors"] or result["publish_blockers"], result)
                with self.assertRaises(ValueError):
                    self.service.prepare_publish_candidate(d)

    def test_choice_publish_requires_two_well_formed_unique_options(self):
        d = self.populated_node("SINGLE_CHOICE")
        result = self.service.validate_draft(d)
        self.assertFalse(result["valid_for_publish"], result)
        self.assertTrue(any("at least 2 options" in msg for msg in result["errors"]))

        d["node"]["ui_metadata"]["options"] = [
            {"id": "a", "label": "A"}, {"id": "a", "label": "Duplicate"}
        ]
        d["node"]["answer_contract"] = {"accepted_choice_ids": ["a"]}
        result = self.service.validate_draft(d)
        self.assertFalse(result["valid_for_publish"], result)
        self.assertTrue(any("IDs must be non-empty and unique" in msg for msg in result["errors"]))

        d["node"]["ui_metadata"]["options"] = [
            {"id": "a", "label": "A"}, {"id": "b", "label": "B"}
        ]
        d["node"]["answer_contract"] = {"accepted_choice_ids": ["missing"]}
        result = self.service.validate_draft(d)
        self.assertFalse(result["valid_for_publish"], result)
        self.assertTrue(any("reference declared options" in msg for msg in result["errors"]))

    def test_matching_requires_meaningful_unique_pair_model(self):
        d = self.populated_node("MATCHING")
        d["node"]["ui_metadata"]["pairs"] = [{"left": "L1", "right": "R1"}]
        result = self.service.validate_draft(d)
        self.assertFalse(result["valid_for_publish"], result)
        self.assertTrue(any("at least 2 pairs" in msg for msg in result["errors"]))

        d["node"]["ui_metadata"]["pairs"] = [
            {"left": "L1", "right": "R1"},
            {"left": "L2", "right": "R1"},
        ]
        result = self.service.validate_draft(d)
        self.assertFalse(result["valid_for_publish"], result)
        self.assertTrue(any("right-side choices" in msg for msg in result["errors"]))

        d["node"]["ui_metadata"]["pairs"] = [
            {"left": "L1", "right": "R1"},
            {"left": "L2", "right": "R2"},
        ]
        d["node"]["answer_contract"] = {"accepted_pairs": {"L1": "R1"}}
        result = self.service.validate_draft(d)
        self.assertFalse(result["valid_for_publish"], result)
        self.assertTrue(any("cover every MATCHING left-side ID" in msg for msg in result["errors"]))

    def test_composite_requires_unique_answerable_steps_with_contracts(self):
        d = self.populated_node("COMPOSITE_MULTI_STEP")
        d["node"]["ui_metadata"]["steps"] = [
            {"step_id": "s1", "prompt": "First", "answer_contract": {"task_type": "SHORT_TEXT"}},
            {"step_id": "s1", "prompt": "Second", "answer_contract": {"task_type": "SHORT_TEXT"}},
        ]
        result = self.service.validate_draft(d)
        self.assertFalse(result["valid_for_publish"], result)
        self.assertTrue(any("step IDs" in msg for msg in result["errors"]))

        d["node"]["ui_metadata"]["steps"] = [
            {"step_id": "s1", "prompt": "", "answer_contract": {"task_type": "SHORT_TEXT"}},
        ]
        result = self.service.validate_draft(d)
        self.assertFalse(result["valid_for_publish"], result)
        self.assertTrue(any("answerable prompt" in msg for msg in result["errors"]))

        d["node"]["ui_metadata"]["steps"] = [
            {"step_id": "s1", "prompt": "Answer", "answer_contract": {}},
        ]
        result = self.service.validate_draft(d)
        self.assertFalse(result["valid_for_publish"], result)
        self.assertTrue(any("requires answer_contract" in msg for msg in result["errors"]))

    def test_keyboard_linear_reorder_is_pure_and_coordinate_free(self):
        d = self.populate_task_payload(self.populated_node("ORDERING"), "ORDERING")
        d["node"]["ui_metadata"]["items"].append({"id": "c", "label": "C"})
        d["node"]["answer_contract"]["accepted_order"] = ["b", "a", "c"]
        moved = self.service.move_collection_item(d, "node.ui_metadata.items", 2, "up")
        self.assertEqual(["a", "c", "b"], [x["id"] for x in moved["node"]["ui_metadata"]["items"]])
        self.assertEqual(["a", "b", "c"], [x["id"] for x in d["node"]["ui_metadata"]["items"]])

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
