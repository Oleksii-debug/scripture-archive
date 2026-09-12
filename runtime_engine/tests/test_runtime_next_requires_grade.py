import unittest

from scripture_archive_runtime.application import RuntimeApplication
from scripture_archive_runtime.content import ContentRepository
from scripture_archive_runtime.security import ValidationError
from tests.fixtures import LN01_N03, PA02_N04, node_from


class RuntimeNextRequiresGradeTests(unittest.TestCase):
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

    def _new_app(self):
        first, second = self._nodes()
        return RuntimeApplication(ContentRepository([first, second])), first, second

    @staticmethod
    def _snapshot(app):
        return {
            "current_node_id": app.current_node_id,
            "shown": list(app.session.shown_node_ids),
            "correct": sorted(app.session.correct_node_ids),
            "recent_task_families": list(app.session.recent_task_families),
            "mistakes": dict(app.memory.mistakes),
            "visit_counts": dict(app._visit_counts),
            "attempt_counts": {
                node_id: len(state.attempts)
                for node_id, state in app.memory.node_history.items()
            },
        }

    def test_next_before_submit_fails_closed_without_progression_mutation(self):
        app, _, _ = self._new_app()
        app.load_task("NEXT01-N01")
        before = self._snapshot(app)

        with self.assertRaisesRegex(ValidationError, "must be graded before player.next"):
            app.next()

        self.assertEqual(before, self._snapshot(app))
        self.assertEqual("NEXT01-N01", app.current_node_id)

    def test_submit_then_next_uses_current_visit_grade_and_resets_for_new_task(self):
        app, first, _ = self._new_app()
        app.load_task("NEXT01-N01")
        grade = app.submit_answer("NEXT01-N01", first["accepted_answer"])
        self.assertEqual("CORRECT", grade["grade"]["correctness"])

        advanced = app.next()
        self.assertEqual("NEXT01-N02", advanced["task"]["node_id"])
        before = self._snapshot(app)

        with self.assertRaisesRegex(ValidationError, "must be graded before player.next"):
            app.next()

        self.assertEqual(before, self._snapshot(app))
        self.assertEqual("NEXT01-N02", app.current_node_id)

    def test_historical_result_cannot_authorize_a_revisited_current_task(self):
        app, first, _ = self._new_app()
        app.load_task("NEXT01-N01")
        app.submit_answer("NEXT01-N01", first["accepted_answer"])
        self.assertIsNotNone(app.memory.node_history["NEXT01-N01"].last_result)

        # Internal/canonical revisit starts a fresh active visit. Historical grading
        # remains available for analytics/mastery but must not authorize progression.
        app.load_task("NEXT01-N01")
        before = self._snapshot(app)
        with self.assertRaisesRegex(ValidationError, "must be graded before player.next"):
            app.next()
        self.assertEqual(before, self._snapshot(app))


if __name__ == "__main__":
    unittest.main()
