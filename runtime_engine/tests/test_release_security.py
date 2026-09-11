import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripture_archive_runtime.release_security import scan_text, scan_tree, scan_tree_report


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
            report = scan_tree_report(root)
            self.assertTrue(any(f.rule == "FORBIDDEN_SECRET_FILENAME" and f.path == "token.json" for f in report.findings))
            self.assertEqual(report.verified_file_count, 1)
            self.assertEqual(report.clean_file_count, 0)

    def test_binary_file_is_explicitly_out_of_scope(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "blob.bin").write_bytes(b"\x00sk-" + b"A" * 32)
            report = scan_tree_report(root)
            self.assertTrue(report.passed)
            self.assertEqual(report.skipped_file_count, 1)
            self.assertEqual(list(report.findings), [])

    def test_build_and_dist_directories_are_ignored(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "build").mkdir()
            (root / "dist").mkdir()
            fake = "sk-" + "A" * 32
            (root / "build" / "generated.txt").write_text(fake, encoding="utf-8")
            (root / "dist" / "generated.txt").write_text(fake, encoding="utf-8")
            self.assertEqual(scan_tree(root), [])

    def test_large_text_is_stream_scanned_and_secret_is_blocking(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            fake = "sk-" + "A" * 32
            (root / "large.txt").write_text(("safe text\n" * 120_000) + fake + "\n", encoding="utf-8")
            report = scan_tree_report(root)
            self.assertFalse(report.passed)
            self.assertEqual(report.verified_file_count, 1)
            self.assertTrue(any(f.rule == "OPENAI_API_KEY" for f in report.findings))
            self.assertNotIn(fake, repr(report.as_dict()))

    def test_clean_large_text_is_verified_without_whole_file_size_bypass(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "large.txt").write_text("safe text\n" * 120_000, encoding="utf-8")
            report = scan_tree_report(root)
            self.assertTrue(report.passed)
            self.assertEqual(report.verified_file_count, 1)
            self.assertEqual(report.clean_file_count, 1)
            self.assertEqual(report.unverified_file_count, 0)

    def test_decode_failure_is_blocking_unverified(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "broken.txt").write_bytes(b"valid\n\xff\xfe")
            report = scan_tree_report(root)
            self.assertFalse(report.passed)
            self.assertEqual(report.unverified_file_count, 1)
            self.assertTrue(any(f.rule == "SCAN_UNVERIFIED_DECODE" for f in report.findings))

    def test_nul_in_text_scope_is_blocking_unverified(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "nul.txt").write_bytes(b"safe\x00text\n")
            report = scan_tree_report(root)
            self.assertFalse(report.passed)
            self.assertEqual(report.unverified_file_count, 1)
            self.assertTrue(any(f.rule == "SCAN_UNVERIFIED_NUL" for f in report.findings))

    def test_read_failure_is_blocking_unverified(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            candidate = root / "blocked.txt"
            candidate.write_text("safe", encoding="utf-8")
            original_open = Path.open

            def selective_open(path, *args, **kwargs):
                if path == candidate:
                    raise OSError("fixture read denied")
                return original_open(path, *args, **kwargs)

            with patch.object(Path, "open", selective_open):
                report = scan_tree_report(root)
            self.assertFalse(report.passed)
            self.assertEqual(report.unverified_file_count, 1)
            self.assertTrue(any(f.rule == "SCAN_UNVERIFIED_READ" for f in report.findings))


if __name__ == "__main__":
    unittest.main()
