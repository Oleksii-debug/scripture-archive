from __future__ import annotations

import unittest

from scripture_archive_platform.content.loader import TaskPresentationMapper


class CompositeAccessibilityTests(unittest.TestCase):
    def setUp(self) -> None:
        self.mapper = TaskPresentationMapper()
        self.mission = {
            "mission_id": "LN-99",
            "campaign_id": "LN",
            "primary_scripture": ["Mark 1:1"],
        }
        self.base_node = {
            "node_id": "LN99-N99",
            "mission_id": "LN-99",
            "task_type": "COMPOSITE_MULTI_STEP",
            "task_family": "composite",
            "difficulty": "1/6",
            "required": True,
            "player_prompt": "Complete the labelled steps.",
            "source_scope_visible_to_player": "Mark 1:1.",
            "functional_nonvisual_equivalent": "Keyboard-complete labelled linear step sequence.",
        }

    @staticmethod
    def _child_accessibility() -> dict[str, str]:
        return {
            "nonvisual_equivalent": "Labelled text field reachable and operable from the keyboard.",
            "announcements": "Result and next action are announced as text.",
        }

    def _render(self, steps: list[dict[str, object]]) -> dict[str, object]:
        node = dict(self.base_node)
        node["response_contract"] = {"steps": steps}
        return self.mapper.to_renderable(node, self.mission)

    def test_nested_drag_only_child_fails_and_linear_report_matches(self) -> None:
        task = self._render([
            {"step_id":"s1","task_type":"SHORT_TEXT","label":"Arrange","prompt":"Arrange the evidence.","drag_only":True,"accessibility":self._child_accessibility()}
        ])
        inspection = task["accessibility"]["inspection"]
        self.assertFalse(inspection["passed"])
        findings = inspection["findings"]
        match = [item for item in findings if item["code"] == "A11Y_EXPLICIT_VISUAL_OR_POINTER_DEPENDENCY" and item["path"] == "task.steps[0].drag_only"]
        self.assertEqual(1, len(match))
        linear = "\n".join(task["accessibility"]["inspection_linear"])
        self.assertIn("A11Y_EXPLICIT_VISUAL_OR_POINTER_DEPENDENCY", linear)
        self.assertIn("task.steps[0].drag_only", linear)

    def test_nested_media_without_text_equivalent_fails(self) -> None:
        task = self._render([
            {"step_id":"s1","task_type":"SHORT_TEXT","label":"Inspect map","prompt":"Describe the relevant location.","accessibility":self._child_accessibility(),"visual":{"media_slot":"map://case-1"}}
        ])
        inspection = task["accessibility"]["inspection"]
        self.assertFalse(inspection["passed"])
        self.assertIn(("A11Y_MEDIA_TEXT_EQUIVALENT_MISSING", "task.steps[0].visual.media_slot"), {(item["code"], item["path"]) for item in inspection["findings"]})

    def test_keyboard_complete_nested_child_passes(self) -> None:
        task = self._render([
            {"step_id":"s1","task_type":"SHORT_TEXT","label":"Explain","prompt":"State what the cited text says.","accessibility":self._child_accessibility()}
        ])
        self.assertTrue(task["accessibility"]["inspection"]["passed"])
        self.assertEqual([], task["accessibility"]["inspection"]["findings"])
        child = task["steps"][0]
        self.assertEqual("SHORT_TEXT", child["task_type"])
        self.assertEqual("ANSWER_DTO_v1", child["answer_contract"]["schema"])

    def test_nested_single_choice_fails_packaged_renderer_answer_parity(self) -> None:
        task = self._render([
            {"step_id":"s1","task_type":"SINGLE_CHOICE","label":"Choose","prompt":"Choose the supported answer.","options":[{"id":"a","label":"Alpha"},{"id":"b","label":"Beta"}],"accessibility":self._child_accessibility()}
        ])
        inspection = task["accessibility"]["inspection"]
        self.assertFalse(inspection["passed"])
        self.assertIn(("A11Y_COMPOSITE_CHILD_RENDERER_PARITY_MISMATCH", "task.steps[0].task_type"), {(item["code"], item["path"]) for item in inspection["findings"]})
        linear = "\n".join(task["accessibility"]["inspection_linear"])
        self.assertIn("A11Y_COMPOSITE_CHILD_RENDERER_PARITY_MISMATCH", linear)
        self.assertIn("task.steps[0].task_type", linear)

    def test_nested_ordering_fails_packaged_renderer_answer_parity(self) -> None:
        task = self._render([
            {"step_id":"s1","task_type":"ORDERING","label":"Order","prompt":"Put the items in order.","items":[{"id":"first","label":"First"},{"id":"second","label":"Second"}],"accessibility":self._child_accessibility()}
        ])
        inspection = task["accessibility"]["inspection"]
        self.assertFalse(inspection["passed"])
        self.assertIn(("A11Y_COMPOSITE_CHILD_RENDERER_PARITY_MISMATCH", "task.steps[0].task_type"), {(item["code"], item["path"]) for item in inspection["findings"]})

    def test_grading_only_step_cannot_be_promoted_to_accessibility_contract(self) -> None:
        node = dict(self.base_node)
        node["grading"] = {"steps":[{"step_id":"secret-step","type":"SHORT_TEXT","required":"grading-only answer truth"}]}
        task = self.mapper.to_renderable(node, self.mission)
        inspection = task["accessibility"]["inspection"]
        self.assertFalse(inspection["passed"])
        self.assertIn(("A11Y_COMPOSITE_STEPS_MISSING", "task.steps"), {(item["code"], item["path"]) for item in inspection["findings"]})
        self.assertEqual([], task["steps"])

    def test_incomplete_nested_child_still_exposes_explicit_hazard(self) -> None:
        task = self._render([
            {"step_id":"s1","label":"Arrange","prompt":"Arrange the evidence.","visual_only":True}
        ])
        inspection = task["accessibility"]["inspection"]
        pairs = {(item["code"], item["path"]) for item in inspection["findings"]}
        self.assertIn(("A11Y_COMPOSITE_CHILD_CONTRACT_MISSING", "task.steps[0].task_type"), pairs)
        self.assertIn(("A11Y_EXPLICIT_VISUAL_OR_POINTER_DEPENDENCY", "task.steps[0].visual_only"), pairs)


if __name__ == "__main__":
    unittest.main()
