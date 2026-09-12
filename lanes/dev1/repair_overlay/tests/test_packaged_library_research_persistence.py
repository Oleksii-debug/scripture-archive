import json
import sys
import tempfile
import unittest
from pathlib import Path

OVERLAY_ROOT = Path(__file__).resolve().parents[1]
if str(OVERLAY_ROOT) not in sys.path:
    sys.path.insert(0, str(OVERLAY_ROOT))

from scripture_archive_platform.application.research_workspace import ResearchWorkspaceService
from scripture_archive_platform.content.library import CanonicalLibraryIndex
from scripture_archive_platform.content.loader import CanonicalContentLoader, TaskPresentationMapper


class _LocalJsonStore:
    """Small disk-backed store for an isolated overlay regression.

    The repair overlay intentionally does not contain the complete production
    persistence package. This test store exercises ResearchWorkspaceService's real
    persistence contract without pretending the partial overlay is a full install.
    """

    def __init__(self, root: Path):
        self.root = Path(root)

    def _path(self, namespace: str, key: str) -> Path:
        if not namespace or not key or any(part in {"", ".", ".."} for part in (namespace, key)):
            raise ValueError("invalid store key")
        path = (self.root / namespace / f"{key}.json").resolve()
        if self.root.resolve() not in path.parents:
            raise ValueError("store path escape")
        return path

    def list_keys(self, namespace: str) -> list[str]:
        directory = (self.root / namespace).resolve()
        if not directory.exists():
            return []
        return sorted(path.stem for path in directory.glob("*.json") if path.is_file())

    def get_json(self, namespace: str, key: str, default=None):
        path = self._path(namespace, key)
        if not path.exists():
            return default
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return default

    def put_json(self, namespace: str, key: str, value) -> None:
        path = self._path(namespace, key)
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(path.suffix + ".tmp")
        temporary.write_text(json.dumps(value, ensure_ascii=False, sort_keys=True), encoding="utf-8")
        temporary.replace(path)


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

    def workspace(self):
        loader = CanonicalContentLoader(self.repo)
        return ResearchWorkspaceService(
            _LocalJsonStore(self.store_root),
            loader,
            TaskPresentationMapper(),
        )

    def exact_task(self):
        loader = CanonicalContentLoader(self.repo)
        response = CanonicalLibraryIndex(loader).search(
            "DM01-N01", campaign_id="DM", mission_id="DM-01", limit=50
        )
        matches = [
            row
            for row in response["results"]
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
        first = self.workspace()
        row = self.exact_task()
        target = self.target_from_row(row)
        bookmark = first.upsert_bookmark(
            {
                "bookmark_id": row["id"],
                "title": "Повернутися до свідчення",
                "target": target,
                "tags": ["library", "study"],
            }
        )
        note = first.upsert_note(
            {
                "note_id": row["id"],
                "title": "Особиста нотатка",
                "body": "Перевірити формулювання у видимому cited text.",
                "target": target,
                "tags": ["library"],
            }
        )
        self.assertEqual("CanonicalContentLoader", bookmark["target"]["truth_owner"])
        self.assertEqual("CanonicalContentLoader", note["target"]["truth_owner"])

        restarted = self.workspace()
        bookmarks = restarted.list_bookmarks(row["id"])
        notes = restarted.list_notes(row["id"])
        self.assertEqual(1, len(bookmarks))
        self.assertEqual(1, len(notes))
        saved_target = bookmarks[0]["target"]
        self.assertEqual("CanonicalContentLoader", saved_target["truth_owner"])
        self.assertEqual(row["source_references"], saved_target["source_references"])
        self.assertEqual("DM01-N01", saved_target["node_id"])
        self.assertEqual("Перевірити формулювання у видимому cited text.", notes[0]["body"])

    def test_backend_rejects_mission_as_node_and_source_reference_rewrite(self):
        workspace = self.workspace()
        row = self.exact_task()
        target = self.target_from_row(row)
        target["source_references"] = ["Invented 99:99"]
        with self.assertRaisesRegex(ValueError, "source_references"):
            workspace.upsert_bookmark(
                {
                    "bookmark_id": row["id"],
                    "title": "Bad source",
                    "target": target,
                    "tags": [],
                }
            )

        fake_mission_target = {
            "kind": "canonical_node",
            "id": "DM-01",
            "campaign_id": "DM",
            "mission_id": "DM-01",
            "node_id": "DM-01",
            "source_references": ["Luke 22:8-13"],
        }
        with self.assertRaises((ValueError, KeyError)):
            workspace.upsert_bookmark(
                {
                    "bookmark_id": "DM-01",
                    "title": "Mission is not a node",
                    "target": fake_mission_target,
                    "tags": [],
                }
            )

    def test_packaged_application_wiring_keeps_research_service_and_commands(self):
        service = (
            OVERLAY_ROOT / "scripture_archive_platform" / "application" / "service.py"
        ).read_text(encoding="utf-8")
        self.assertIn("self.research=ResearchWorkspaceService(self.store,self.loader,self.mapper)", service)
        for command in (
            "research.list_bookmarks",
            "research.upsert_bookmark",
            "research.delete_bookmark",
            "research.list_notes",
            "research.upsert_note",
            "research.delete_note",
        ):
            self.assertIn(f"cmd=='{command}'", service)
        self.assertIn("'research_bookmarks_notes':True", service)
        self.assertIn("'research_workspace_persistence':True", service)

    def test_frontend_mount_is_bounded_and_personal_text_is_not_source_truth(self):
        shell = (OVERLAY_ROOT / "frontend" / "library-shell-compat.js").read_text(encoding="utf-8")
        module = (OVERLAY_ROOT / "frontend" / "library-research-persistence.js").read_text(encoding="utf-8")
        self.assertIn("import './library-research-persistence.js';", shell)
        self.assertIn("Research persistence capability", module)
        self.assertIn("Вони не є source claims", module)
        self.assertIn("row.kind === 'task'", module)
        self.assertIn("validateSearchResponse", module)
        self.assertIn("buildResearchTarget", module)
        self.assertIn("hasTargetCollision", module)
        self.assertIn("targetMatchesContext", module)
        self.assertIn("invalidateLibraryResearchPersistence", module)
        self.assertIn("attributeFilter: ['class']", module)
        self.assertIn("aria-label", module)
        self.assertIn("DELETE_CONTROL_IDS", module)
        activate = module[module.index("async function activate"):module.index("async function save")]
        self.assertLess(activate.index("setPanelEnabled(false);"), activate.index("await refreshCurrent(mine);"))
        self.assertLess(activate.index("await refreshCurrent(mine);"), activate.index("setPanelEnabled(true);"))
        self.assertIn("else if (!DELETE_CONTROL_IDS.has(control.id))", module)
        self.assertNotIn("innerHTML", module)
        self.assertNotIn("eval(", module)
        self.assertNotIn("localStorage", module)


if __name__ == "__main__":
    unittest.main()
