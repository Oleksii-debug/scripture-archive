import shutil
import subprocess
import unittest
from pathlib import Path


@unittest.skipUnless(shutil.which("node"), "Node.js is required for frontend syntax qualification")
class ApplicationUpdateStagingJavaScriptSyntaxTests(unittest.TestCase):
    def test_application_update_modules_parse_as_javascript(self):
        platform = Path(__file__).resolve().parents[1]
        for filename in ("application-update.js", "pending-update.js"):
            with self.subTest(filename=filename):
                script = platform / "frontend" / filename
                completed = subprocess.run(
                    [shutil.which("node"), "--check", str(script)],
                    capture_output=True,
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                    check=False,
                )
                self.assertEqual(
                    0,
                    completed.returncode,
                    completed.stderr or completed.stdout,
                )


if __name__ == "__main__":
    unittest.main()
