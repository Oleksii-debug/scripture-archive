from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from scripture_archive_runtime.integration_quality_gate import (
    IntegrationQualityGateError,
    QUALITY_GATE_RESULT_SCHEMA,
    evaluate_quality_blockers,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Fail-closed R06 isolated-candidate gate for explicitly integration-blocking QA issues"
    )
    parser.add_argument("input", type=Path, help="Fresh coordinator/QA issue-state snapshot JSON")
    parser.add_argument("--output", type=Path, help="Optional machine-readable result file")
    args = parser.parse_args(argv)

    try:
        payload = json.loads(args.input.read_text(encoding="utf-8"))
        result = evaluate_quality_blockers(payload)
    except (OSError, UnicodeError, json.JSONDecodeError, IntegrationQualityGateError) as exc:
        result = {
            "schema": QUALITY_GATE_RESULT_SCHEMA,
            "ready_for_isolated_candidate": False,
            "open_blocker_count": 1,
            "open_blockers": [{"issue_number": None, "state": "unknown", "title": "QUALITY_GATE_INPUT_ERROR", "owner_lane": "DEV10", "blocks_integration": True}],
            "details": [str(exc)],
        }
        code = 2
    else:
        code = 0 if result["ready_for_isolated_candidate"] else 2

    text = json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    if args.output:
        args.output.write_text(text, encoding="utf-8")
    sys.stdout.write(text)
    return code


if __name__ == "__main__":
    raise SystemExit(main())
