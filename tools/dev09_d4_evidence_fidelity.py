#!/usr/bin/env python3
"""Seal and verify complete D4 readable evidence fidelity for DEV09 materialization.

This is intentionally byte/serialization integrity tooling only. It does not
author or alter evidence truth. The manifest is sealed from the exact output of
the SHA-pinned FINALPREP transport plus the separately approved #60 overlay.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib

MANIFEST_REL = pathlib.Path(
    "docs/workflow/r06_dev09/D4_READABLE_MATERIALIZATION_MANIFEST.json"
)
EVIDENCE_REL = pathlib.Path("docs/campaigns/OT/R06_D4_STAGE05_READABLE/evidence")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canon(obj: object) -> bytes:
    return json.dumps(
        obj, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")


def aggregate_hash(hashes: dict[str, str]) -> str:
    return sha256(
        "".join(hashes[key] for key in sorted(hashes)).encode("ascii")
    )


def inspect_evidence(repo: pathlib.Path) -> tuple[list[dict], str]:
    root = repo / EVIDENCE_REL
    paths = sorted(root.glob("*.jsonl"))
    if not paths:
        raise SystemExit("evidence fidelity FAIL: no readable evidence files")

    files: list[dict] = []
    records: dict[str, str] = {}
    for path in paths:
        raw = path.read_bytes()
        files.append(
            {
                "path": str(path.relative_to(repo)).replace("\\", "/"),
                "bytes": len(raw),
                "sha256": sha256(raw),
            }
        )
        for lineno, line in enumerate(
            path.read_text(encoding="utf-8").splitlines(), 1
        ):
            if not line.strip():
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError as exc:
                raise SystemExit(
                    f"evidence fidelity FAIL invalid JSONL {path}:{lineno}: {exc}"
                ) from exc
            evidence_id = record.get("evidence_id")
            if not isinstance(evidence_id, str) or not evidence_id:
                raise SystemExit(
                    f"evidence fidelity FAIL missing evidence_id {path}:{lineno}"
                )
            if evidence_id in records:
                raise SystemExit(
                    f"evidence fidelity FAIL duplicate evidence_id {evidence_id}"
                )
            records[evidence_id] = sha256(canon(record))

    if len(records) != 90:
        raise SystemExit(
            f"evidence fidelity FAIL expected 90 records, got {len(records)}"
        )
    return files, aggregate_hash(records)


def seal(repo: pathlib.Path) -> None:
    manifest_path = repo / MANIFEST_REL
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("transport_payload_sha256") != (
        "e8b008c31462d7ed9388a7a84f73bb8666c8449181000751e9da45c2468779c9"
    ):
        raise SystemExit("evidence fidelity FAIL: unexpected transport authority")
    if (manifest.get("counts") or {}).get("evidence") != 90:
        raise SystemExit("evidence fidelity FAIL: manifest evidence count is not 90")

    files, aggregate = inspect_evidence(repo)
    manifest["evidence_files"] = files
    manifest["evidence_record_aggregate_sha256"] = aggregate
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    verify(repo)
    print(
        f"D4_EVIDENCE_MANIFEST_SEAL_PASS files={len(files)} records=90 aggregate={aggregate}"
    )


def verify(repo: pathlib.Path) -> None:
    manifest_path = repo / MANIFEST_REL
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    expected_files = manifest.get("evidence_files")
    expected_aggregate = manifest.get("evidence_record_aggregate_sha256")
    if not isinstance(expected_files, list) or not expected_files:
        raise SystemExit("evidence fidelity FAIL: manifest evidence_files missing")
    if not isinstance(expected_aggregate, str) or len(expected_aggregate) != 64:
        raise SystemExit(
            "evidence fidelity FAIL: manifest evidence aggregate missing"
        )

    files, aggregate = inspect_evidence(repo)
    if files != expected_files:
        raise SystemExit("evidence fidelity FAIL: evidence file byte manifest drift")
    if aggregate != expected_aggregate:
        raise SystemExit(
            f"evidence fidelity FAIL: record aggregate {aggregate} != {expected_aggregate}"
        )
    print(
        f"D4_EVIDENCE_VERIFY_PASS files={len(files)} records=90 aggregate={aggregate}"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=pathlib.Path, default=pathlib.Path.cwd())
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--seal", action="store_true")
    mode.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    repo = args.root.resolve()
    if args.seal:
        seal(repo)
    else:
        verify(repo)


if __name__ == "__main__":
    main()
