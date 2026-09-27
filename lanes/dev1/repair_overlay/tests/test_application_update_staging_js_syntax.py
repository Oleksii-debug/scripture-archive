import shutil
import subprocess
import unittest
from pathlib import Path


@unittest.skipUnless(shutil.which("node"), "Node.js is required for frontend syntax qualification")
class ApplicationUpdateStagingJavaScriptSyntaxTests(unittest.TestCase):
    def test_application_update_module_parses_as_javascript(self):
        platform = Path(__file__).resolve().parents[1]
        script = platform / "frontend" / "application-update.js"
        completed = subprocess.run(
            [shutil.which("node"), "--check", str(script)],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
        self.assertEqual(0, completed.returncode, completed.stderr or completed.stdout)


if __name__ == "__main__":
    unittest.main()
