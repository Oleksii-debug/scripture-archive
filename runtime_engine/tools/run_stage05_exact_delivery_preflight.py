from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from scripture_archive_runtime.integration_delivery_readiness import IntegrationReadinessError
from scripture_archive_runtime.integration_exact_input import (
    EXACT_DELIVERY_RESULT_SCHEMA,
    exact_readiness_from_payload,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Fail-closed R06 Stage05 delivery preflight with exact package Drive ID/SHA256 binding"
        )
    )
    parser.add_argument("input", type=Path, help="JSON exact readiness payload")
    parser.add_argument("--output", type=Path, help="Optional machine-readable result file")
    args = parser.parse_args(argv)

    try:
        payload = json.loads(args.input.read_text(encoding="utf-8"))
        result = exact_readiness_from_payload(payload)
    except (OSError, UnicodeError, json.JSONDecodeError, IntegrationReadinessError) as exc:
        result = {
            "schema": EXACT_DELIVERY_RESULT_SCHEMA,
            "ready_for_final_1196_gate": False,
            "blocker_count": 1,
            "blocker_codes": ["EXACT_PREFLIGHT_INPUT_ERROR"],
            "details": [str(exc)],
        }
        code = 2
    else:
        code = 0 if result["ready_for_final_1196_gate"] else 2

    text = json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    if args.output:
        args.output.write_text(text, encoding="utf-8")
    sys.stdout.write(text)
    return code


if __name__ == "__main__":
    raise SystemExit(main())
