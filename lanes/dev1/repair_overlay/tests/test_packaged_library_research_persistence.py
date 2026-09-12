import json
import tempfile
import unittest
from pathlib import Path

from scripture_archive_platform.application.service import PlatformApplication
from scripture_archive_platform.persistence.store import JsonFileStore


class PackagedLibraryResearchPersistenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        self.repo = root / "repo"
        self.store_root = root / "store"
        mission_dir = self.repo / "docs" / "campaigns" / "DEMO" / "M1"
        mission_dir.mkdir(parents=True)
        (mission_dir / "MISSION_INDEX.json").write_text(
            json.dumps(
                {
                    "mission": {
                        "mission_id": "DM-01",
                        "campaign_id": "DM",
                        "title": "Luke investigation",
                        "difficulty": "intro",
                        "entry_node": "DM01-N01",
                        "primary_scripture": ["Luke 22:8-13"],
                        "secondary_scripture": "none",
                        "accessibility": {},
                    },
                    "node_count": 1,
                    "node_files": ["nodes.json"],
                    "canonical_status": "test",
                },
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
        (mission_dir / "nodes.json").write_text(
            json.dumps(
                {
                    "nodes": [
                        {
                            "node_id": "DM01-N01",
                            "mission_id": "DM-01",
                            "task_type": "SHORT_TEXT",
                            "player_prompt": "Compare the visible witness in Luke 22:8.",
                            "source_scope_visible_to_player": "Luke 22:8-13",
                            "required_evidence": ["Luke 22:8-13"],
                            "difficulty": "2/6",
                            "required": True,
                            "confidence_code": "T1",
                            "textual_variant_flag": "none",
                        }
                    ]
                },
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )

    def tearDown(self):
        self.temp.cleanup()

    def app(self):
        return PlatformApplication(self.repo, store=JsonFileStore(self.store_root))

    @staticmethod
    def call(app, command, payload=None):
        return app.handle(
            {
                "api_version": "scripture.transport.v1",
                "request_id": "library-research-test",
                "command": command,
                "payload": payload or {},
            }
        )

    def exact_task(self, app):
        response = self.call(
            app,
            "library.search",
            {"query": "DM01-N01", "campaign_id": "DM", "mission_id": "DM-01", "limit": 50},
        )
        self.assertTrue(response["ok"], response)
        matches = [
            row
            for row in response["data"]["results"]
            if row["kind"] == "task"
            and row["id"] == "DM01-N01"
            and row["campaign_id"] == "DM"
            and row["mission_id"] == "DM-01"
        ]
        self.assertEqual(1, len(matches))
        return matches[0]

    @staticmethod
    def target_from_row(row):
        return {
            "kind": "canonical_node",
            "id": row["id"],
            "campaign_id": row["campaign_id"],
            "mission_id": row["mission_id"],
            "node_id": row["id"],
            "source_references": list(row["source_references"]),
        }

    def test_library_task_uses_same_persistent_research_records_across_restart(self):
        first = self.app()
        bootstrap = self.call(first, "system.bootstrap")
        self.assertTrue(bootstrap["ok"])
        caps = bootstrap["data"]["capabilities"]
        self.assertTrue(caps["library_catalog_search"])
        self.assertTrue(caps["research_bookmarks_notes"])
        self.assertTrue(caps["research_workspace_persistence"])

        row = self.exact_task(first)
        target = self.target_from_row(row)
        bookmark = self.call(
            first,
            "research.upsert_bookmark",
            {
                "bookmark": {
                    "bookmark_id": row["id"],
                    "title": "Повернутися до свідчення",
                    "target": target,
                    "tags": ["library", "study"],
                }
            },
        )
        self.assertTrue(bookmark["ok"], bookmark)
        note = self.call(
            first,
            "research.upsert_note",
            {
                "note": {
                    "note_id": row["id"],
                    "title": "Особиста нотатка",
                    "body": "Перевірити формулювання у видимому cited text.",
                    "target": target,
                    "tags": ["library"],
                }
            },
        )
        self.assertTrue(note["ok"], note)

        restarted = self.app()
        bookmarks = self.call(restarted, "research.list_bookmarks", {"query": row["id"]})
        notes = self.call(restarted, "research.list_notes", {"query": row["id"]})
        self.assertTrue(bookmarks["ok"], bookmarks)
        self.assertTrue(notes["ok"], notes)
        self.assertEqual(1, len(bookmarks["data"]["bookmarks"]))
        self.assertEqual(1, len(notes["data"]["notes"]))
        saved_target = bookmarks["data"]["bookmarks"][0]["target"]
        self.assertEqual("CanonicalContentLoader", saved_target["truth_owner"])
        self.assertEqual(row["source_references"], saved_target["source_references"])
        self.assertEqual("DM01-N01", saved_target["node_id"])
        self.assertEqual("Перевірити формулювання у видимому cited text.", notes["data"]["notes"][0]["body"])

    def test_backend_rejects_mission_as_node_and_source_reference_rewrite(self):
        app = self.app()
        row = self.exact_task(app)
        target = self.target_from_row(row)
        target["source_references"] = ["Invented 99:99"]
        mismatch = self.call(
            app,
            "research.upsert_bookmark",
            {"bookmark": {"bookmark_id": row["id"], "title": "Bad source", "target": target, "tags": []}},
        )
        self.assertFalse(mismatch["ok"])
        self.assertEqual("VALIDATION_ERROR", mismatch["error"]["code"])

        fake_mission_target = {
            "kind": "canonical_node",
            "id": "DM-01",
            "campaign_id": "DM",
            "mission_id": "DM-01",
            "node_id": "DM-01",
            "source_references": ["Luke 22:8-13"],
        }
        mission_record = self.call(
            app,
            "research.upsert_bookmark",
            {
                "bookmark": {
                    "bookmark_id": "DM-01",
                    "title": "Mission is not a node",
                    "target": fake_mission_target,
                    "tags": [],
                }
            },
        )
        self.assertFalse(mission_record["ok"])
        self.assertEqual("VALIDATION_ERROR", mission_record["error"]["code"])

    def test_frontend_mount_is_bounded_and_personal_text_is_not_source_truth(self):
        overlay = Path(__file__).resolve().parents[1]
        shell = (overlay / "frontend" / "library-shell-compat.js").read_text(encoding="utf-8")
        module = (overlay / "frontend" / "library-research-persistence.js").read_text(encoding="utf-8")
        self.assertIn("import './library-research-persistence.js';", shell)
        self.assertIn("Research persistence capability", module)
        self.assertIn("Вони не є source claims", module)
        self.assertIn("row.kind === 'task'", module)
        self.assertIn("validateSearchResponse", module)
        self.assertIn("buildResearchTarget", module)
        self.assertNotIn("innerHTML", module)
        self.assertNotIn("eval(", module)
        self.assertNotIn("localStorage", module)


if __name__ == "__main__":
    unittest.main()
