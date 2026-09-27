from __future__ import annotations

import unittest

from scripture_archive_platform.accessibility_inspector import inspect_renderable_task
from scripture_archive_platform.content.loader import TaskPresentationMapper


class AccessibilityInspectorTests(unittest.TestCase):
    def setUp(self) -> None:
        self.mapper = TaskPresentationMapper()
        self.node = {
            "node_id": "LN01-N99",
            "mission_id": "LN-01",
            "task_family": "classification",
            "difficulty": "1/6",
            "required": True,
            "player_prompt": "Classify the claim.",
            "source_scope_visible_to_player": "Mark 14:13; Luke 22:8.",
            "response_mode": "classification",
            "accepted_answer": "SUPPORTED",
            "rejected_answers": "UNSUPPORTED",
            "ui_metadata": {
                "options": [
                    {"id": "SUPPORTED", "label": "Supported"},
                    {"id": "UNSUPPORTED", "label": "Unsupported"},
                ]
            },
            "required_evidence": "Mark 14:13",
            "confidence_code": "T1",
            "textual_variant_flag": "none",
            "functional_nonvisual_equivalent": (
                "Labelled linear choice list; result, evidence, confidence/TX1, "
                "mastery and next action are announced."
            ),
        }
        self.mission = {
            "mission_id": "LN-01",
            "campaign_id": "LN",
            "primary_scripture": ["Mark 14:13", "Luke 22:8"],
        }

    def test_mapper_attaches_passing_machine_and_linear_report(self) -> None:
        task = self.mapper.to_renderable(self.node, self.mission)

        inspection = task["accessibility"]["inspection"]
        self.assertEqual("ACCESSIBILITY_INSPECTION_v1", inspection["schema"])
        self.assertTrue(inspection["passed"])
        self.assertEqual([], inspection["findings"])
        self.assertEqual(
            "Accessibility PASS: LN01-N99 (SINGLE_CHOICE).",
            task["accessibility"]["inspection_linear"][0],
        )
        self.assertGreaterEqual(len(task["options"]), 2)

    def test_explicit_drag_only_surface_fails_closed(self) -> None:
        node = dict(self.node)
        node["visual_metadata"] = {"interaction_mode": "drag-only", "media_slot": None}
        task = self.mapper.to_renderable(node, self.mission)

        inspection = task["accessibility"]["inspection"]
        self.assertFalse(inspection["passed"])
        self.assertIn(
            "A11Y_EXPLICIT_VISUAL_OR_POINTER_DEPENDENCY",
            {item["code"] for item in inspection["findings"]},
        )

    def test_ordering_without_numbered_keyboard_items_fails_closed(self) -> None:
        node = dict(self.node)
        node.update(
            {
                "task_type": "ORDERING",
                "response_mode": "ordering",
                "accepted_answer": ["first", "second"],
                "ui_metadata": {},
            }
        )
        task = self.mapper.to_renderable(node, self.mission)

        inspection = task["accessibility"]["inspection"]
        self.assertFalse(inspection["passed"])
        self.assertIn(
            "A11Y_SEMANTIC_ITEMS_MISSING",
            {item["code"] for item in inspection["findings"]},
        )

    def test_media_requires_explicit_text_equivalent(self) -> None:
        node = dict(self.node)
        node["visual_metadata"] = {"media_slot": "map://case-1"}
        task = self.mapper.to_renderable(node, self.mission)

        inspection = task["accessibility"]["inspection"]
        self.assertFalse(inspection["passed"])
        self.assertIn(
            "A11Y_MEDIA_TEXT_EQUIVALENT_MISSING",
            {item["code"] for item in inspection["findings"]},
        )

    def test_direct_inspection_rejects_duplicate_unlabelled_options(self) -> None:
        task = self.mapper.to_renderable(self.node, self.mission)
        task["options"] = [
            {"id": "same", "label": "First"},
            {"id": "same", "label": ""},
        ]

        report = inspect_renderable_task(task)
        self.assertFalse(report.passed)
        codes = {item.code for item in report.findings}
        self.assertIn("A11Y_ITEM_ID_DUPLICATE", codes)
        self.assertIn("A11Y_ITEM_LABEL_MISSING", codes)
        self.assertEqual(report.to_dict(), inspect_renderable_task(task).to_dict())


if __name__ == "__main__":
    unittest.main()
