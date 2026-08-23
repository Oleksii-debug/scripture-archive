from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from scripture_archive_runtime.release_security import scan_tree


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="High-confidence fail-closed repository secret scan for R06 release/integration gates")
    parser.add_argument("root", type=Path, help="Repository/worktree root to scan")
    parser.add_argument("--output", type=Path, help="Optional JSON result path")
    args = parser.parse_args(argv)

    try:
        findings = scan_tree(args.root)
    except (OSError, ValueError) as exc:
        result = {
            "schema": "R06_RELEASE_SECRET_SCAN_RESULT_v1",
            "passed": False,
            "finding_count": 1,
            "findings": [{"path": "<scan>", "rule": "SCAN_ERROR", "line": None}],
            "details": [str(exc)],
        }
        code = 2
    else:
        result = {
            "schema": "R06_RELEASE_SECRET_SCAN_RESULT_v1",
            "passed": not findings,
            "finding_count": len(findings),
            "findings": [finding.as_dict() for finding in findings],
        }
        code = 0 if not findings else 2

    text = json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    if args.output:
        args.output.write_text(text, encoding="utf-8")
    sys.stdout.write(text)
    return code


if __name__ == "__main__":
    raise SystemExit(main())
