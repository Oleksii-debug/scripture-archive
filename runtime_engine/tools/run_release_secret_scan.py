from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from scripture_archive_runtime.release_security import scan_tree_report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="High-confidence fail-closed repository secret scan for R06 release/integration gates")
    parser.add_argument("root", type=Path, help="Repository/worktree root to scan")
    parser.add_argument("--output", type=Path, help="Optional JSON result path")
    args = parser.parse_args(argv)

    try:
        report = scan_tree_report(args.root)
    except (OSError, ValueError) as exc:
        result = {
            "schema": "R06_RELEASE_SECRET_SCAN_RESULT_v2",
            "passed": False,
            "finding_count": 1,
            "verified_file_count": 0,
            "clean_file_count": 0,
            "unverified_file_count": 1,
            "skipped_file_count": 0,
            "findings": [{"path": "<scan>", "rule": "SCAN_ERROR", "line": None}],
            "details": [type(exc).__name__],
        }
        code = 2
    else:
        result = {
            "schema": "R06_RELEASE_SECRET_SCAN_RESULT_v2",
            **report.as_dict(),
            "scope": {
                "text_policy": "Regular allowlisted UTF-8 text files are streamed with no fixed whole-file size bypass.",
                "nul_policy": "NUL in an in-scope text file is blocking SCAN_UNVERIFIED_NUL.",
                "symlink_policy": "Symlinked in-scope candidates are not followed and are blocking SCAN_UNVERIFIED_SYMLINK.",
                "binary_archive_policy": "Non-text regular files are out of scanner scope and counted as skipped; release package-content/fidelity verification must cover those bytes.",
                "excluded_generated_dirs": [".git", ".venv", "venv", "__pycache__", "build", "dist", ".pytest_cache", ".mypy_cache"],
            },
        }
        code = 0 if report.passed else 2

    text = json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    if args.output:
        args.output.write_text(text, encoding="utf-8")
    sys.stdout.write(text)
    return code


if __name__ == "__main__":
    raise SystemExit(main())
