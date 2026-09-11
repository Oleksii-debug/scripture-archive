import json
import tempfile
import unittest
from pathlib import Path

from scripture_archive_platform.application.service import PlatformApplication
from scripture_archive_platform.content.library import CanonicalLibraryIndex
from scripture_archive_platform.content.loader import CanonicalContentLoader
from scripture_archive_platform.persistence.store import JsonFileStore
from scripture_archive_platform.transport.contracts import ALLOWLISTED_COMMANDS


class LibrarySearchTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        self.repo = root / "repo"
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
                            "player_prompt": "Compare the visible witness in Luke 22:8.",
                            "source_scope_visible_to_player": "Luke 22:8-13",
                            "required_evidence": ["SECRET_LOCKED_EVIDENCE"],
                            "task_family": "witness comparison",
                            "difficulty": "intro",
                            "required": True,
                            "confidence_code": "T1",
                            "textual_variant_flag": "none",
                            "accepted_answer": "SECRET_ACCEPTED_TRUTH",
                            "rejected_answers": "SECRET_REJECTED_TRUTH",
                            "grading": {"accepted_answer": "SECRET_GRADING_TRUTH"},
                            "hints": {"H1": "SECRET_HINT_TRUTH"},
                        }
                    ]
                },
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
        self.loader = CanonicalContentLoader(self.repo)
        self.library = CanonicalLibraryIndex(self.loader)
        self.store = JsonFileStore(root / "store")

    def tearDown(self):
        self.temp.cleanup()

    def call(self, app, command, payload=None):
        return app.handle(
            {
                "api_version": "scripture.transport.v1",
                "request_id": "library-test",
                "command": command,
                "payload": payload or {},
            }
        )

    def test_catalog_is_derived_from_canonical_loader_without_full_text_claim(self):
        catalog = self.library.catalog()
        self.assertEqual("scripture.library.catalog.v1", catalog["schema"])
        self.assertEqual("CanonicalContentLoader", catalog["source_of_truth"])
        self.assertTrue(catalog["derived_index"])
        self.assertFalse(catalog["bundled_full_bible_text"])
        self.assertFalse(catalog["text_provider_available"])
        self.assertEqual(1, catalog["machine_node_count"])
        self.assertEqual("DM-01", catalog["missions"][0]["mission_id"])
        self.assertIn("Luke 22:8-13", catalog["source_references"])
        serialized = json.dumps(catalog, ensure_ascii=False)
        self.assertNotIn("SECRET_", serialized)

    def test_search_finds_player_visible_passage_and_is_deterministic(self):
        first = self.library.search("Luke 22:8")
        second = self.library.search("Luke 22:8")
        self.assertEqual(first, second)
        self.assertEqual("scripture.library.search.v1", first["schema"])
        self.assertGreaterEqual(first["total"], 2)
        kinds = {item["kind"] for item in first["results"]}
        self.assertIn("mission", kinds)
        self.assertIn("task", kinds)
        self.assertTrue(all("Luke 22:8-13" in item["source_references"] for item in first["results"]))

    def test_search_does_not_index_answer_grading_hint_or_locked_evidence_truth(self):
        for secret in (
            "SECRET_ACCEPTED_TRUTH",
            "SECRET_REJECTED_TRUTH",
            "SECRET_GRADING_TRUTH",
            "SECRET_HINT_TRUTH",
            "SECRET_LOCKED_EVIDENCE",
        ):
            result = self.library.search(secret)
            self.assertEqual(0, result["total"], secret)
            self.assertEqual([], result["results"], secret)

    def test_filters_limits_and_invalid_requests_fail_closed(self):
        self.assertGreater(self.library.search("Luke", campaign_id="DM")["total"], 0)
        self.assertEqual(0, self.library.search("Luke", campaign_id="OTHER")["total"])
        self.assertGreater(self.library.search("Luke", mission_id="DM-01", limit=1)["total"], 0)
        self.assertEqual(1, len(self.library.search("Luke", mission_id="DM-01", limit=1)["results"]))
        for query in (None, "", "   ", "x" * 201):
            with self.assertRaises(ValueError):
                self.library.search(query)
        for limit in (0, 101, True, "10"):
            with self.assertRaises(ValueError):
                self.library.search("Luke", limit=limit)

    def test_allowlisted_application_transport_exposes_catalog_and_search(self):
        self.assertIn("library.catalog", ALLOWLISTED_COMMANDS)
        self.assertIn("library.search", ALLOWLISTED_COMMANDS)
        app = PlatformApplication(self.repo, store=self.store)
        bootstrap = self.call(app, "system.bootstrap")
        self.assertTrue(bootstrap["ok"])
        self.assertTrue(bootstrap["data"]["capabilities"]["library_catalog_search"])
        self.assertFalse(bootstrap["data"]["capabilities"]["bundled_full_bible_text"])
        search = self.call(app, "library.search", {"query": "Luke 22:8", "limit": 10})
        self.assertTrue(search["ok"])
        self.assertGreater(search["data"]["total"], 0)
        leaked = self.call(app, "library.search", {"query": "SECRET_ACCEPTED_TRUTH"})
        self.assertTrue(leaked["ok"])
        self.assertEqual(0, leaked["data"]["total"])

    def test_convergence_preserves_dev05_fail_closed_branch_target_security(self):
        self.assertNotIn("player.navigate_branch", ALLOWLISTED_COMMANDS)
        app = PlatformApplication(self.repo, store=self.store)
        navigate = self.call(app, "player.navigate_branch", {"target_node_id": "DM01-N01"})
        self.assertFalse(navigate["ok"])
        self.assertEqual("VALIDATION_ERROR", navigate["error"]["code"])
        targeted_next = self.call(app, "player.next", {"target_node_id": "DM01-N01"})
        self.assertFalse(targeted_next["ok"])
        self.assertEqual("VALIDATION_ERROR", targeted_next["error"]["code"])


if __name__ == "__main__":
    unittest.main()
