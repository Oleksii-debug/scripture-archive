import copy
import unittest

from scripture_archive_platform.application.research_workspace import (
    BOOKMARK_SCHEMA,
    CANONICAL_TARGET_TRUTH_OWNER,
    NOTE_SCHEMA,
    ResearchWorkspaceService,
)
from scripture_archive_platform.content.loader import TaskPresentationMapper


class FakeStore:
    def __init__(self):
        self.data = {}
        self.unreadable = set()

    def get_json(self, namespace, key, default=None):
        if (namespace, key) in self.unreadable:
            return default
        return self.data.get((namespace, key), default)

    def put_json(self, namespace, key, value):
        self.unreadable.discard((namespace, key))
        self.data[(namespace, key)] = value

    def list_keys(self, namespace):
        keys = {key for ns, key in self.data if ns == namespace}
        keys.update(key for ns, key in self.unreadable if ns == namespace)
        return sorted(keys)


class FakeCanonicalLoader:
    def __init__(self):
        self.node = {
            "node_id": "DM01-N01",
            "mission_id": "DM-01",
            "task_type": "SHORT_TEXT",
            "player_prompt": "What does the cited passage state?",
            "source_scope_visible_to_player": "Luke 22:8-13",
            "required_evidence": ["Luke 22:8-13"],
            "difficulty": "2/6",
            "required": True,
        }
        self.mission = {
            "campaign_id": "DM",
            "mission_id": "DM-01",
            "title": "Passover preparation",
            "primary_scripture": ["Luke 22:8-13"],
        }

    def load_node(self, node_id):
        if node_id != self.node["node_id"]:
            raise ValueError("unknown machine-readable canonical node")
        return dict(self.node)

    def mission_for_node(self, node_id):
        if node_id != self.node["node_id"]:
            raise KeyError(node_id)
        return dict(self.mission)


class ResearchWorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.store = FakeStore()
        self.loader = FakeCanonicalLoader()
        self.mapper = TaskPresentationMapper()
        self.service = self._new_service()
        self.target = {
            "kind": "canonical_node",
            "id": "DM01-N01",
            "campaign_id": "DM",
            "mission_id": "DM-01",
            "node_id": "DM01-N01",
            "source_references": ["Luke 22:8-13"],
        }

    def _new_service(self):
        return ResearchWorkspaceService(self.store, self.loader, self.mapper)

    def test_bookmark_round_trip_update_query_and_delete(self):
        first = self.service.upsert_bookmark(
            {
                "bookmark_id": "bm-1",
                "title": "Passover preparation",
                "target": self.target,
                "tags": ["Luke", "research", "luke"],
            }
        )
        self.assertEqual(BOOKMARK_SCHEMA, first["schema"])
        self.assertEqual(["Luke", "research"], first["tags"])
        self.assertEqual(CANONICAL_TARGET_TRUTH_OWNER, first["target"]["truth_owner"])
        restarted = self._new_service()
        self.assertEqual([first], restarted.list_bookmarks())
        self.assertEqual([first], restarted.list_bookmarks("Luke 22:8"))
        self.assertEqual([], restarted.list_bookmarks("Matthew"))
        updated = restarted.upsert_bookmark(
            {
                "bookmark_id": "bm-1",
                "title": "Updated title",
                "target": self.target,
                "tags": ["research"],
            }
        )
        self.assertEqual("Updated title", updated["title"])
        self.assertEqual(1, len(restarted.list_bookmarks()))
        self.assertTrue(restarted.delete_bookmark("bm-1"))
        self.assertFalse(restarted.delete_bookmark("bm-1"))
        self.assertEqual([], restarted.list_bookmarks())

    def test_canonical_source_references_are_derived_when_caller_omits_them(self):
        target = dict(self.target)
        del target["source_references"]
        bookmark = self.service.upsert_bookmark(
            {"bookmark_id": "bm-derived", "title": "Canonical target", "target": target, "tags": []}
        )
        self.assertEqual(["Luke 22:8-13"], bookmark["target"]["source_references"])
        self.assertEqual(CANONICAL_TARGET_TRUTH_OWNER, bookmark["target"]["truth_owner"])

    def test_nonexistent_mismatched_or_fabricated_canonical_target_fails_closed(self):
        bad_targets = []
        for field, value in (
            ("kind", "passage"),
            ("id", "DM01-N99"),
            ("campaign_id", "PA"),
            ("mission_id", "DM-99"),
            ("node_id", "DM01-N99"),
        ):
            target = dict(self.target)
            target[field] = value
            bad_targets.append(target)
        fabricated = dict(self.target)
        fabricated["source_references"] = ["Fabricated 99:99"]
        bad_targets.append(fabricated)
        missing_mission = dict(self.target)
        del missing_mission["mission_id"]
        bad_targets.append(missing_mission)

        for target in bad_targets:
            with self.subTest(target=target):
                with self.assertRaises((ValueError, KeyError)):
                    self.service.upsert_bookmark(
                        {"bookmark_id": "bm-bad", "title": "Rejected", "target": target, "tags": []}
                    )

    def test_note_restart_persistence_and_canonical_reference_link(self):
        note = self.service.upsert_note(
            {
                "note_id": "note-1",
                "title": "Witness observation",
                "body": "The cited passage states the preparation instruction.",
                "target": self.target,
                "tags": ["witness", "Luke"],
            }
        )
        self.assertEqual(NOTE_SCHEMA, note["schema"])
        restarted = self._new_service()
        rows = restarted.list_notes("preparation Luke")
        self.assertEqual([note], rows)
        self.assertEqual(["Luke 22:8-13"], rows[0]["target"]["source_references"])
        self.assertEqual(CANONICAL_TARGET_TRUTH_OWNER, rows[0]["target"]["truth_owner"])
        self.assertTrue(restarted.delete_note("note-1"))
        self.assertEqual([], restarted.list_notes())

    def test_note_can_be_unattached_plain_research_text(self):
        note = self.service.upsert_note(
            {
                "note_id": "note-free",
                "title": "Open question",
                "body": "Not stated in cited text.",
                "tags": [],
            }
        )
        self.assertIsNone(note["target"])
        self.assertEqual([note], self.service.list_notes("not stated"))

    def test_input_validation_fails_closed(self):
        bad_bookmarks = [
            {"bookmark_id": "../escape", "title": "x", "target": self.target},
            {"bookmark_id": " bm ", "title": "x", "target": self.target},
            {"bookmark_id": "bm", "title": "<b>markup</b>", "target": self.target},
            {"bookmark_id": "bm", "title": "javascript:alert(1)", "target": self.target},
            {"bookmark_id": "bm", "title": "x", "target": {"kind": "canonical_node"}},
            {"bookmark_id": "bm", "title": "x", "target": self.target, "extra": True},
        ]
        for payload in bad_bookmarks:
            with self.subTest(payload=payload):
                with self.assertRaises((ValueError, KeyError)):
                    self.service.upsert_bookmark(payload)

        bad_notes = [
            {"note_id": " note ", "title": "x", "body": "ok"},
            {"note_id": "note", "title": "x", "body": "<script>alert(1)</script>"},
            {"note_id": "note", "title": "x", "body": "data:text/html,bad"},
            {"note_id": "note", "title": "x", "body": "ok", "tags": ["x"] * 21},
            {"note_id": "note", "title": "x", "body": "ok", "unknown": 1},
        ]
        for payload in bad_notes:
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):
                    self.service.upsert_note(payload)

    def test_absent_collection_is_empty_but_falsey_malformed_persistence_fails_closed(self):
        self.assertEqual([], self.service.list_bookmarks())
        self.assertEqual([], self.service.list_notes())
        for key in ("bookmarks", "notes"):
            for malformed in ([], 0, "", False, None):
                with self.subTest(key=key, malformed=malformed):
                    self.store.data[("research_workspace", key)] = malformed
                    with self.assertRaises(ValueError):
                        self._new_service()._load(key)
            self.store.data.pop(("research_workspace", key), None)

    def test_store_default_on_existing_unreadable_key_fails_closed(self):
        for key in ("bookmarks", "notes"):
            with self.subTest(key=key):
                self.store.unreadable.add(("research_workspace", key))
                with self.assertRaisesRegex(ValueError, "unreadable"):
                    self._new_service()._load(key)
                self.store.unreadable.clear()

    def test_tampered_persistence_is_revalidated_and_rejected(self):
        self.store.data[("research_workspace", "notes")] = {
            "note-1": {
                "schema": NOTE_SCHEMA,
                "note_id": "note-1",
                "title": "Injected",
                "body": "<script>bad()</script>",
                "target": None,
                "tags": [],
            }
        }
        with self.assertRaises(ValueError):
            self._new_service().list_notes()

        self.store.data[("research_workspace", "notes")] = {
            "note-1": {
                "schema": "scripture.research.note.v999",
                "note_id": "note-1",
                "title": "Wrong schema",
                "body": "plain",
                "target": None,
                "tags": [],
            }
        }
        with self.assertRaises(ValueError):
            self._new_service().list_notes()

    def test_persisted_canonical_target_classification_and_refs_are_revalidated(self):
        valid = self.service.upsert_bookmark(
            {"bookmark_id": "bm-1", "title": "Valid", "target": self.target, "tags": []}
        )
        for mutate in (
            lambda target: target.__setitem__("truth_owner", "Caller"),
            lambda target: target.__setitem__("source_references", ["Fabricated 99:99"]),
            lambda target: target.__setitem__("mission_id", "DM-99"),
        ):
            record = copy.deepcopy(valid)
            mutate(record["target"])
            self.store.data[("research_workspace", "bookmarks")] = {"bm-1": record}
            with self.assertRaises((ValueError, KeyError)):
                self._new_service().list_bookmarks()

    def test_stored_key_id_mismatch_or_padding_fails_closed(self):
        valid = self.service.upsert_bookmark(
            {"bookmark_id": "bm-1", "title": "Valid", "target": self.target, "tags": []}
        )
        self.store.data[("research_workspace", "bookmarks")] = {"bm-2": valid}
        with self.assertRaises(ValueError):
            self._new_service().list_bookmarks()

        self.store.data[("research_workspace", "bookmarks")] = {" bm-1 ": valid}
        with self.assertRaises(ValueError):
            self._new_service().list_bookmarks()


if __name__ == "__main__":
    unittest.main()
