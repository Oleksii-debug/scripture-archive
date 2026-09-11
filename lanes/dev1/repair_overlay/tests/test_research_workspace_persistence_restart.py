import json
import tempfile
import unittest
from pathlib import Path

from scripture_archive_platform.application.research_workspace import (
    CANONICAL_TARGET_TRUTH_OWNER,
    ResearchWorkspaceService,
)
from scripture_archive_platform.content.loader import CanonicalContentLoader, TaskPresentationMapper
from scripture_archive_platform.persistence.store import JsonFileStore


def build_canonical_fixture(root: Path):
    repo_root = root / "repo"
    campaign_dir = repo_root / "docs" / "campaigns" / "DM"
    campaign_dir.mkdir(parents=True, exist_ok=True)
    mission_index = {
        "mission": {
            "campaign_id": "DM",
            "mission_id": "DM-01",
            "title": "Passover preparation",
            "primary_scripture": ["Luke 22:8-13"],
            "secondary_scripture": "none",
        },
        "node_count": 1,
        "node_files": ["nodes.json"],
        "canonical_status": "source_audited",
    }
    node_shard = {
        "nodes": [
            {
                "node_id": "DM01-N01",
                "mission_id": "DM-01",
                "task_type": "SHORT_TEXT",
                "player_prompt": "What does the cited passage state?",
                "source_scope_visible_to_player": "Luke 22:8-13",
                "required_evidence": ["Luke 22:8-13"],
                "difficulty": "2/6",
                "required": True,
            }
        ]
    }
    (campaign_dir / "MISSION_INDEX.json").write_text(
        json.dumps(mission_index, ensure_ascii=False), encoding="utf-8"
    )
    (campaign_dir / "nodes.json").write_text(
        json.dumps(node_shard, ensure_ascii=False), encoding="utf-8"
    )
    return CanonicalContentLoader(repo_root), TaskPresentationMapper()


class ResearchWorkspaceRestartPersistenceTests(unittest.TestCase):
    def test_bookmark_and_note_survive_fresh_store_and_canonical_loader_instances(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            store_root = root / "state"
            loader, mapper = build_canonical_fixture(root)
            target = {
                "kind": "canonical_node",
                "id": "DM01-N01",
                "campaign_id": "DM",
                "mission_id": "DM-01",
                "node_id": "DM01-N01",
                # Deliberately omitted: source_references are canonical-derived.
            }

            first = ResearchWorkspaceService(JsonFileStore(store_root), loader, mapper)
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
            self.assertEqual(["Luke 22:8-13"], bookmark["target"]["source_references"])
            self.assertEqual(CANONICAL_TARGET_TRUTH_OWNER, bookmark["target"]["truth_owner"])

            restarted_loader, restarted_mapper = build_canonical_fixture(root)
            second = ResearchWorkspaceService(
                JsonFileStore(store_root), restarted_loader, restarted_mapper
            )
            self.assertEqual([bookmark], second.list_bookmarks())
            self.assertEqual([note], second.list_notes())
            self.assertTrue(second.delete_bookmark("bm-restart"))

            third_loader, third_mapper = build_canonical_fixture(root)
            third = ResearchWorkspaceService(
                JsonFileStore(store_root), third_loader, third_mapper
            )
            self.assertEqual([], third.list_bookmarks())
            self.assertEqual([note], third.list_notes())

    def test_restart_fails_closed_if_canonical_target_becomes_stale(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            store_root = root / "state"
            loader, mapper = build_canonical_fixture(root)
            service = ResearchWorkspaceService(JsonFileStore(store_root), loader, mapper)
            service.upsert_bookmark(
                {
                    "bookmark_id": "bm-stale",
                    "title": "Canonical link",
                    "target": {
                        "kind": "canonical_node",
                        "id": "DM01-N01",
                        "campaign_id": "DM",
                        "mission_id": "DM-01",
                        "node_id": "DM01-N01",
                    },
                    "tags": [],
                }
            )

            (root / "repo" / "docs" / "campaigns" / "DM" / "nodes.json").write_text(
                json.dumps({"nodes": []}), encoding="utf-8"
            )
            stale_loader = CanonicalContentLoader(root / "repo")
            stale = ResearchWorkspaceService(JsonFileStore(store_root), stale_loader, TaskPresentationMapper())
            with self.assertRaisesRegex(Exception, "unknown machine-readable canonical node"):
                stale.list_bookmarks()

    def test_corrupt_existing_json_file_is_not_treated_as_absent_workspace(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            store_root = root / "state"
            loader, mapper = build_canonical_fixture(root)
            service = ResearchWorkspaceService(JsonFileStore(store_root), loader, mapper)
            service.upsert_note(
                {
                    "note_id": "note-corrupt",
                    "title": "Persisted note",
                    "body": "Keep this data fail closed on corruption.",
                    "tags": [],
                }
            )

            note_path = store_root / "research_workspace" / "notes.json"
            self.assertTrue(note_path.is_file())
            note_path.write_text("{not valid json", encoding="utf-8")

            restarted = ResearchWorkspaceService(JsonFileStore(store_root), loader, mapper)
            with self.assertRaisesRegex(ValueError, "unreadable"):
                restarted.list_notes()

            quarantined = list((store_root / "research_workspace").glob("notes.corrupt-*.json"))
            self.assertTrue(quarantined)


if __name__ == "__main__":
    unittest.main()
