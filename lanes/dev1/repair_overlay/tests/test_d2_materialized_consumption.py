import json
import shutil
import tempfile
import unittest
from pathlib import Path

from scripture_archive_platform.content.d2_materialization import (
    D2MaterializationLoadError,
    LegacyD2MaterializationLoader,
)
from scripture_archive_platform.content.loader import CanonicalContentLoader, TaskPresentationMapper


REPO_ROOT = Path(__file__).resolve().parents[4]
D2_REL = Path("docs/campaigns/PA/R06_DEV2_MATERIALIZATION_05")


class D2MaterializedConsumptionTests(unittest.TestCase):
    def test_exact_materialization_is_hash_verified_and_discoverable(self):
        d2 = LegacyD2MaterializationLoader(REPO_ROOT)
        d2._ensure()
        self.assertEqual(len(d2._nodes), 386)
        self.assertEqual(
            [m["mission_id"] for m in d2.list_missions("PA")],
            ["PA-03", "PA-04", "PA-05", "PA-06", "PA-07", "PA-08"],
        )
        self.assertEqual(d2.load_node("PA03-N001")["mission_id"], "PA-03")
        self.assertEqual(d2.mission_for_node("PA03-N001")["entry_node"], "PA03-N001")
        self.assertEqual(d2.next_node_id("PA03-N001", "correct"), "PA03-N002")

    def test_canonical_loader_merges_d2_without_replacing_existing_campaign_truth(self):
        loader = CanonicalContentLoader(REPO_ROOT)
        campaigns = {item["campaign_id"]: item for item in loader.list_campaigns()}
        self.assertIn("PA", campaigns)
        pa_missions = {item["mission_id"] for item in loader.list_missions("PA")}
        self.assertTrue({"PA-03", "PA-04", "PA-05", "PA-06", "PA-07", "PA-08"}.issubset(pa_missions))
        node = loader.load_node("PA03-N001")
        self.assertEqual(node["source_scope_visible_to_player"], "Acts 9:10")
        surface = TaskPresentationMapper().to_renderable(node, loader.mission_for_node("PA03-N001"))
        self.assertEqual(surface["node_id"], "PA03-N001")
        self.assertEqual(surface["task_type"], "SINGLE_CHOICE")
        self.assertTrue(surface["accessibility"]["nonvisual_equivalent"].strip())

    def test_manifest_aggregate_tamper_fails_closed(self):
        with tempfile.TemporaryDirectory() as td:
            temp_repo = Path(td)
            target = temp_repo / D2_REL
            target.parent.mkdir(parents=True)
            shutil.copytree(REPO_ROOT / D2_REL, target)
            manifest_path = target / "MATERIALIZATION_MANIFEST_v1.0.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["collections"]["nodes"]["aggregate_sha256"] = "0" * 64
            manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
            with self.assertRaisesRegex(D2MaterializationLoadError, "node aggregate mismatch"):
                LegacyD2MaterializationLoader(temp_repo)._ensure()

    def test_evidence_index_tamper_fails_closed(self):
        with tempfile.TemporaryDirectory() as td:
            temp_repo = Path(td)
            target = temp_repo / D2_REL
            target.parent.mkdir(parents=True)
            shutil.copytree(REPO_ROOT / D2_REL, target)
            index_path = target / "evidence_hash_index.json"
            index = json.loads(index_path.read_text(encoding="utf-8"))
            index["records"][0]["sha256"] = "0" * 64
            index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
            with self.assertRaisesRegex(D2MaterializationLoadError, "per-record hash index"):
                LegacyD2MaterializationLoader(temp_repo)._ensure()


if __name__ == "__main__":
    unittest.main()
