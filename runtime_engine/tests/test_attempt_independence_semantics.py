import unittest

from scripture_archive_runtime.application import RuntimeApplication
from scripture_archive_runtime.content import ContentRepository
from tests.fixtures import LN01_N03, node_from


class AttemptIndependenceSemanticsTests(unittest.TestCase):
    @staticmethod
    def _run_correct_attempt(hint_count):
        node = node_from(
            LN01_N03,
            node_id="SEM01-N01",
            mission_id="SEM-01",
            mastery_domains=["SEMANTIC-CONSISTENCY"],
            on_correct="REVIEW_QUEUE SEM",
            on_partial="return_to_current_node",
            on_incorrect="return_to_current_node",
            on_hint_threshold="REVIEW_QUEUE SEM",
            later_retrieval_effect="REVIEW_QUEUE SEM",
        )
        app = RuntimeApplication(ContentRepository([node]))
        app.load_task("SEM01-N01")
        for _ in range(hint_count):
            app.request_hint("SEM01-N01")
        result = app.submit_answer("SEM01-N01", node["accepted_answer"])
        attempt = app.memory.node_history["SEM01-N01"].attempts[-1]
        return attempt, result

    def test_h0_correct_is_independent_and_mastery_agrees(self):
        attempt, result = self._run_correct_attempt(0)
        self.assertEqual(attempt.used_hints, 0)
        self.assertTrue(attempt.independent)
        self.assertEqual(result["mastery_consequence"][0]["reason"], "independent_correct")

    def test_any_hinted_correct_attempt_is_guided_and_preserves_hint_count(self):
        for hint_count in (1, 5, 6, 7):
            with self.subTest(hint_count=hint_count):
                attempt, result = self._run_correct_attempt(hint_count)
                self.assertEqual(attempt.used_hints, hint_count)
                self.assertFalse(attempt.independent)
                self.assertEqual(result["mastery_consequence"][0]["reason"], "guided_correct")


if __name__ == "__main__":
    unittest.main()
