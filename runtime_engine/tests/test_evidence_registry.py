from __future__ import annotations

import json
from pathlib import Path

import pytest

from scripture_archive_runtime.evidence_registry import (
    R05_EVIDENCE_INDEX,
    load_r05_evidence_registry,
)


def test_canonical_r05_registry_accepts_explicit_nonvisual_boolean() -> None:
    repo_root = Path(__file__).resolve().parents[2]

    bundle = load_r05_evidence_registry(repo_root)

    assert bundle.record_count > 0
    assert len(bundle.runtime.evidence) == bundle.record_count
    assert all(record["nonvisual_access"] is True for record in bundle.records.values())


@pytest.mark.parametrize("nonvisual_access", [False, "true", 1, None])
def test_r05_registry_rejects_noncanonical_nonvisual_access(
    tmp_path: Path,
    nonvisual_access: object,
) -> None:
    evidence_dir = tmp_path / "docs" / "evidence"
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

    with pytest.raises(ValueError, match=r"EVR-TEST-0001\.nonvisual_access must be literal true"):
        load_r05_evidence_registry(tmp_path)
