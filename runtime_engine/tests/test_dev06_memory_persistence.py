import json
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from scripture_archive_runtime.mastery import MasteryEngine
from scripture_archive_runtime.memory import PlayerMemoryService
from scripture_archive_runtime.models import (
    Correctness,
    KnowledgeState,
    MasteryConsequence,
    MasteryState,
    PlayerMemory,
    QueueKind,
    RetrievalRelation,
    SchedulerCandidate,
    Session,
)
from scripture_archive_runtime.persistence import CURRENT_SCHEMA_VERSION, PersistenceStore
from scripture_archive_runtime.scheduler import Scheduler
from scripture_archive_runtime.state_codec import restore_memory, serialize_memory

UTC = timezone.utc


class MemoryServiceTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 8, 23, 12, tzinfo=UTC)
        self.service = PlayerMemoryService()

    def test_restart_closes_previous_session_and_adjacent_exact_is_available(self):
        memory = PlayerMemory("p")
        first = self.service.start_session(memory, session_id="s1", now=self.now)
        self.service.record_correct(first, node_id="LN01-N01", exact_identity_ids=("LN01-N01-EQUIV",))
        second = self.service.start_session(memory, session_id="s2", now=self.now + timedelta(hours=1))
        self.assertEqual(first.ended_reason, "restart_recovery")
        self.assertEqual(self.service.adjacent_successful_exact_ids(memory, second), {"LN01-N01", "LN01-N01-EQUIV"})

    def test_session_retention_rolls_up_without_losing_counts(self):
        memory = PlayerMemory("p")
        for i in range(5):
            session = Session(f"s{i}", shown_node_ids=[f"N{i}"], correct_node_ids={f"N{i}"}, successful_exact_ids={f"N{i}"})
            memory.sessions.append(session)
        self.service.trim_sessions(memory, limit=2)
        self.assertEqual([s.session_id for s in memory.sessions], ["s3", "s4"])
        self.assertEqual(memory.session_rollup["archived_sessions"], 3)
        self.assertEqual(memory.session_rollup["archived_correct_nodes"], 3)

    def test_review_queue_upserts_deterministically(self):
        memory = PlayerMemory("p")
        c1 = MasteryConsequence("concept", KnowledgeState.LEARNING, KnowledgeState.LEARNING, self.now + timedelta(days=1), 1, "partial")
        c2 = MasteryConsequence("concept", KnowledgeState.LEARNING, KnowledgeState.LAPSED, self.now + timedelta(hours=6), .25, "incorrect")
        self.service.enqueue_review(memory, c1, node_id="N")
        self.service.enqueue_review(memory, c2, node_id="N")
        self.assertEqual(len(memory.review_queue), 1)
        self.assertEqual(memory.review_queue[0].reason, "incorrect")
        self.assertEqual(memory.review_queue[0].priority, 100)


class SchedulerTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 8, 23, 12, tzinfo=UTC)
        self.memory = PlayerMemory("p")
        prev = Session("prev", ended_at=self.now - timedelta(hours=1), successful_exact_ids={"N-EXACT"})
        self.current = Session("current", started_at=self.now)
        self.memory.sessions = [prev, self.current]
        self.scheduler = Scheduler()

    def candidate(self, node, relation, queue=QueueKind.DUE, **kwargs):
        return SchedulerCandidate(node_id=node, task_family=kwargs.pop("task_family", "compare"), queue=queue, concept_ids=("c",), relation=relation, **kwargs)

    def test_adjacent_exact_cooldown_is_automatic_but_variant_is_allowed(self):
        exact = self.candidate("N-EXACT", RetrievalRelation.EXACT)
        variant = self.candidate("N-VAR", RetrievalRelation.VARIANT, paired_exact_node_id="N-EXACT")
        self.assertEqual(self.scheduler.eligible(exact, self.memory, self.current, now=self.now), (False, "adjacent_session_exact_cooldown"))
        self.assertTrue(self.scheduler.eligible(variant, self.memory, self.current, now=self.now)[0])

    def test_future_due_is_not_eligible(self):
        future = self.candidate("N-FUTURE", RetrievalRelation.VARIANT, due_at=self.now + timedelta(days=1))
        self.assertEqual(self.scheduler.eligible(future, self.memory, self.current, now=self.now), (False, "not_due_yet"))

    def test_persisted_fatigue_changes_deterministic_choice(self):
        self.memory.recent_fatigue["task_family:compare"] = 8
        compare = self.candidate("A", RetrievalRelation.NONE, queue=QueueKind.NEW, task_family="compare")
        evidence = self.candidate("B", RetrievalRelation.NONE, queue=QueueKind.NEW, task_family="evidence")
        self.assertEqual(self.scheduler.choose_next([compare, evidence], self.memory, self.current, now=self.now).candidate.node_id, "B")


class PersistenceTests(unittest.TestCase):
    def test_schema_v2_migrates_to_v3_and_preserves_history_scale(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            old = {"schema_version": 2, "profile": {}, "settings": {}, "sessions": [], "history": {}, "mastery": {}, "review_queue": [], "constructor_drafts": {}, "keymap": {}, "evidence_exposure": {}, "accessibility_state": {}}
            (root / "state.json").write_text(json.dumps(old), encoding="utf-8")
            state = PersistenceStore(root).load()
            self.assertEqual(state["schema_version"], CURRENT_SCHEMA_VERSION)
            self.assertIn("session_rollup", state)
            state["history"] = {f"N{i}": {"node_id": f"N{i}"} for i in range(2505)}
            store = PersistenceStore(root)
            store.save(state)
            self.assertEqual(len(store.load()["history"]), 2505)

    def test_corrupt_primary_does_not_overwrite_known_good_backup_on_next_save(self):
        with tempfile.TemporaryDirectory() as td:
            store = PersistenceStore(td)
            first = store.default_state(); first["profile"] = {"name": "good"}; store.save(first)
            second = store.default_state(); second["profile"] = {"name": "second"}; store.save(second)
            store.state_path.write_text("{broken", encoding="utf-8")
            third = store.default_state(); third["profile"] = {"name": "third"}; store.save(third)
            backup = json.loads(store.backup_path.read_text(encoding="utf-8"))
            self.assertEqual(backup["profile"]["name"], "good")
            self.assertEqual(store.load()["profile"]["name"], "third")

    def test_delete_progress_preserves_configuration_and_creates_recovery_point(self):
        with tempfile.TemporaryDirectory() as td:
            store = PersistenceStore(td)
            state = store.default_state()
            state["profile"] = {"profile_id": "p", "name": "User"}
            state["settings"] = {"theme": "dark"}
            state["keymap"] = {"next": "Alt+N"}
            state["history"] = {"N": {"node_id": "N"}}
            store.save(state)
            deleted = store.delete_progress()
            self.assertEqual(deleted["history"], {})
            self.assertEqual(deleted["settings"]["theme"], "dark")
            self.assertEqual(deleted["keymap"]["next"], "Alt+N")
            self.assertTrue(store.list_recovery_points())

    def test_state_codec_preserves_multiple_sessions_and_passthrough_config(self):
        memory = PlayerMemory("p")
        s1 = Session("s1", ended_at=datetime(2026, 8, 22, tzinfo=UTC), correct_node_ids={"A"}, successful_exact_ids={"A"})
        s2 = Session("s2", started_at=datetime(2026, 8, 23, tzinfo=UTC))
        memory.sessions = [s1, s2]
        payload = serialize_memory(memory, s2, "B", base_state={"settings": {"theme": "dark"}, "keymap": {"next": "Alt+N"}, "profile": {"name": "User"}})
        self.assertEqual(len(payload["sessions"]), 2)
        self.assertEqual(payload["settings"]["theme"], "dark")
        self.assertEqual(payload["profile"]["name"], "User")
        restored = PlayerMemory("x")
        restore_memory(restored, payload)
        self.assertEqual(len(restored.sessions), 2)
        self.assertEqual(restored.sessions[0].successful_exact_ids, {"A"})


class MasteryTests(unittest.TestCase):
    def test_guided_review_due_becomes_stable_not_stuck_due(self):
        state = MasteryState("c", state=KnowledgeState.REVIEW_DUE, stability_days=8)
        result = MasteryEngine().apply(state, correctness=Correctness.CORRECT, independent=False, used_hints=1, now=datetime(2026, 8, 23, tzinfo=UTC))
        self.assertEqual(result.after, KnowledgeState.STABLE)
        self.assertGreater(result.due_at, datetime(2026, 8, 23, tzinfo=UTC))


if __name__ == "__main__":
    unittest.main()

class PlayerStateRepositoryTests(unittest.TestCase):
    def test_restore_starts_new_session_and_save_preserves_passthrough(self):
        from scripture_archive_runtime.player_state import PlayerStateRepository
        with tempfile.TemporaryDirectory() as td:
            store = PersistenceStore(td)
            prior_memory = PlayerMemory("p")
            prior = Session("prior", started_at=datetime(2026, 8, 22, tzinfo=UTC), successful_exact_ids={"LN01-N01"}, correct_node_ids={"LN01-N01"})
            prior_memory.sessions = [prior]
            payload = serialize_memory(prior_memory, prior, "LN01-N01", base_state={"settings": {"theme": "dark"}, "keymap": {"next": "Alt+N"}})
            store.save(payload)

            memory = PlayerMemory("new")
            repo = PlayerStateRepository(store)
            restored = repo.restore(memory, session_id="current", now=datetime(2026, 8, 23, tzinfo=UTC))
            self.assertEqual(restored.session.session_id, "current")
            self.assertEqual(memory.sessions[-2].ended_reason, "restart_recovery")
            self.assertEqual(repo.memory_service.adjacent_successful_exact_ids(memory, restored.session), {"LN01-N01"})

            repo.save(memory, restored.session, "LN01-N01")
            saved = store.load()
            self.assertEqual(saved["settings"]["theme"], "dark")
            self.assertEqual(saved["keymap"]["next"], "Alt+N")
            self.assertEqual(len(saved["sessions"]), 2)

    def test_ten_thousand_history_records_roundtrip_under_state_boundary(self):
        with tempfile.TemporaryDirectory() as td:
            store = PersistenceStore(td)
            state = store.default_state()
            state["history"] = {f"LN-STRESS-{i:05d}": {"node_id": f"LN-STRESS-{i:05d}"} for i in range(10000)}
            store.save(state)
            self.assertEqual(len(store.load()["history"]), 10000)
