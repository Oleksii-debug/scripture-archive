from pathlib import Path
import shutil
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"
HARNESS = Path(__file__).with_name("review_queue_lifecycle_harness.cjs")


class PackagedReviewQueueLifecycleTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.js = (FRONTEND / "review-queue-ui.js").read_text(encoding="utf-8")
        cls.gate = (FRONTEND / "review-queue-request-gate.js").read_text(encoding="utf-8")

    def test_production_ui_binds_generation_gate_to_all_async_side_effects(self):
        self.assertIn("createRequestGenerationGate", self.js)
        self.assertIn("requestGate.begin()", self.js)
        self.assertIn("requestGate.invalidate()", self.js)
        self.assertGreaterEqual(self.js.count("requestGate.isCurrent(generation)"), 4)
        self.assertIn("reviewViewActive = false", self.js)
        self.assertIn("review.classList.contains('hidden')", self.js)
        self.assertIn("deactivateReviewQueue();", self.js)
        self.assertIn("if (!requestGate.isCurrent(generation)) return;\n    loadedOnce = true;", self.js)
        self.assertIn("if (!requestGate.isCurrent(generation)) return;\n    loadedOnce = false;", self.js)

    def test_generation_gate_is_visibility_bound_and_monotonic(self):
        self.assertIn("generation += 1", self.gate)
        self.assertIn("token === generation", self.gate)
        self.assertIn("isVisible() === true", self.gate)

    def test_deferred_leave_reopen_and_overlapping_refresh_are_executable(self):
        node = shutil.which("node")
        self.assertIsNotNone(node, "Node.js is required by the DEV1 platform qualification environment")
        completed = subprocess.run(
            [node, str(HARNESS)],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        self.assertEqual(0, completed.returncode, completed.stdout + completed.stderr)
        self.assertIn("deferred-response harness: PASS", completed.stdout)


if __name__ == "__main__":
    unittest.main()
