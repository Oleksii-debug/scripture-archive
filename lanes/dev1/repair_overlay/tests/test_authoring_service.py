import json
import unittest

from scripture_archive_platform.authoring.service import AuthoringError, AuthoringService


class MemoryStore:
    def __init__(self): self.data = {}
    def get_json(self, namespace, key, default=None): return self.data.get((namespace, key), default)
    def put_json(self, namespace, key, value): self.data[(namespace, key)] = json.loads(json.dumps(value))


class Registry:
    def __init__(self): self.values = {x: {} for x in (
        "SINGLE_CHOICE", "MULTI_SELECT", "SHORT_TEXT", "LONG_TEXT", "ARGUMENT",
        "COMBOBOX_SELECT", "ORDERING", "MATCHING", "EVIDENCE_SELECT", "CLAIM_EVIDENCE",
        "COMPOSITE_MULTI_STEP", "SPEAKER_RECIPIENT", "PARALLEL_WITNESS_COMPARE", "OT_NT_LINK")}
    def __contains__(self, key): return key in self.values


class Mapper:
    def to_renderable(self, record, mission):
        return {
            "node_id": record["node_id"],
            "task_type": record["task_type"],
            "prompt": record["player_prompt"],
            "options": (record.get("ui_metadata") or {}).get("options", []),
        }


class ConstructorTests(unittest.TestCase):
    def setUp(self):
        ids = iter(["0001", "0002", "0003", "0004", "0005", "0006"])
        self.service = AuthoringService(
            MemoryStore(), Registry(), Mapper(), clock=lambda: 1000, id_factory=lambda: next(ids)
        )

    def populated_node(self, task_type="SHORT_TEXT"):
        draft = self.service.new_node_from_task_type("Test node", task_type)
        r = draft["record"]
        r.update({
            "node_id": "LN01-N99",
            "mission_id": "LN-01",
            "task_family": "source discipline",
            "difficulty": "2/6",
            "skill_target": "distinguish witnesses",
            "knowledge_target": "bounded proposition",
            "why_this_node_exists": "Tests source-bound reasoning without changing biblical truth.",
            "player_prompt": "Prompt",
            "source_scope_visible_to_player": "Luke 22:8",
            "response_mode": task_type.lower(),
            "accepted_answer": "bounded answer",
            "accepted_variants": ["equivalent bounded answer"],
            "required_evidence": ["Luke 22:8"],
            "rejected_answers": ["overclaim"],
            "rejection_reason": "Not stated in cited text.",
            "success_feedback": "Supported by cited evidence.",
            "partial_feedback": "Preserve the source boundary.",
            "failure_feedback": "Re-read the cited text.",
            "on_hint_threshold": "guided_then_follow_on_correct",
            "mastery_domains": ["SOURCE_SCOPE_DISCIPLINE"],
            "review_queue_rule": "LN_SOURCE_SCOPE_REVIEW",
        })
        r["hints"] = {
            f"H{i}": ("Guided answer with explanation." if i == 7 else f"Hint {i}")
            for i in range(1, 8)
        }
        return self.service.save_draft(draft)

    def test_crud_revision_and_stale_write_protection(self):
        draft = self.service.new_draft("Node", "node")
        saved = self.service.set_field(draft["draft_id"], "record.node_id", "LN01-N99")
        self.assertGreater(saved["revision"], draft["revision"])
        with self.assertRaises(AuthoringError): self.service.save_draft(draft)
        self.assertEqual(self.service.list_drafts()[0]["record_id"], "LN01-N99")
        self.assertTrue(self.service.delete_draft(draft["draft_id"])["deleted"])

    def test_full_node_validation_and_preview(self):
        draft = self.populated_node()
        result = self.service.validate_draft(draft)
        self.assertTrue(result["valid"], result["issues"])
        preview = self.service.preview(draft)
        self.assertEqual(preview["renderable"]["node_id"], "LN01-N99")
        self.assertEqual(preview["focus_target"], "authoring-preview-heading")

    def test_choice_requires_declarative_options(self):
        draft = self.populated_node("SINGLE_CHOICE")
        result = self.service.validate_draft(draft)
        self.assertFalse(result["valid"])
        self.assertIn("OPTIONS_REQUIRED", {x["code"] for x in result["issues"]})
        draft = self.service.add_collection_item(
            draft["draft_id"], "record.ui_metadata.options", {"id": "a", "label": "A"}
        )
        self.assertTrue(self.service.validate_draft(draft)["valid"])

    def test_keyboard_linear_reorder(self):
        draft = self.populated_node("ORDERING")
        for item in ({"id":"a","label":"A"},{"id":"b","label":"B"},{"id":"c","label":"C"}):
            draft = self.service.add_collection_item(draft["draft_id"], "record.ui_metadata.items", item)
        draft = self.service.move_collection_item(
            draft["draft_id"], "record.ui_metadata.items", 2, "up"
        )
        self.assertEqual(
            [x["id"] for x in draft["record"]["ui_metadata"]["items"]], ["a", "c", "b"]
        )

    def test_publish_candidate_never_writes_canonical(self):
        candidate = self.service.prepare_publish_candidate(self.populated_node())
        self.assertFalse(candidate["canonical_write_performed"])
        self.assertTrue(candidate["change_record"]["requires_explicit_integration"])
        self.assertTrue(candidate["change_record"]["requires_source_audit_for_answer_bearing_changes"])

    def test_fork_preserves_stable_identity(self):
        draft = self.populated_node()
        forked = self.service.fork_record("node", draft["record"], "Edit canonical")
        forked["record"]["node_id"] = "LN01-N98"
        with self.assertRaises(AuthoringError): self.service.save_draft(forked)

    def test_export_import_is_json_only_and_non_overwriting(self):
        draft = self.populated_node()
        imported = self.service.import_draft(self.service.export_draft(draft["draft_id"]))
        self.assertNotEqual(imported["draft_id"], draft["draft_id"])
        self.assertEqual(imported["record"]["node_id"], draft["record"]["node_id"])
        with self.assertRaises(AuthoringError): self.service.import_draft("[]")

    def test_tx1_is_separate_from_confidence(self):
        draft = self.populated_node()
        draft["record"]["confidence_code"] = "TX1"
        self.assertIn(
            "CONFIDENCE", {x["code"] for x in self.service.validate_draft(draft)["issues"]}
        )
        draft["record"]["confidence_code"] = "T1"
        draft["record"]["textual_variant_flag"] = "TX1"
        self.assertTrue(self.service.validate_draft(draft)["valid"])


if __name__ == "__main__":
    unittest.main()
