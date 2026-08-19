#!/usr/bin/env python3
"""Verify local package copies against expected Git blob SHA-1 values.

Pre-production QA only. This is not product/runtime code.
Expected manifest format: JSON object mapping repository-relative path to Git blob SHA-1.
"""
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path


def git_blob_sha(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("root", help="Root directory containing repository-relative package copies")
    ap.add_argument("manifest", help="JSON mapping repo-relative path -> expected Git blob SHA-1")
    ns = ap.parse_args()
    root = Path(ns.root)
    expected = json.loads(Path(ns.manifest).read_text(encoding="utf-8"))
    errors = []
    for rel, want in expected.items():
        p = root / rel
        if not p.is_file():
            errors.append(f"MISSING {rel}")
            continue
        got = git_blob_sha(p.read_bytes())
        if got != want:
            errors.append(f"MISMATCH {rel}: expected={want} got={got}")
        else:
            print(f"PASS {rel} {got}")
    print(f"RESULT {'PASS' if not errors else 'FAIL'} files={len(expected)} errors={len(errors)}")
    for e in errors:
        print("ERROR", e)
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
