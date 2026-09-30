import json
import unittest
from pathlib import Path

from scripture_archive_platform.content.loader import ContentLoadError, TaskPresentationMapper


class D3PlayerComparisonProvenanceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.repo = Path(__file__).resolve().parents[4]
        cls.root = cls.repo / "docs" / "campaigns" / "GW" / "R06_DEV3_CLOSURE_03"
        mission_data = json.loads((cls.root / "registries" / "GW_MISSION_INDEX_v1.2.json").read_text(encoding="utf-8"))
        cls.missions = {item["mission_id"]: item for item in mission_data["missions"]}
        cls.nodes = []
        for path in sorted((cls.root / "nodes").glob("GW-*_NODES_v1.2.json")):
            cls.nodes.extend(json.loads(path.read_text(encoding="utf-8"))["nodes"])
        cls.mapper = TaskPresentationMapper()

    def test_every_explicit_complete_multi_witness_task_has_complete_public_basis(self):
        checked = 0
        for node in self.nodes:
            grading = node.get("grading") or {}
            witnesses = grading.get("comparison_witnesses")
            if grading.get("comparison_coverage") != "explicit_complete_for_effective_scope" or not isinstance(witnesses, list) or len(witnesses) < 2:
                continue
            projected = self.mapper.to_renderable(node, self.missions[node["mission_id"]])
            public = projected.get("comparison_provenance")
            self.assertIsNotNone(public, node["node_id"])
            self.assertEqual("scripture.player-comparison-provenance.v1", public["schema"])
            self.assertEqual("explicit_complete_for_effective_scope", public["coverage"])
            self.assertEqual(witnesses, [row["witness"] for row in public["witnesses"]])
            self.assertEqual(len(witnesses), len(public["witnesses"]))
            for row in public["witnesses"]:
                self.assertTrue(row["source_scope"].startswith(row["witness"] + " "), (node["node_id"], row))
            encoded = json.dumps(public, ensure_ascii=False)
            for forbidden in ("accepted_answer", "accepted_variants", "accepted_propositions", "runtime_submission_example", "grading"):
                self.assertNotIn(forbidden, encoded)
            checked += 1
        self.assertEqual(32, checked)

    def test_comparison_provenance_inventory_keeps_local_and_complete_classes_distinct(self):
        records = []
        for node in self.nodes:
            grading = node.get("grading") or {}
            if grading.get("comparison_provenance_id") or node.get("comparison_provenance_id"):
                records.append(grading.get("comparison_coverage"))
        self.assertEqual(78, len(records))
        self.assertEqual(76, records.count("explicit_complete_for_effective_scope"))
        self.assertEqual(2, records.count("witness_local_provenance_only"))

    def test_reported_exclusivity_nodes_expose_four_witness_basis_without_answer_truth(self):
        affected = {"GW01-N02", "GW06-N04", "GW08-N12", "GW10-N10", "GW12-N04"}
        by_id = {node["node_id"]: node for node in self.nodes}
        self.assertEqual(affected, affected & set(by_id))
        for node_id in sorted(affected):
            node = by_id[node_id]
            projected = self.mapper.to_renderable(node, self.missions[node["mission_id"]])
            rows = projected["comparison_provenance"]["witnesses"]
            self.assertEqual(["Matthew", "Mark", "Luke", "John"], [row["witness"] for row in rows])
            encoded = json.dumps(projected["comparison_provenance"], ensure_ascii=False)
            self.assertNotIn(str(node["accepted_answer"]), encoded)
            for alias in node.get("accepted_variants") or []:
                self.assertNotIn(str(alias), encoded)

    def test_explicit_complete_projection_fails_closed_when_a_witness_scope_is_missing(self):
        node = {
            "grading": {
                "comparison_coverage": "explicit_complete_for_effective_scope",
                "comparison_witnesses": ["Matthew", "Mark"],
            }
        }
        mission = {"primary_scripture": ["Matthew 1:1-2"]}
        with self.assertRaisesRegex(ContentLoadError, "one visible source scope for Mark"):
            self.mapper._comparison_provenance(node, mission)

    def test_frontend_renders_comparison_basis_as_semantic_text_list(self):
        html = (Path(__file__).resolve().parents[1] / "frontend" / "index.html").read_text(encoding="utf-8")
        app = (Path(__file__).resolve().parents[1] / "frontend" / "app.js").read_text(encoding="utf-8")
        self.assertIn('id="comparison-provenance-panel"', html)
        self.assertIn('aria-labelledby="comparison-provenance-heading"', html)
        self.assertIn('id="comparison-provenance-list"', html)
        self.assertIn("renderComparisonProvenance(data.task)", app)
        self.assertIn("document.createElement('li')", app)
        self.assertIn("li.textContent=", app)
        self.assertNotIn("innerHTML", app)


if __name__ == "__main__":
    unittest.main()
