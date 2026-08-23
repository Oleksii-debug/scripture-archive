import tempfile
import unittest
from pathlib import Path

from scripture_archive_runtime.release_security import scan_text, scan_tree


class ReleaseSecurityTests(unittest.TestCase):
    def test_benign_example_is_not_flagged(self):
        self.assertEqual(scan_text("OPENAI_API_KEY=sk-EXAMPLE-NOT-A-SECRET", "example.txt"), [])

    def test_high_confidence_token_is_flagged_without_secret_echo(self):
        fake = "sk-" + "A" * 32
        findings = scan_text(f"OPENAI_API_KEY={fake}\n", "config.txt")
        self.assertEqual(len(findings), 1)
        rendered = findings[0].as_dict()
        self.assertEqual(rendered["rule"], "OPENAI_API_KEY")
        self.assertEqual(rendered["line"], 1)
        self.assertNotIn(fake, repr(rendered))

    def test_private_key_header_is_flagged(self):
        findings = scan_text("-----BEGIN PRIVATE KEY-----\nabc\n", "key.pem")
        self.assertEqual([finding.rule for finding in findings], ["PRIVATE_KEY"])

    def test_forbidden_secret_filename_is_flagged(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "token.json").write_text("{}", encoding="utf-8")
            findings = scan_tree(root)
            self.assertTrue(any(f.rule == "FORBIDDEN_SECRET_FILENAME" and f.path == "token.json" for f in findings))

    def test_binary_file_is_ignored(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "blob.bin").write_bytes(b"\x00sk-" + b"A" * 32)
            self.assertEqual(scan_tree(root), [])

    def test_build_and_dist_directories_are_ignored(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "build").mkdir()
            (root / "dist").mkdir()
            fake = "sk-" + "A" * 32
            (root / "build" / "generated.txt").write_text(fake, encoding="utf-8")
            (root / "dist" / "generated.txt").write_text(fake, encoding="utf-8")
            self.assertEqual(scan_tree(root), [])


if __name__ == "__main__":
    unittest.main()
