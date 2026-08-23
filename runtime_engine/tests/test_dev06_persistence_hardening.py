import json
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from scripture_archive_runtime.memory import PlayerMemoryService
from scripture_archive_runtime.models import Attempt, Correctness, PlayerMemory, Session, TaskState
from scripture_archive_runtime.persistence import CURRENT_SCHEMA_VERSION, PersistenceStore
from scripture_archive_runtime.security import ValidationError
from scripture_archive_runtime.state_codec import (
    deserialize_task_state,
    restore_memory,
    serialize_task_state,
)

UTC = timezone.utc


class AttemptEvidenceSemanticsTests(unittest.TestCase):
    def test_hinted_attempt_cannot_be_persisted_as_independent(self):
        state = TaskState(node_id="N")
        state.attempts.append(
            Attempt(
                node_id="N",
                correctness=Correctness.CORRECT,
                score=1.0,
                used_hints=3,
                independent=True,
                created_at=datetime(2026, 8, 23, tzinfo=UTC),
            )
        )

        raw = serialize_task_state(state)
        self.assertFalse(raw["attempts"][0]["independent"])
        restored = deserialize_task_state(raw)
        self.assertFalse(restored.attempts[0].independent)
        self.assertEqual(restored.attempts[0].used_hints, 3)

    def test_zero_hint_non_independent_attempt_remains_non_independent(self):
        state = TaskState(node_id="N")
        state.attempts.append(Attempt("N", Correctness.CORRECT, 1.0, 0, False))
        raw = serialize_task_state(state)
        self.assertFalse(raw["attempts"][0]["independent"])


class TransactionalRestoreTests(unittest.TestCase):
    def test_malformed_nested_history_does_not_partially_mutate_memory(self):
        memory = PlayerMemory("original")
        memory.campaign_checkpoints = {"C": "OLD"}
        memory.mistakes = {"OLD": 2}
        memory.sessions = [Session("original-session")]
        malformed = {
            "profile": {"profile_id": "replacement"},
            "campaign_checkpoints": {"C": "NEW"},
            "mistakes": {"NEW": 9},
            "history": {
                "N": {
                    "node_id": "N",
                    "attempts": [
                        {
                            "node_id": "N",
                            "correctness": "NOT_A_CORRECTNESS_VALUE",
                            "score": 0,
                            "used_hints": 0,
                            "independent": False,
                        }
                    ],
                }
            },
            "sessions": [],
            "mastery": {},
            "review_queue": [],
        }

        with self.assertRaises(ValueError):
            restore_memory(memory, malformed)

        self.assertEqual(memory.profile_id, "original")
        self.assertEqual(memory.campaign_checkpoints, {"C": "OLD"})
        self.assertEqual(memory.mistakes, {"OLD": 2})
        self.assertEqual([s.session_id for s in memory.sessions], ["original-session"])

    def test_legacy_mastery_mapping_is_accepted_without_schema_rewrite(self):
        memory = PlayerMemory("p")
        state = {
            "profile": {"profile_id": "p"},
            "history": {},
            "sessions": [],
            "review_queue": [],
            "mastery": {
                "concept-a": {
                    "state": "STABLE",
                    "stability_days": 4.0,
                    "difficulty": 0.4,
                    "consecutive_independent_successes": 2,
                    "guided_successes": 1,
                    "failures": 0,
                }
            },
        }
        restore_memory(memory, state)
        self.assertIn("concept-a", memory.concept_mastery)
        self.assertEqual(memory.concept_mastery["concept-a"].state.value, "STABLE")


class ImportFailureIsolationTests(unittest.TestCase):
    def _store_with_good_state(self, root: Path) -> PersistenceStore:
        store = PersistenceStore(root)
        good = store.default_state()
        good["profile"] = {"profile_id": "good"}
        good["settings"] = {"theme": "dark"}
        good["history"] = {"KEEP": {"node_id": "KEEP"}}
        store.save(good)
        return store

    def test_newer_schema_import_is_rejected_without_mutating_current_state(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            store = self._store_with_good_state(root)
            incoming = root / "incoming-newer.json"
            incoming.write_text(json.dumps({"schema_version": CURRENT_SCHEMA_VERSION + 1}), encoding="utf-8")

            with self.assertRaises(ValidationError):
                store.import_state(incoming)

            current = store.load()
            self.assertEqual(current["profile"]["profile_id"], "good")
            self.assertEqual(current["settings"]["theme"], "dark")
            self.assertIn("KEEP", current["history"])

    def test_malformed_json_import_is_rejected_without_mutating_current_state(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            store = self._store_with_good_state(root)
            incoming = root / "incoming-broken.json"
            incoming.write_text("{broken", encoding="utf-8")

            with self.assertRaises(json.JSONDecodeError):
                store.import_state(incoming)

            current = store.load()
            self.assertEqual(current["profile"]["profile_id"], "good")
            self.assertIn("KEEP", current["history"])


class LongRestartSimulationTests(unittest.TestCase):
    def test_250_restart_cycles_keep_bounded_sessions_and_adjacent_exact_identity(self):
        service = PlayerMemoryService()
        memory = PlayerMemory("p")
        start = datetime(2026, 8, 1, tzinfo=UTC)
        current = None
        for index in range(250):
            current = service.start_session(
                memory,
                session_id=f"s{index:03d}",
                now=start + timedelta(minutes=index),
            )
            service.record_correct(current, node_id=f"N{index:03d}")

        self.assertIsNotNone(current)
        self.assertEqual(len(memory.sessions), 200)
        self.assertEqual(memory.session_rollup["archived_sessions"], 50)
        self.assertEqual(
            service.adjacent_successful_exact_ids(memory, current),
            {"N248"},
        )


if __name__ == "__main__":
    unittest.main()
