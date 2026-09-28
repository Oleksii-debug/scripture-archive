from pathlib import Path
import unittest


REPO_ROOT = Path(__file__).resolve().parents[4]
WORKFLOW = REPO_ROOT / ".github" / "workflows" / "r06-packaged-cross-testament.yml"

DIRECT_TRUTH_DEPENDENCIES = (
    "runtime_engine/scripture_archive_runtime/evidence_provenance.py",
    "runtime_engine/scripture_archive_runtime/evidence_registry.py",
    "runtime_engine/scripture_archive_runtime/evidence_materialization.py",
    "runtime_engine/scripture_archive_runtime/models.py",
    "docs/evidence/R05_EVIDENCE_PROVENANCE_REGISTRY_v0.1*.json",
    "docs/evidence/R06_PA02_STRUCTURED_EVIDENCE_INDEX_v0.1.json",
    "docs/evidence/PA02_DAMASCUS_ROAD_WITNESS_PACK_v0.1.md",
)


class CrossTestamentQualificationSurfaceTests(unittest.TestCase):
    def test_direct_truth_dependencies_are_watched_on_push_and_pull_request(self):
        workflow = WORKFLOW.read_text(encoding="utf-8")
        for path in DIRECT_TRUTH_DEPENDENCIES:
            token = f"- '{path}'"
            self.assertEqual(
                2,
                workflow.count(token),
                f"Cross-Testament qualification must watch {path} on push and pull_request",
            )

    def test_surface_regression_is_watched_and_executed(self):
        workflow = WORKFLOW.read_text(encoding="utf-8")
        own_path = "lanes/dev1/repair_overlay/tests/test_cross_testament_qualification_surface.py"
        self.assertEqual(2, workflow.count(f"- '{own_path}'"))
        self.assertIn(
            "python -m unittest lanes/dev1/repair_overlay/tests/test_cross_testament_qualification_surface.py -v",
            workflow,
        )


if __name__ == "__main__":
    unittest.main()
