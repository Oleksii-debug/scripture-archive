import unittest
from pathlib import Path


class ApplicationUpdateStagingUiTests(unittest.TestCase):
    def test_staging_action_is_semantic_empty_payload_and_truthful_about_boundary(self):
        platform = Path(__file__).resolve().parents[1]
        script = (platform / "frontend" / "application-update.js").read_text(encoding="utf-8")
        self.assertIn("application_update.select_verify", script)
        self.assertIn("application_update.select_verify_stage", script)
        self.assertIn("payload:{}", script)
        self.assertIn("application-update-stage", script)
        self.assertIn("aria-describedby", script)
        self.assertIn("same-publisher Authenticode", script)
        self.assertIn("Install, replace, restart і rollback не виконуються", script)
        self.assertIn("Нічого не встановлено, не замінено й не запущено", script)
        self.assertNotIn("innerHTML", script)
        compact = script.replace(" ", "")
        self.assertNotIn("payload:{path", compact)
        self.assertNotIn("staged_path", script)
        self.assertNotIn("source_path", script)


if __name__ == "__main__":
    unittest.main()
