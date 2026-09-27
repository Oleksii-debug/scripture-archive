#!/usr/bin/env python3
from __future__ import annotations

import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

from validate_dev2_evidence_bundle import BUNDLE_REL, BundleError, validate_bundle


class D2EvidenceBundleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.repo_root = Path(__file__).resolve().parents[1]

    def _copy_bundle(self) -> tuple[tempfile.TemporaryDirectory[str], Path]:
        tmp = tempfile.TemporaryDirectory()
        root = Path(tmp.name)
        target = root / BUNDLE_REL
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(self.repo_root / BUNDLE_REL, target)
        return tmp, root

    def test_exact_composed_bundle_passes_with_immutable_pins(self) -> None:
        report = validate_bundle(self.repo_root)
        self.assertEqual(report["status"], "PASS")
        self.assertEqual(report["record_count"], 184)
        self.assertEqual(report["independent_audit"], "PENDING")
        self.assertFalse(report["player_content_promoted"])

    def test_index_aggregate_tamper_fails_closed(self) -> None:
        tmp, root = self._copy_bundle()
        self.addCleanup(tmp.cleanup)
        path = root / BUNDLE_REL / "evidence_hash_index.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        data["aggregate_sha256"] = "0" * 64
        path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        with self.assertRaisesRegex(BundleError, "aggregate SHA256"):
            validate_bundle(root, enforce_raw_pins=False)

    def test_independent_audit_status_cannot_be_promoted_by_composition(self) -> None:
        tmp, root = self._copy_bundle()
        self.addCleanup(tmp.cleanup)
        path = root / BUNDLE_REL / "mission_metadata.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        data[0]["metadata"]["mission"]["source_audit_status"] = "INDEPENDENT_AUDIT_COMPLETE"
        path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        with self.assertRaisesRegex(BundleError, "independent-audit status"):
            validate_bundle(root, enforce_raw_pins=False)

    def test_duplicate_evidence_id_fails_closed(self) -> None:
        tmp, root = self._copy_bundle()
        self.addCleanup(tmp.cleanup)
        path = root / BUNDLE_REL / "evidence" / "part_001.jsonl"
        lines = path.read_text(encoding="utf-8").splitlines()
        first = json.loads(lines[0])
        second = json.loads(lines[1])
        second["evidence_id"] = first["evidence_id"]
        lines[1] = json.dumps(second, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        with self.assertRaisesRegex(BundleError, "duplicate evidence record id"):
            validate_bundle(root, enforce_raw_pins=False)

    def test_unknown_cross_link_fails_closed(self) -> None:
        tmp, root = self._copy_bundle()
        self.addCleanup(tmp.cleanup)
        path = root / BUNDLE_REL / "evidence" / "part_001.jsonl"
        lines = path.read_text(encoding="utf-8").splitlines()
        first = json.loads(lines[0])
        first["cross_links"] = ["EVR-R06-D2-NOT-PRESENT"]
        lines[0] = json.dumps(first, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        with self.assertRaises(BundleError):
            validate_bundle(root, enforce_raw_pins=False)

    def test_unexpected_symlink_in_authority_root_fails_closed(self) -> None:
        tmp, root = self._copy_bundle()
        self.addCleanup(tmp.cleanup)
        link = root / BUNDLE_REL / "historical-materializer-link"
        try:
            link.symlink_to("evidence_hash_index.json")
        except (OSError, NotImplementedError) as exc:
            self.skipTest(f"symlink creation unavailable: {exc}")
        with self.assertRaisesRegex(BundleError, "symlink is forbidden"):
            validate_bundle(root, enforce_raw_pins=False)


if __name__ == "__main__":
    unittest.main()
