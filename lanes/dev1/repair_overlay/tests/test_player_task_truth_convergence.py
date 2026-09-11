from __future__ import annotations

import json
import unittest

from scripture_archive_platform.application.service import PlatformApplication
from scripture_archive_platform.content.loader import TaskPresentationMapper
from scripture_archive_platform.domain.models import TRANSPORT_API_VERSION
from scripture_archive_platform.transport.contracts import ok_response


class _LoaderStub:
    def __init__(self) -> None:
        self.mission = {
            "mission_id": "LN-99",
            "campaign_id": "LN",
            "title": "Truth boundary fixture",
            "primary_scripture": ["Mark 1:1"],
        }
        self.nodes = {
            "LN99-N01": {
                "node_id": "LN99-N01",
                "mission_id": "LN-99",
                "task_type": "SINGLE_CHOICE",
                "task_family": "choice",
                "difficulty": "1/6",
                "required": True,
                "player_prompt": "Choose only from the public presentation.",
                "source_scope_visible_to_player": "Mark 1:1.",
                "functional_nonvisual_equivalent": "A labelled radio group.",
                "response_contract": {
                    "options": [
                        {"id": "PUB-A", "label": "Public A"},
                        {"id": "PUB-B", "label": "Public B"},
                    ]
                },
                "accepted_answer": "GRADING-SECRET-CHOICE",
                "rejected_answers": "GRADING-SECRET-DISTRACTOR",
                "required_evidence": ["EV-GRADING-SECRET"],
            },
            "LN99-N02": {
                "node_id": "LN99-N02",
                "mission_id": "LN-99",
                "task_type": "COMPOSITE_MULTI_STEP",
                "task_family": "composite",
                "difficulty": "1/6",
                "required": True,
                "player_prompt": "Complete the public steps.",
                "source_scope_visible_to_player": "Mark 1:1.",
                "functional_nonvisual_equivalent": "A labelled linear step sequence.",
                "grading": {
                    "steps": [
                        {
                            "step_id": "secret-step",
                            "type": "SHORT_TEXT",
                            "required": "GRADING-SECRET-COMPOSITE",
                        }
                    ]
                },
            },
        }
        self._mission_for_node = {node_id: self.mission for node_id in self.nodes}

    def _ensure(self) -> None:
        return None

    def load_node(self, node_id: str):
        return dict(self.nodes[node_id])

    def mission_for_node(self, node_id: str):
        return dict(self._mission_for_node[node_id])

    def list_missions(self, campaign_id: str):
        return [dict(self.mission)] if campaign_id == "LN" else []

    def next_node_id(self, node_id: str, outcome: str = "correct"):
        return "LN99-N02" if node_id == "LN99-N01" else None


class PlayerTaskTruthConvergenceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.mapper = TaskPresentationMapper()
        self.loader = _LoaderStub()
        # Exercise the real PlatformApplication.handle/dispatch/load/next response path
        # without pulling unrelated constructor/keymap persistence into this boundary test.
        self.app = object.__new__(PlatformApplication)
        self.app.loader = self.loader
        self.app.mapper = self.mapper
        self.app.player_gateway = None
        self.app._last_node = {}
        self.app._hint_level = {}

    @staticmethod
    def _request(request_id: str, command: str, payload: dict[str, object]):
        return {
            "api_version": TRANSPORT_API_VERSION,
            "request_id": request_id,
            "command": command,
            "payload": payload,
        }

    def test_real_load_node_does_not_transform_grading_truth_into_public_options(self) -> None:
        response = self.app.handle(
            self._request("load-1", "player.load_node", {"node_id": "LN99-N01"})
        )

        self.assertTrue(response["ok"])
        task = response["data"]["task"]
        self.assertEqual(["PUB-A", "PUB-B"], [item["id"] for item in task["options"]])
        self.assertNotIn("legacy_answer_contract", task)
        serialized = json.dumps(response, ensure_ascii=False, sort_keys=True)
        self.assertNotIn("GRADING-SECRET-CHOICE", serialized)
        self.assertNotIn("GRADING-SECRET-DISTRACTOR", serialized)
        self.assertNotIn("EV-GRADING-SECRET", serialized)

    def test_real_next_does_not_promote_grading_steps_and_fails_closed(self) -> None:
        response = self.app.handle(
            self._request("next-1", "player.next", {"node_id": "LN99-N01"})
        )

        self.assertTrue(response["ok"])
        task = response["data"]["task"]
        self.assertEqual("COMPOSITE_MULTI_STEP", task["task_type"])
        self.assertEqual([], task["steps"])
        self.assertFalse(task["accessibility"]["inspection"]["passed"])
        self.assertIn(
            ("A11Y_COMPOSITE_STEPS_MISSING", "task.steps"),
            {
                (item["code"], item["path"])
                for item in task["accessibility"]["inspection"]["findings"]
            },
        )
        self.assertNotIn(
            "GRADING-SECRET-COMPOSITE",
            json.dumps(response, ensure_ascii=False, sort_keys=True),
        )

    def test_matching_grading_pairs_are_not_player_presentation(self) -> None:
        task = self.mapper.to_renderable(
            {
                "node_id": "LN99-N03",
                "mission_id": "LN-99",
                "task_type": "MATCHING",
                "player_prompt": "Match the public pairs.",
                "source_scope_visible_to_player": "Mark 1:1.",
                "functional_nonvisual_equivalent": "Labelled matching controls.",
                "grading": {
                    "accepted_pairs": {
                        "GRADING-SECRET-LEFT": "GRADING-SECRET-RIGHT"
                    }
                },
            },
            self.loader.mission,
        )

        self.assertEqual([], task["pairs"])
        self.assertFalse(task["accessibility"]["inspection"]["passed"])
        serialized = json.dumps(task, ensure_ascii=False, sort_keys=True)
        self.assertNotIn("GRADING-SECRET-LEFT", serialized)
        self.assertNotIn("GRADING-SECRET-RIGHT", serialized)

    def test_required_evidence_is_not_synthesized_into_answer_options_or_source_refs(self) -> None:
        task = self.mapper.to_renderable(
            {
                "node_id": "LN99-N04",
                "mission_id": "LN-99",
                "task_type": "EVIDENCE_SELECT",
                "player_prompt": "Select evidence from the public contract.",
                "source_scope_visible_to_player": "Mark 1:1.",
                "functional_nonvisual_equivalent": "Labelled evidence choices.",
                "required_evidence": ["EV-GRADING-SECRET"],
            },
            self.loader.mission,
        )

        self.assertEqual([], task["evidence_options"])
        self.assertNotIn("EV-GRADING-SECRET", task["source_references"])
        self.assertFalse(task["accessibility"]["inspection"]["passed"])

    def test_defensive_transport_redaction_remains_recursive(self) -> None:
        response = ok_response(
            "r-defence",
            {
                "truth_owner": "D5/runtime",
                "task": {
                    "node_id": "N-DEFENCE",
                    "task_type": "SHORT_TEXT",
                    "answer_contract": {"schema": "ANSWER_DTO_v1"},
                    "legacy_answer_contract": {"accepted_choice_ids": ["SECRET"]},
                    "steps": [
                        {
                            "step_id": "s1",
                            "label": "Public",
                            "grading": {"answer_key": "SECRET-NESTED"},
                        }
                    ],
                },
            },
        )

        task = response["data"]["task"]
        self.assertEqual({"schema": "ANSWER_DTO_v1"}, task["answer_contract"])
        self.assertNotIn("legacy_answer_contract", task)
        self.assertNotIn("grading", task["steps"][0])
        self.assertNotIn("SECRET", json.dumps(response, sort_keys=True))


if __name__ == "__main__":
    unittest.main()
