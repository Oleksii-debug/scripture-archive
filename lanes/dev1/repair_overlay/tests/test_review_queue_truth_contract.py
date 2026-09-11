import copy
import tempfile
import unittest
from pathlib import Path

from _fixture import make_repo
from scripture_archive_platform.application.service import PlatformApplication
from scripture_archive_platform.persistence.store import JsonFileStore
from scripture_archive_platform.transport.review_queue_contract import validate_review_queue_projection
from scripture_archive_platform.transport.runtime_compat import RuntimeContractError, RuntimeEngineContractAdapter


VALID_ITEMS = [
    {
        "queue_id": "review:C1:N1",
        "concept_id": "C1",
        "node_id": "N1",
        "due_at": "2026-09-12T00:00:00+00:00",
        "priority": 55,
        "relation": "EXACT",
        "reason": "independent_correct",
    },
    {
        "queue_id": "review:C2:N2",
        "concept_id": "C2",
        "node_id": None,
        "due_at": "2026-09-13T00:00:00+00:00",
        "priority": 10,
        "relation": "CROSS_CONTEXT",
        "reason": "",
    },
]


class StaticGateway:
    def __init__(self, response):
        self.response = response

    def invoke(self, command, payload=None, request_id="x"):
        self.last_call = (command, dict(payload or {}), request_id)
        return copy.deepcopy(self.response)


class ReviewQueueTruthContractTests(unittest.TestCase):
    def test_projection_requires_exact_runtime_shape_and_preserves_order(self):
        validated = validate_review_queue_projection(copy.deepcopy(VALID_ITEMS))
        self.assertEqual(["review:C1:N1", "review:C2:N2"], [item["queue_id"] for item in validated])

        malformed = [
            None,
            {},
            "not-a-list",
            ["not-an-object"],
            [{key: value for key, value in VALID_ITEMS[0].items() if key != "due_at"}],
            [{**VALID_ITEMS[0], "priority": True}],
            [{**VALID_ITEMS[0], "relation": "UNKNOWN"}],
            [{**VALID_ITEMS[0], "queue_id": " padded "}],
            [VALID_ITEMS[0], dict(VALID_ITEMS[0])],
        ]
        for value in malformed:
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    validate_review_queue_projection(value)

    def test_runtime_adapter_rejects_missing_wrong_and_malformed_review_queue(self):
        def invoke_with(response):
            return RuntimeEngineContractAdapter(
                lambda request: {"api_version": "runtime.v1", "request_id": request["request_id"], **response}
            )

        request = {
            "api_version": "scripture.transport.v1",
            "request_id": "rq-1",
            "command": "player.get_review_queue",
            "payload": {},
        }
        bad_responses = (
            {},
            {"review_queue": None},
            {"review_queue": {}},
            {"review_queue": [{**VALID_ITEMS[0], "concept_id": 7}]},
        )
        for response in bad_responses:
            with self.subTest(response=response):
                with self.assertRaises(RuntimeContractError):
                    invoke_with(response).invoke_runtime(request)

        accepted = invoke_with({"review_queue": copy.deepcopy(VALID_ITEMS)}).invoke_runtime(request)
        self.assertEqual(VALID_ITEMS, accepted["review_queue"])

    def test_platform_never_attests_malformed_gateway_queue_as_d5_truth(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            repo = make_repo(root / "repo")
            bad_responses = (
                {"api_version": "runtime.v1", "request_id": "review-queue-player"},
                {"api_version": "runtime.v1", "request_id": "review-queue-player", "review_queue": None},
                {"api_version": "runtime.v1", "request_id": "review-queue-player", "review_queue": {}},
                {
                    "api_version": "runtime.v1",
                    "request_id": "review-queue-player",
                    "review_queue": [{**VALID_ITEMS[0], "priority": "55"}],
                },
            )
            for response in bad_responses:
                with self.subTest(response=response):
                    app = PlatformApplication(
                        repo,
                        store=JsonFileStore(root / "store"),
                        player_gateway=StaticGateway(response),
                    )
                    result = app.handle(
                        {
                            "api_version": "scripture.transport.v1",
                            "request_id": "r-1",
                            "command": "player.get_review_queue",
                            "payload": {},
                        }
                    )
                    self.assertFalse(result["ok"])
                    self.assertEqual("VALIDATION_ERROR", result["error"]["code"])
                    self.assertNotIn("data", result)

    def test_platform_attests_only_explicit_valid_runtime_queue(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            repo = make_repo(root / "repo")
            app = PlatformApplication(
                repo,
                store=JsonFileStore(root / "store"),
                player_gateway=StaticGateway(
                    {
                        "api_version": "runtime.v1",
                        "request_id": "review-queue-player",
                        "review_queue": copy.deepcopy(VALID_ITEMS),
                    }
                ),
            )
            result = app.handle(
                {
                    "api_version": "scripture.transport.v1",
                    "request_id": "r-1",
                    "command": "player.get_review_queue",
                    "payload": {},
                }
            )
            self.assertTrue(result["ok"])
            self.assertEqual("D5/runtime", result["data"]["truth_owner"])
            self.assertEqual(VALID_ITEMS, result["data"]["review_queue"])


if __name__ == "__main__":
    unittest.main()
