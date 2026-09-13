from pathlib import Path
import tempfile
import unittest

from scripture_archive_runtime.integration_materializer import (
    MaterializationError,
    PackageSpec,
    materialize_packages,
)


def _spec(lane: str) -> PackageSpec:
    return PackageSpec(
        lane=lane,
        zip_path="not-opened.zip",
        expected_sha256="0" * 64,
        drive_id="drive-id",
        branch_head="head",
        node_members=(),
        evidence_members=(),
        expected_nodes=0,
        expected_evidence=0,
    )


class IntegrationMaterializerLaneSafetyTests(unittest.TestCase):
    def test_traversal_lane_fails_before_output_mutation(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            output = root / "materialized"
            output.mkdir()
            sentinel = output / "keep.txt"
            sentinel.write_text("preserve", encoding="utf-8")
            escaped = root / "escape"

            with self.assertRaisesRegex(MaterializationError, "single path segment"):
                materialize_packages([_spec("../escape")], output)

            self.assertEqual(sentinel.read_text(encoding="utf-8"), "preserve")
            self.assertFalse(escaped.exists())

    def test_windows_reserved_lane_fails_before_output_mutation(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "materialized"
            output.mkdir()
            sentinel = output / "keep.txt"
            sentinel.write_text("preserve", encoding="utf-8")

            with self.assertRaisesRegex(MaterializationError, "unsafe Windows path semantics"):
                materialize_packages([_spec("CON")], output)

            self.assertEqual(sentinel.read_text(encoding="utf-8"), "preserve")

    def test_case_insensitive_duplicate_lanes_fail_before_output_mutation(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "materialized"
            output.mkdir()
            sentinel = output / "keep.txt"
            sentinel.write_text("preserve", encoding="utf-8")

            with self.assertRaisesRegex(MaterializationError, "unique case-insensitively"):
                materialize_packages([_spec("DEV1"), _spec("dev1")], output)

            self.assertEqual(sentinel.read_text(encoding="utf-8"), "preserve")

    def test_sha_mismatch_fails_before_output_mutation(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            output = root / "materialized"
            output.mkdir()
            sentinel = output / "keep.txt"
            sentinel.write_text("preserve", encoding="utf-8")
            package = root / "corrupt.zip"
            package.write_bytes(b"not-the-expected-package")

            spec = PackageSpec(
                lane="DEV1",
                zip_path=str(package),
                expected_sha256="0" * 64,
                drive_id="drive-id",
                branch_head="head",
                node_members=(),
                evidence_members=(),
                expected_nodes=0,
                expected_evidence=0,
            )

            with self.assertRaisesRegex(MaterializationError, "SHA256 mismatch"):
                materialize_packages([spec], output)

            self.assertEqual(sentinel.read_text(encoding="utf-8"), "preserve")


if __name__ == "__main__":
    unittest.main()
