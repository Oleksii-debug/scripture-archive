from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from scripture_archive_runtime.evidence_registry import (
    R05_EVIDENCE_INDEX,
    load_r05_evidence_registry,
)


class EvidenceRegistryTests(unittest.TestCase):
    def test_canonical_r05_registry_accepts_explicit_nonvisual_boolean(self) -> None:
        repo_root = Path(__file__).resolve().parents[2]

        bundle = load_r05_evidence_registry(repo_root)

        self.assertGreater(bundle.record_count, 0)
        self.assertEqual(len(bundle.runtime.evidence), bundle.record_count)
        self.assertTrue(
            all(record["nonvisual_access"] is True for record in bundle.records.values())
        )

    def test_r05_registry_rejects_noncanonical_nonvisual_access(self) -> None:
        for nonvisual_access in (False, "true", 1, None):
            with self.subTest(nonvisual_access=nonvisual_access):
                with tempfile.TemporaryDirectory() as temp_root:
                    repo_root = Path(temp_root)
                    evidence_dir = repo_root / "docs" / "evidence"
                    evidence_dir.mkdir(parents=True)
                    (evidence_dir / R05_EVIDENCE_INDEX).write_text(
                        json.dumps(
                            {
                                "registry_version": "v0.1",
                                "round": "R05",
                                "status": "INDEPENDENT_AUDIT_PENDING",
                                "record_count": 1,
                                "part_files": ["part.json"],
                            }
                        ),
                        encoding="utf-8",
                    )
                    (evidence_dir / "part.json").write_text(
                        json.dumps(
                            {
                                "records": [
                                    {
                                        "evidence_record_id": "EVR-TEST-0001",
                                        "node_id": "TEST-N01",
                                        "claim": "Explicit test proposition.",
                                        "confidence_code": "T1",
                                        "textual_variant_flag": "none",
                                        "source_scope": "Explicit test source scope.",
                                        "required_evidence": "Explicit test evidence.",
                                        "provenance_status": "SOURCE_AUDITED",
                                        "nonvisual_access": nonvisual_access,
                                    }
                                ]
                            }
                        ),
                        encoding="utf-8",
                    )

                    with self.assertRaisesRegex(
                        ValueError,
                        r"EVR-TEST-0001\.nonvisual_access must be literal true",
                    ):
                        load_r05_evidence_registry(repo_root)


if __name__ == "__main__":
    unittest.main()
