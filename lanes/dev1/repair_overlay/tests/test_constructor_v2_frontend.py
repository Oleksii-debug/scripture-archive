import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


class ConstructorV2FrontendTests(unittest.TestCase):
    def setUp(self):
        self.frontend = Path(__file__).resolve().parents[1] / "frontend"
        self.source = (self.frontend / "constructor-v2-ui.js").read_text(encoding="utf-8")

    def test_surface_is_semantic_keyboard_native_and_never_uses_unsafe_html(self):
        self.assertIn("button.type='button'", self.source)
        self.assertIn("aria-live", self.source)
        self.assertIn("Constructor V2 — історія та версії", self.source)
        self.assertIn("canonical content не змінено", self.source)
        self.assertNotIn("innerHTML", self.source)
        self.assertNotIn("eval(", self.source)
        self.assertNotIn("new Function", self.source)

    def test_module_is_mounted_by_existing_transport_additive_pattern(self):
        transport = (self.frontend / "transport.js").read_text(encoding="utf-8")
        self.assertIn("./constructor-v2-ui.js", transport)
        self.assertIn("installConstructorV2Surface", transport)

    def test_javascript_module_parses_when_node_is_available(self):
        node = shutil.which("node")
        if not node:
            self.skipTest("node is not installed in this local test environment")
        with tempfile.TemporaryDirectory() as tmp:
            candidate = Path(tmp) / "constructor-v2-ui.mjs"
            candidate.write_text(self.source, encoding="utf-8")
            completed = subprocess.run(
                [node, "--check", str(candidate)],
                capture_output=True,
                text=True,
                timeout=20,
            )
        self.assertEqual(0, completed.returncode, completed.stderr)


if __name__ == "__main__":
    unittest.main()
