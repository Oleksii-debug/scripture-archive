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
