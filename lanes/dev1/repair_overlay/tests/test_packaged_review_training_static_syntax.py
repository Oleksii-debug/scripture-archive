from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[4]


class PackagedReviewTrainingSyntaxTest(unittest.TestCase):
    def test_review_frontend_javascript_parses_when_node_is_available(self):
        node = "node"
        for name in ("review-queue-ui.js", "app.js"):
            path = ROOT / "frontend" / name
            try:
                result = subprocess.run([node, "--check", str(path)], capture_output=True, text=True, check=False)
            except FileNotFoundError:
                self.skipTest("Node.js is unavailable on this runner")
            self.assertEqual(result.returncode, 0, result.stderr)

    def test_review_python_modules_compile(self):
        paths = [
            REPO_ROOT / "runtime_engine" / "scripture_archive_runtime" / "application.py",
            REPO_ROOT / "runtime_engine" / "scripture_archive_runtime" / "security.py",
            ROOT / "scripture_archive_platform" / "transport" / "runtime_compat.py",
            ROOT / "scripture_archive_platform" / "transport" / "contracts.py",
            ROOT / "scripture_archive_platform" / "application" / "service.py",
        ]
        result = subprocess.run([sys.executable, "-m", "py_compile", *map(str, paths)], capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
