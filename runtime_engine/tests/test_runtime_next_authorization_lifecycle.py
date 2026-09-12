import unittest

from scripture_archive_runtime.application import RuntimeApplication
from scripture_archive_runtime.content import ContentRepository
from scripture_archive_runtime.persistence import CURRENT_SCHEMA_VERSION
from scripture_archive_runtime.security import ValidationError
from tests.fixtures import LN01_N03, PA02_N04, node_from


class StaticPersistence:
    def __init__(self, state):
        self.state = state

    def load(self):
        return self.state

    def save(self, state):
        self.state = state


class RuntimeNextAuthorizationLifecycleTests(unittest.TestCase):
    @staticmethod
    def _nodes():
        first = node_from(
            LN01_N03,
            node_id="NEXT01-N01",
            mission_id="NEXT-01",
            on_correct="NEXT01-N02",
            on_partial="return_to_current_node",
            on_incorrect="return_to_current_node",
            on_hint_threshold="return_to_current_node",
            later_retrieval_effect="REVIEW_QUEUE NEXT",
        )
        second = node_from(
            PA02_N04,
            node_id="NEXT01-N02",
            mission_id="NEXT-01",
            on_correct="REVIEW_QUEUE NEXT",
            on_partial="return_to_current_node",
            on_incorrect="return_to_current_node",
            on_hint_threshold="return_to_current_node",
            later_retrieval_effect="REVIEW_QUEUE NEXT",
        )
        return first, second

    @staticmethod
    def _state(current_node_id, *, history=None):
        return {
            "schema_version": CURRENT_SCHEMA_VERSION,
            "profile": {"profile_id": "default"},
            "sessions": [],
            "history": history or {},
            "mastery": [],
            "review_queue": [],
            "campaign_checkpoints": {},
            "passage_exposure": {},
            "mistakes": {},
            "recent_fatigue": {},
            "session_rollup": {},
            "evidence_exposure": {},
            "current_node_id": current_node_id,
        }

    def _new_app(self, *, persistence=None):
        first, second = self._nodes()
        return (
            RuntimeApplication(
                ContentRepository([first, second]),
                persistence=persistence,
            ),
            first,
            second,
        )

    def test_post_grade_hints_cannot_rewrite_authorized_branch(self):
        app, first, _ = self._new_app()
        app.load_task("NEXT01-N01")

        submitted = app.submit_answer("NEXT01-N01", first["accepted_answer"])
        self.assertEqual("NEXT01-N02", submitted["branch"]["next_node_id"])

        for _ in range(6):
            app.request_hint("NEXT01-N01")

        advanced = app.next()
        self.assertEqual("NEXT01-N02", advanced["task"]["node_id"])
        self.assertEqual("NEXT01-N02", app.current_node_id)

    def test_terminal_transition_consumes_authorization(self):
        app, _, second = self._new_app()
        app.load_task("NEXT01-N02")
        submitted = app.submit_answer("NEXT01-N02", second["accepted_answer"])
        self.assertEqual("REVIEW_QUEUE", submitted["branch"]["terminal"])

        terminal = app.next()
        self.assertEqual("REVIEW_QUEUE", terminal["branch"]["terminal"])

        with self.assertRaisesRegex(ValidationError, "must be graded before player.next"):
            app.next()

    def test_failed_semantic_restore_keeps_old_node_but_clears_authorization(self):
        malformed = self._state(
            "NEXT01-N02",
            history={"BROKEN": []},
        )
        app, first, _ = self._new_app(persistence=StaticPersistence(malformed))
        app.load_task("NEXT01-N01")
        app.submit_answer("NEXT01-N01", first["accepted_answer"])

        with self.assertRaisesRegex(ValidationError, r"history\[BROKEN\] must be an object"):
            app.restore()

        self.assertEqual("NEXT01-N01", app.current_node_id)
        with self.assertRaisesRegex(ValidationError, "must be graded before player.next"):
            app.next()

    def test_successful_restore_publishes_node_only_after_decode_and_requires_new_grade(self):
        restored = self._state("NEXT01-N02")
        app, first, _ = self._new_app(persistence=StaticPersistence(restored))
        app.load_task("NEXT01-N01")
        app.submit_answer("NEXT01-N01", first["accepted_answer"])

        result = app.restore()
        self.assertTrue(result["restored"])
        self.assertEqual("NEXT01-N02", result["current_node_id"])
        self.assertEqual("NEXT01-N02", app.current_node_id)

        with self.assertRaisesRegex(ValidationError, "must be graded before player.next"):
            app.next()


if __name__ == "__main__":
    unittest.main()
