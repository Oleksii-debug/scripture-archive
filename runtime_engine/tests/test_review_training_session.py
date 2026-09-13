import unittest
from datetime import datetime, timedelta, timezone
from tempfile import TemporaryDirectory

from scripture_archive_runtime.application import RuntimeApplication
from scripture_archive_runtime.content import ContentRepository
from scripture_archive_runtime.models import (
    Attempt,
    Correctness,
    ReviewQueueItem,
    RetrievalRelation,
    Session,
    TaskState,
)
from scripture_archive_runtime.persistence import PersistenceStore
from scripture_archive_runtime.security import ValidationError
from tests.fixtures import LN01_N03, node_from


class ReviewTrainingSessionTests(unittest.TestCase):
    def setUp(self):
        self.node1 = node_from(
            LN01_N03,
            node_id="RT01-N01",
            mission_id="RT-01",
            mastery_domains=["REVIEW-A"],
            on_correct="none",
            on_partial="return_to_current_node",
            on_incorrect="return_to_current_node",
            on_hint_threshold="return_to_current_node",
        )
        self.node2 = node_from(
            LN01_N03,
            node_id="RT02-N01",
            mission_id="RT-02",
            mastery_domains=["REVIEW-B"],
            on_correct="none",
            on_partial="return_to_current_node",
            on_incorrect="return_to_current_node",
            on_hint_threshold="return_to_current_node",
        )
        self.app = RuntimeApplication(ContentRepository([self.node1, self.node2]))
        self.now = datetime.now(timezone.utc)

    def _attempted(self, node_id):
        state = TaskState(node_id=node_id)
        state.attempts.append(Attempt(node_id, Correctness.INCORRECT, 0.0, 0, True))
        self.app.memory.node_history[node_id] = state

    def _queue(self, node_id, concept_id, *, due_delta=-1, priority=90, relation=RetrievalRelation.EXACT, suffix=""):
        self._attempted(node_id)
        self.app.memory.review_queue.append(
            ReviewQueueItem(
                queue_id=f"review:{concept_id}:{node_id}{suffix}",
                concept_id=concept_id,
                node_id=node_id,
                due_at=self.now + timedelta(hours=due_delta),
                priority=priority,
                relation=relation,
                reason="test_due_review",
            )
        )

    def _command(self, command, payload=None):
        return self.app.handle({
            "api_version": "runtime.v1",
            "request_id": f"test-{command}",
            "command": command,
            "payload": payload or {},
        })

    def test_start_review_rejects_caller_selected_node(self):
        self._queue("RT01-N01", "REVIEW-A")
        with self.assertRaisesRegex(ValidationError, "empty payload"):
            self._command("start_review", {"node_id": "RT02-N01"})

    def test_start_review_uses_existing_scheduler_and_loads_due_task(self):
        self._queue("RT01-N01", "REVIEW-A", priority=80)
        self._queue("RT02-N01", "REVIEW-B", priority=100)
        response = self._command("start_review")
        self.assertEqual(response["task"]["node_id"], "RT02-N01")
        self.assertTrue(response["review_session"]["active"])
        self.assertEqual(response["review_session"]["shown"], 1)
        self.assertEqual(response["review_selection"]["concept_ids"], ["REVIEW-B"])
        self.assertEqual(self.app.current_node_id, "RT02-N01")

    def test_future_due_item_is_not_opened_early(self):
        self._queue("RT01-N01", "REVIEW-A", due_delta=24)
        response = self._command("start_review")
        self.assertIsNone(response["task"])
        self.assertFalse(response["review_session"]["active"])
        self.assertEqual(response["review_session"]["remaining_eligible"], 0)
        self.assertIsNone(self.app.current_node_id)

    def test_multiple_concepts_for_one_node_are_grouped_into_one_task(self):
        self._queue("RT01-N01", "REVIEW-A", priority=80, suffix=":a")
        self.app.memory.review_queue.append(
            ReviewQueueItem(
                queue_id="review:REVIEW-B:RT01-N01:b",
                concept_id="REVIEW-B",
                node_id="RT01-N01",
                due_at=self.now - timedelta(hours=2),
                priority=95,
                relation=RetrievalRelation.EXACT,
                reason="second_concept",
            )
        )
        response = self._command("start_review")
        self.assertEqual(response["task"]["node_id"], "RT01-N01")
        self.assertEqual(response["review_session"]["shown"], 1)
        self.assertEqual(response["review_selection"]["concept_ids"], ["REVIEW-A", "REVIEW-B"])
        self.assertEqual(len(response["review_selection"]["queue_ids"]), 2)

    def test_start_review_resumes_current_ungraded_review_without_duplicate_visit(self):
        self._queue("RT01-N01", "REVIEW-A", priority=100)
        self._queue("RT02-N01", "REVIEW-B", priority=90)
        first = self._command("start_review")
        self.assertEqual(first["task"]["node_id"], "RT01-N01")
        self.assertEqual(self.app._visit_counts["RT01-N01"], 1)

        resumed = self._command("start_review")
        self.assertEqual(resumed["task"]["node_id"], "RT01-N01")
        self.assertTrue(resumed["review_session"]["active"])
        self.assertEqual(resumed["review_session"]["shown"], 1)
        self.assertEqual(resumed["review_selection"]["concept_ids"], ["REVIEW-A"])
        self.assertEqual(self.app.current_node_id, "RT01-N01")
        self.assertEqual(self.app._visit_counts["RT01-N01"], 1)
        self.assertIsNone(self.app._current_visit_result)

    def test_after_grading_scheduler_selects_another_due_unshown_task(self):
        self._queue("RT01-N01", "REVIEW-A", priority=100)
        self._queue("RT02-N01", "REVIEW-B", priority=90)
        first = self._command("start_review")
        self.assertEqual(first["task"]["node_id"], "RT01-N01")
        grade = self.app.submit_answer("RT01-N01", self.node1["accepted_answer"])
        self.assertTrue(grade["review_session"]["active"])
        self.assertEqual(grade["review_session"]["results"]["CORRECT"], 1)
        second = self._command("start_review")
        self.assertEqual(second["task"]["node_id"], "RT02-N01")
        self.assertEqual(second["review_session"]["shown"], 2)

    def test_ungraded_review_survives_process_restart_without_duplicate_visit_or_target_bypass(self):
        with TemporaryDirectory() as tmp:
            self.app = RuntimeApplication(
                ContentRepository([self.node1, self.node2]),
                persistence=PersistenceStore(tmp),
            )
            self._queue("RT01-N01", "REVIEW-A", priority=100)
            self._queue("RT02-N01", "REVIEW-B", priority=90)
            first = self._command("start_review")
            self.assertEqual(first["task"]["node_id"], "RT01-N01")
            active_session_id = self.app.session.session_id
            self._command("save")

            self.app = RuntimeApplication(
                ContentRepository([self.node1, self.node2]),
                persistence=PersistenceStore(tmp),
            )
            restored = self._command("restore")
            self.assertEqual(restored["review_resume_phase"], "AWAITING_ANSWER")
            self.assertTrue(restored["review_session"]["active"])
            self.assertEqual(restored["current_node_id"], "RT01-N01")
            self.assertEqual(self.app.session.session_id, active_session_id)
            self.assertEqual(self.app.session.shown_node_ids.count("RT01-N01"), 1)
            self.assertEqual(len(self.app.memory.node_history["RT01-N01"].attempts), 1)

            with self.assertRaisesRegex(ValidationError, "Review Training controls task selection"):
                self._command("load_task", {"node_id": "RT02-N01"})
            with self.assertRaisesRegex(ValidationError, "scheduler-owned"):
                self._command("next")

            resumed = self._command("start_review")
            self.assertEqual(resumed["task"]["node_id"], "RT01-N01")
            self.assertEqual(resumed["review_session"]["shown"], 1)
            self.assertEqual(self.app.session.shown_node_ids.count("RT01-N01"), 1)
            self.assertEqual(len(self.app.memory.node_history["RT01-N01"].attempts), 1)

            grade = self.app.submit_answer("RT01-N01", self.node1["accepted_answer"])
            self.assertEqual(grade["review_session"]["results"]["CORRECT"], 1)
            with self.assertRaisesRegex(ValidationError, "already graded"):
                self.app.submit_answer("RT01-N01", self.node1["accepted_answer"])

    def test_graded_review_restart_advances_via_scheduler_without_regrading_or_direct_load(self):
        with TemporaryDirectory() as tmp:
            self.app = RuntimeApplication(
                ContentRepository([self.node1, self.node2]),
                persistence=PersistenceStore(tmp),
            )
            self._queue("RT01-N01", "REVIEW-A", priority=100)
            self._queue("RT02-N01", "REVIEW-B", priority=90)
            first = self._command("start_review")
            self.assertEqual(first["task"]["node_id"], "RT01-N01")
            self.app.submit_answer("RT01-N01", self.node1["accepted_answer"])
            attempts_after_grade = len(self.app.memory.node_history["RT01-N01"].attempts)
            self._command("save")

            self.app = RuntimeApplication(
                ContentRepository([self.node1, self.node2]),
                persistence=PersistenceStore(tmp),
            )
            restored = self._command("restore")
            self.assertEqual(restored["review_resume_phase"], "AWAITING_NEXT")
            self.assertTrue(restored["review_session"]["active"])
            self.assertEqual(restored["review_session"]["results"]["CORRECT"], 1)
            self.assertIsNone(restored["current_node_id"])
            self.assertIsNone(self.app._review_current_node_id)
            self.assertEqual(len(self.app.memory.node_history["RT01-N01"].attempts), attempts_after_grade)

            with self.assertRaisesRegex(ValidationError, "Review Training controls task selection"):
                self._command("load_task", {"node_id": "RT02-N01"})

            second = self._command("start_review")
            self.assertEqual(second["task"]["node_id"], "RT02-N01")
            self.assertEqual(second["review_session"]["shown"], 2)
            self.assertEqual(second["review_session"]["results"]["CORRECT"], 1)
            self.assertEqual(self.app.session.shown_node_ids.count("RT01-N01"), 1)
            self.assertEqual(self.app.session.shown_node_ids.count("RT02-N01"), 1)
            self.assertEqual(len(self.app.memory.node_history["RT01-N01"].attempts), attempts_after_grade)

    def test_finish_review_clears_runtime_entry_state(self):
        self._queue("RT01-N01", "REVIEW-A")
        self._command("start_review")
        response = self._command("finish_review")
        self.assertFalse(response["review_session"]["active"])
        self.assertIsNone(response["review_session"]["current_node_id"])
        self.assertIsNone(self.app.current_node_id)
        self.assertFalse(self.app._review_session_active)

    def test_inactive_finish_review_cannot_reset_normal_player_progression(self):
        self._command("load_task", {"node_id": "RT01-N01"})
        self.app.submit_answer("RT01-N01", self.node1["accepted_answer"])
        result_before = self.app._current_visit_result
        resolution_before = self.app._current_visit_resolution
        hints_before = dict(self.app._active_hint_counts)
        session_before = self.app.session

        with self.assertRaisesRegex(ValidationError, "Review Training session is not active"):
            self._command("finish_review")

        self.assertEqual(self.app.current_node_id, "RT01-N01")
        self.assertIs(self.app._current_visit_result, result_before)
        self.assertIs(self.app._current_visit_resolution, resolution_before)
        self.assertEqual(self.app._active_hint_counts, hints_before)
        self.assertIs(self.app.session, session_before)
        self.assertFalse(self.app._review_session_active)
        with self.assertRaisesRegex(ValidationError, "cannot change current node"):
            self._command("load_task", {"node_id": "RT02-N01"})

    def test_review_start_uses_fresh_session_and_adjacent_exact_cooldown(self):
        self._queue("RT01-N01", "REVIEW-A")
        previous = Session(session_id="previous")
        previous.correct_node_ids.add("RT01-N01")
        previous.successful_exact_ids.add("RT01-N01")
        self.app.session = previous
        response = self._command("start_review")
        self.assertIsNone(response["task"])
        self.assertFalse(response["review_session"]["active"])


if __name__ == "__main__":
    unittest.main()
