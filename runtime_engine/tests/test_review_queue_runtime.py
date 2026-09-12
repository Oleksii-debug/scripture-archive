import unittest

from scripture_archive_runtime.application import RuntimeApplication
from scripture_archive_runtime.content import ContentRepository
from tests.fixtures import LN01_N03, node_from


class ReviewQueueRuntimeTests(unittest.TestCase):
    def setUp(self):
        self.node = node_from(
            LN01_N03,
            node_id="RQ01-N01",
            mission_id="RQ-01",
            mastery_domains=["REVIEW-CONCEPT"],
            on_correct="REVIEW_QUEUE RQ-01",
            on_partial="return_to_current_node",
            on_incorrect="return_to_current_node",
            on_hint_threshold="REVIEW_QUEUE RQ-01",
            later_retrieval_effect="REVIEW_QUEUE RQ-01",
        )
        self.app = RuntimeApplication(ContentRepository([self.node]))
        self.app.load_task("RQ01-N01")

    def test_submit_enqueues_and_upserts_existing_canonical_review_item(self):
        self.app.submit_answer("RQ01-N01", self.node["accepted_answer"])
        first = self.app.get_review_queue()["review_queue"]
        self.assertEqual(len(first), 1)
        self.assertEqual(first[0]["queue_id"], "review:REVIEW-CONCEPT:RQ01-N01")
        self.assertEqual(first[0]["concept_id"], "REVIEW-CONCEPT")
        self.assertEqual(first[0]["node_id"], "RQ01-N01")
        self.assertEqual(first[0]["relation"], "EXACT")
        self.assertEqual(first[0]["reason"], "independent_correct")
        self.assertTrue(first[0]["due_at"])

        self.app.submit_answer("RQ01-N01", self.node["accepted_answer"])
        second = self.app.get_review_queue()["review_queue"]
        self.assertEqual(len(second), 1)
        self.assertEqual(second[0]["queue_id"], first[0]["queue_id"])
        self.assertEqual(second[0]["reason"], "independent_correct")

    def test_runtime_v1_exposes_read_only_json_safe_review_queue_query(self):
        self.app.submit_answer("RQ01-N01", self.node["accepted_answer"])
        response = self.app.handle({
            "api_version": "runtime.v1",
            "request_id": "review-1",
            "command": "get_review_queue",
            "payload": {},
        })
        self.assertEqual(response["request_id"], "review-1")
        self.assertEqual(response["api_version"], "runtime.v1")
        self.assertEqual(len(response["review_queue"]), 1)
        self.assertEqual(response["review_queue"][0]["concept_id"], "REVIEW-CONCEPT")


if __name__ == "__main__":
    unittest.main()
