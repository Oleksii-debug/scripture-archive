import json
import tempfile
import unittest
from pathlib import Path

from scripture_archive_platform.application.service import PlatformApplication
from scripture_archive_platform.content.library import CanonicalLibraryIndex
from scripture_archive_platform.content.loader import CanonicalContentLoader, ContentLoadError
from scripture_archive_platform.persistence.store import JsonFileStore


D4_CAMPAIGN = "OT-R06-D4"
D4_FIRST_NODE = "OTAB01-N001"
D4_PRIVATE_ANSWER = "Yahweh tells Abram to leave his country, relatives, and father's house for a land Yahweh will show him."


def repository_root() -> Path:
    candidates = [Path.cwd().resolve(), *Path.cwd().resolve().parents, *Path(__file__).resolve().parents]
    for root in candidates:
        if (root / "docs" / "campaigns" / "OT" / "R06_D4_STAGE05_READABLE").is_dir():
            return root
    raise RuntimeError("qualified readable D4 repository root not found")


def request(command: str, payload=None) -> dict:
    return {
        "api_version": "scripture.transport.v1",
        "request_id": "d4-readable-library-test",
        "command": command,
        "payload": {} if payload is None else payload,
    }


class D4ReadableLibraryConsumptionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.repo = repository_root()
        cls.loader = CanonicalContentLoader(cls.repo)
        cls.library = CanonicalLibraryIndex(cls.loader)

    def test_qualified_d4_is_visible_read_only_with_exact_mission_node_counts(self):
        campaigns = {row["campaign_id"]: row for row in self.library.list_campaigns()}
        self.assertIn(D4_CAMPAIGN, campaigns)
        d4 = campaigns[D4_CAMPAIGN]
        self.assertEqual(15, d4["mission_count"])
        self.assertEqual(450, d4["machine_node_count"])
        self.assertEqual("READ_ONLY_LIBRARY", d4["content_access"])
        self.assertFalse(d4["gradeable_runtime_eligible"])

        missions = self.library.list_missions(D4_CAMPAIGN)
        self.assertEqual(15, len(missions))
        self.assertEqual(450, sum(int(row["node_count"]) for row in missions))
        self.assertTrue(all(row["content_access"] == "READ_ONLY_LIBRARY" for row in missions))
        self.assertTrue(all(row["gradeable_runtime_eligible"] is False for row in missions))
        self.assertTrue(all("INDEPENDENT_AUDIT_PENDING" in row["canonical_status"] for row in missions))

    def test_library_search_finds_real_d4_source_scope_without_private_answer_truth(self):
        found = self.library.search("Genesis 12:1", campaign_id=D4_CAMPAIGN, limit=100)
        task_ids = {row["id"] for row in found["results"] if row["kind"] == "task"}
        self.assertIn(D4_FIRST_NODE, task_ids)
        d4_rows = [row for row in found["results"] if row["campaign_id"] == D4_CAMPAIGN]
        self.assertTrue(d4_rows)
        self.assertTrue(all(row["content_access"] == "READ_ONLY_LIBRARY" for row in d4_rows))
        self.assertTrue(all(row["gradeable_runtime_eligible"] is False for row in d4_rows))

        private = self.library.search(D4_PRIVATE_ANSWER, campaign_id=D4_CAMPAIGN, limit=100)
        self.assertEqual(0, private["total"])
        serialized = json.dumps(found, ensure_ascii=False)
        for forbidden in ("accepted_answer", "accepted_variants", "grading", "hints", "required_evidence"):
            self.assertNotIn(forbidden, serialized)

    def test_d4_filesystem_presence_does_not_make_node_gradeable(self):
        with self.assertRaises(ContentLoadError):
            self.loader.load_node(D4_FIRST_NODE)
        gradeable_campaigns = {row["campaign_id"] for row in self.loader.list_campaigns()}
        self.assertNotIn(D4_CAMPAIGN, gradeable_campaigns)

    def test_existing_gradeable_runtime_nodes_remain_loadable_and_marked_eligible(self):
        self.loader._ensure()
        self.assertTrue(self.loader._nodes)
        node_id = sorted(self.loader._nodes)[0]
        loaded = self.loader.load_node(node_id)
        self.assertEqual(node_id, loaded["node_id"])
        mission = self.loader.mission_for_node(node_id)
        self.assertTrue(mission["mission_id"])

        result = self.library.search(node_id, limit=100)
        rows = [row for row in result["results"] if row["kind"] == "task" and row["id"] == node_id]
        self.assertEqual(1, len(rows))
        self.assertEqual("GRADEABLE_RUNTIME", rows[0]["content_access"])
        self.assertTrue(rows[0]["gradeable_runtime_eligible"])

    def test_packaged_application_exposes_d4_only_through_read_only_library(self):
        with tempfile.TemporaryDirectory() as tmp:
            app = PlatformApplication(self.repo, store=JsonFileStore(Path(tmp) / "store"))
            catalog = app.handle(request("library.catalog"))
            self.assertTrue(catalog["ok"])
            campaigns = {row["campaign_id"]: row for row in catalog["data"]["campaigns"]}
            self.assertEqual("READ_ONLY_LIBRARY", campaigns[D4_CAMPAIGN]["content_access"])
            self.assertFalse(campaigns[D4_CAMPAIGN]["gradeable_runtime_eligible"])

            search = app.handle(request("library.search", {"query": "Genesis 12:1", "campaign_id": D4_CAMPAIGN, "limit": 100}))
            self.assertTrue(search["ok"])
            self.assertIn(D4_FIRST_NODE, {row["id"] for row in search["data"]["results"]})

            player = app.handle(request("player.load_node", {"node_id": D4_FIRST_NODE}))
            self.assertFalse(player["ok"])
            self.assertEqual("VALIDATION_ERROR", player["error"]["code"])

    def test_unqualified_readable_canary_cannot_enter_gradeable_loader(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            mission_dir = root / "docs" / "campaigns" / "DEMO" / "M1"
            mission_dir.mkdir(parents=True)
            (mission_dir / "MISSION_INDEX.json").write_text(
                json.dumps(
                    {
                        "mission": {
                            "mission_id": "DM-01",
                            "campaign_id": "DM",
                            "title": "Gradeable control",
                            "entry_node": "DM01-N01",
                            "primary_scripture": ["Luke 1:1"],
                        },
                        "node_count": 1,
                        "node_files": ["nodes.json"],
                        "canonical_status": "SOURCE_AUDITED",
                    }
                ),
                encoding="utf-8",
            )
            (mission_dir / "nodes.json").write_text(
                json.dumps({"nodes": [{"node_id": "DM01-N01", "mission_id": "DM-01"}]}),
                encoding="utf-8",
            )
            readable = root / "docs" / "campaigns" / "OT" / "R06_D4_STAGE05_READABLE" / "nodes"
            readable.mkdir(parents=True)
            (readable / "nodes_canary.jsonl").write_text(
                json.dumps({"node_id": "D4-CANARY-N01", "mission_id": "D4-CANARY", "accepted_answer": "SECRET"}) + "\n",
                encoding="utf-8",
            )

            loader = CanonicalContentLoader(root)
            self.assertEqual("DM01-N01", loader.load_node("DM01-N01")["node_id"])
            with self.assertRaises(ContentLoadError):
                loader.load_node("D4-CANARY-N01")


if __name__ == "__main__":
    unittest.main()
