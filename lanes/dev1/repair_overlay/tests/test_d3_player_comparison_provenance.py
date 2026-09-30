import json
import re
import unittest
from pathlib import Path

from scripture_archive_platform.content.loader import TaskPresentationMapper


AFFECTED = {
    "GW01-N02",
    "GW06-N04",
    "GW08-N12",
    "GW10-N10",
    "GW12-N04",
}
EXCLUSIVITY = re.compile(r"\b(?:alone|unique|uniquely)\b", re.IGNORECASE)
PRIVATE_KEYS = {
    "accepted_answer",
    "accepted_variants",
    "accepted_propositions",
    "grading",
    "grader",
    "answer_key",
    "solution",
}


def repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "docs" / "campaigns" / "GW" / "R06_DEV3_CLOSURE_03").is_dir():
            return parent
    raise RuntimeError("repository root not found")


def all_d3_nodes(root: Path):
    node_root = root / "docs" / "campaigns" / "GW" / "R06_DEV3_CLOSURE_03" / "nodes"
    for path in sorted(node_root.glob("GW-*_NODES_v1.2.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        for node in payload["nodes"]:
            yield node


class D3PlayerComparisonProvenanceTests(unittest.TestCase):
    def test_exclusivity_tasks_expose_complete_answer_safe_comparison_scope(self):
        root = repo_root()
        candidates = []
        mapper = TaskPresentationMapper()
        for node in all_d3_nodes(root):
            grading = node.get("grading") or {}
            witnesses = grading.get("comparison_witnesses") or []
            accepted_text = json.dumps(
                {
                    "accepted_answer": node.get("accepted_answer"),
                    "accepted_variants": node.get("accepted_variants"),
                    "accepted_propositions": grading.get("accepted_propositions"),
                },
                ensure_ascii=False,
            )
            if (
                grading.get("comparison_coverage") == "explicit_complete_for_effective_scope"
                and len(witnesses) > 1
                and EXCLUSIVITY.search(accepted_text)
            ):
                candidates.append(node["node_id"])
                public = node.get("comparison_scope_visible_to_player")
                self.assertIsInstance(public, list, node["node_id"])
                self.assertEqual(
                    witnesses,
                    [row.get("witness") for row in public],
                    node["node_id"],
                )
                for row in public:
                    self.assertEqual({"witness", "passages"}, set(row), node["node_id"])
                    self.assertIsInstance(row["passages"], list, node["node_id"])
                    self.assertTrue(row["passages"], node["node_id"])
                    self.assertTrue(all(isinstance(p, str) and p.strip() == p and p for p in row["passages"]))
                    serialized = json.dumps(row, ensure_ascii=False)
                    for private in PRIVATE_KEYS:
                        self.assertNotIn(private, serialized, node["node_id"])

                surface = mapper.to_renderable(node)
                self.assertEqual(public, surface["comparison_scope"], node["node_id"])
                serialized_surface = json.dumps(surface, ensure_ascii=False)
                for private in ("accepted_answer", "accepted_variants", "accepted_propositions", "grading"):
                    self.assertNotIn(private, serialized_surface, node["node_id"])

        self.assertEqual(AFFECTED, set(candidates))

    def test_public_scopes_match_canonical_witness_relation_passages(self):
        root = repo_root()
        evidence_root = root / "docs" / "campaigns" / "GW" / "R06_DEV3_CLOSURE_03" / "evidence"
        relations = json.loads(
            (evidence_root / "GW_EVIDENCE_BOARD_WITNESSRELATION_v1.2.json").read_text(encoding="utf-8")
        )["records"]

        by_mission = {}
        for row in relations:
            mission = row["mission_id"]
            witness = row["witness"]
            by_mission.setdefault(mission, {}).setdefault(witness, [])
            if row["passage"] not in by_mission[mission][witness]:
                by_mission[mission][witness].append(row["passage"])

        for node in all_d3_nodes(root):
            if node["node_id"] not in AFFECTED:
                continue
            public = node["comparison_scope_visible_to_player"]
            expected_witnesses = node["grading"]["comparison_witnesses"]
            expected = [
                {"witness": witness, "passages": by_mission[node["mission_id"]][witness]}
                for witness in expected_witnesses
            ]
            self.assertEqual(expected, public, node["node_id"])

    def test_player_shell_renders_comparison_scope_keyboard_linearly(self):
        root = repo_root()
        frontend = root / "lanes" / "dev1" / "repair_overlay" / "frontend"
        index = (frontend / "index.html").read_text(encoding="utf-8")
        app = (frontend / "app.js").read_text(encoding="utf-8")
        self.assertIn('id="comparison-scope-panel"', index)
        self.assertIn('id="comparison-scope-list"', index)
        self.assertIn("Основа порівняння свідків", index)
        self.assertIn("data.task.comparison_scope", app)
        self.assertIn("comparisonScope.forEach", app)
        self.assertIn("document.createElement('dt')", app)
        self.assertIn("document.createElement('dd')", app)
        self.assertIn("textContent=row.witness", app)
        self.assertIn("textContent=(row.passages||[]).join('; ')", app)
        self.assertNotIn("comparisonList.innerHTML", app)


if __name__ == "__main__":
    unittest.main()
