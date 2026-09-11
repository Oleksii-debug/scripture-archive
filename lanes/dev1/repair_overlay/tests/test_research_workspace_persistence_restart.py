import tempfile
import unittest
from pathlib import Path

from scripture_archive_platform.application.research_workspace import ResearchWorkspaceService
from scripture_archive_platform.persistence.store import JsonFileStore


class ResearchWorkspaceRestartPersistenceTests(unittest.TestCase):
    def test_bookmark_and_note_survive_fresh_json_file_store_instances(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            target = {
                "kind": "passage",
                "id": "luke-22-8-13",
                "campaign_id": "DM",
                "mission_id": "DM-01",
                "node_id": "DM01-N01",
                "source_references": ["Luke 22:8-13"],
            }

            first = ResearchWorkspaceService(JsonFileStore(root))
            bookmark = first.upsert_bookmark(
                {
                    "bookmark_id": "bm-restart",
                    "title": "Passover preparation",
                    "target": target,
                    "tags": ["restart", "Luke"],
                }
            )
            note = first.upsert_note(
                {
                    "note_id": "note-restart",
                    "title": "Witness observation",
                    "body": "The cited passage states the preparation instruction.",
                    "target": target,
                    "tags": ["restart", "witness"],
                }
            )

            second = ResearchWorkspaceService(JsonFileStore(root))
            self.assertEqual([bookmark], second.list_bookmarks())
            self.assertEqual([note], second.list_notes())
            self.assertTrue(second.delete_bookmark("bm-restart"))

            third = ResearchWorkspaceService(JsonFileStore(root))
            self.assertEqual([], third.list_bookmarks())
            self.assertEqual([note], third.list_notes())

    def test_corrupt_existing_json_file_is_not_treated_as_absent_workspace(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            service = ResearchWorkspaceService(JsonFileStore(root))
            service.upsert_note(
                {
                    "note_id": "note-corrupt",
                    "title": "Persisted note",
                    "body": "Keep this data fail closed on corruption.",
                    "tags": [],
                }
            )

            note_path = root / "research_workspace" / "notes.json"
            self.assertTrue(note_path.is_file())
            note_path.write_text("{not valid json", encoding="utf-8")

            restarted = ResearchWorkspaceService(JsonFileStore(root))
            with self.assertRaisesRegex(ValueError, "unreadable"):
                restarted.list_notes()

            quarantined = list((root / "research_workspace").glob("notes.corrupt-*.json"))
            self.assertTrue(quarantined)


if __name__ == "__main__":
    unittest.main()
