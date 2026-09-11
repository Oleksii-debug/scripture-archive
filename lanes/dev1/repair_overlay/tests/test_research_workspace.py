import unittest

from scripture_archive_platform.application.research_workspace import (
    BOOKMARK_SCHEMA,
    NOTE_SCHEMA,
    ResearchWorkspaceService,
)


class FakeStore:
    def __init__(self):
        self.data = {}

    def get_json(self, namespace, key, default=None):
        return self.data.get((namespace, key), default)

    def put_json(self, namespace, key, value):
        self.data[(namespace, key)] = value


class ResearchWorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.store = FakeStore()
        self.service = ResearchWorkspaceService(self.store)
        self.target = {
            "kind": "passage",
            "id": "luke-22-8-13",
            "campaign_id": "DM",
            "mission_id": "DM-01",
            "node_id": "DM01-N01",
            "source_references": ["Luke 22:8-13"],
        }

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
        restarted = ResearchWorkspaceService(self.store)
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
        restarted = ResearchWorkspaceService(self.store)
        rows = restarted.list_notes("preparation Luke")
        self.assertEqual([note], rows)
        self.assertEqual(["Luke 22:8-13"], rows[0]["target"]["source_references"])
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
            {"bookmark_id": "bm", "title": "<b>markup</b>", "target": self.target},
            {"bookmark_id": "bm", "title": "javascript:alert(1)", "target": self.target},
            {"bookmark_id": "bm", "title": "x", "target": {"kind": "passage"}},
            {"bookmark_id": "bm", "title": "x", "target": self.target, "extra": True},
        ]
        for payload in bad_bookmarks:
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):
                    self.service.upsert_bookmark(payload)

        bad_notes = [
            {"note_id": "note", "title": "x", "body": "<script>alert(1)</script>"},
            {"note_id": "note", "title": "x", "body": "data:text/html,bad"},
            {"note_id": "note", "title": "x", "body": "ok", "tags": ["x"] * 21},
            {"note_id": "note", "title": "x", "body": "ok", "unknown": 1},
        ]
        for payload in bad_notes:
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):
                    self.service.upsert_note(payload)

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
            ResearchWorkspaceService(self.store).list_notes()

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
            ResearchWorkspaceService(self.store).list_notes()

    def test_stored_key_id_mismatch_fails_closed(self):
        valid = self.service.upsert_bookmark(
            {"bookmark_id": "bm-1", "title": "Valid", "target": self.target, "tags": []}
        )
        self.store.data[("research_workspace", "bookmarks")] = {"bm-2": valid}
        with self.assertRaises(ValueError):
            ResearchWorkspaceService(self.store).list_bookmarks()


if __name__ == "__main__":
    unittest.main()
