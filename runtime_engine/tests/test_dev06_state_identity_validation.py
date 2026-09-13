import unittest
from datetime import datetime, timezone

from scripture_archive_runtime.models import PlayerMemory, Session
from scripture_archive_runtime.security import ValidationError
from scripture_archive_runtime.state_codec import restore_memory

UTC = timezone.utc


def base_state():
    return {
        "profile": {"profile_id": "p"},
        "history": {},
        "mastery": [],
        "review_queue": [],
        "sessions": [],
    }


class PersistedIdentityValidationTests(unittest.TestCase):
    def test_history_key_must_match_embedded_node_id(self):
        state = base_state()
        state["history"] = {"NODE-A": {"node_id": "NODE-B"}}
        with self.assertRaises(ValidationError):
            restore_memory(PlayerMemory("original"), state)

    def test_task_state_nested_shapes_fail_closed_without_memory_mutation(self):
        malformed_cases = [
            ({"attempts": {"not": "a list"}}, "task-state attempts must be a list"),
            ({"attempts": [7]}, "task-state attempt items must be objects"),
            ({"hint_uses": "not-a-list"}, "task-state hint_uses must be a list"),
            ({"hint_uses": [False]}, "task-state hint-use items must be objects"),
            ({"evidence_unlocked": "EVIDENCE-1"}, "task-state evidence_unlocked must be a list"),
        ]
        for malformed, expected_error in malformed_cases:
            with self.subTest(expected_error=expected_error):
                state = base_state()
                state["profile"] = {"profile_id": "replacement"}
                state["history"] = {"NODE-A": {"node_id": "NODE-A", **malformed}}
                memory = PlayerMemory("original")
                memory.sessions = [Session("keep")]
                with self.assertRaisesRegex(ValidationError, expected_error):
                    restore_memory(memory, state)
                self.assertEqual(memory.profile_id, "original")
                self.assertEqual([session.session_id for session in memory.sessions], ["keep"])
                self.assertEqual(memory.node_history, {})

    def test_attempt_node_id_must_match_containing_task_state(self):
        state = base_state()
        state["history"] = {
            "NODE-A": {
                "node_id": "NODE-A",
                "attempts": [
                    {
                        "node_id": "NODE-B",
                        "correctness": "CORRECT",
                        "score": 1.0,
                        "used_hints": 0,
                        "independent": True,
                    }
                ],
            }
        }
        memory = PlayerMemory("original")
        memory.sessions = [Session("keep")]
        with self.assertRaisesRegex(ValidationError, "Task-state attempt node_id mismatch"):
            restore_memory(memory, state)
        self.assertEqual(memory.profile_id, "original")
        self.assertEqual([session.session_id for session in memory.sessions], ["keep"])
        self.assertEqual(memory.node_history, {})

    def test_duplicate_mastery_concept_ids_are_rejected(self):
        state = base_state()
        state["mastery"] = [
            {"concept_id": "concept", "state": "STABLE"},
            {"concept_id": "concept", "state": "REVIEW_DUE"},
        ]
        with self.assertRaises(ValidationError):
            restore_memory(PlayerMemory("original"), state)

    def test_duplicate_review_queue_ids_are_rejected(self):
        state = base_state()
        due = datetime(2026, 8, 23, tzinfo=UTC).isoformat()
        state["review_queue"] = [
            {"queue_id": "review:1", "concept_id": "c1", "node_id": "N1", "due_at": due, "relation": "EXACT"},
            {"queue_id": "review:1", "concept_id": "c2", "node_id": "N2", "due_at": due, "relation": "VARIANT"},
        ]
        with self.assertRaises(ValidationError):
            restore_memory(PlayerMemory("original"), state)

    def test_duplicate_persisted_session_ids_are_rejected_without_mutation(self):
        state = base_state()
        stamp = datetime(2026, 8, 23, tzinfo=UTC).isoformat()
        state["sessions"] = [
            {"session_id": "same", "started_at": stamp},
            {"session_id": "same", "started_at": stamp},
        ]
        memory = PlayerMemory("original")
        memory.sessions = [Session("keep")]
        with self.assertRaises(ValidationError):
            restore_memory(memory, state)
        self.assertEqual([session.session_id for session in memory.sessions], ["keep"])


if __name__ == "__main__":
    unittest.main()
