from __future__ import annotations

import argparse
import json
from pathlib import Path

from scripture_archive_runtime.integration_intake import FinalInputExpectation
from scripture_archive_runtime.preintegration_gate import (
    PreintegrationInputSpec,
    PreintegrationPolicy,
    run_preintegration_gate,
)


def _resolved(base: Path, value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else (base / path).resolve()


def load_plan(path: str | Path) -> tuple[list[PreintegrationInputSpec], PreintegrationPolicy]:
    plan_path = Path(path).resolve()
    data = json.loads(plan_path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("plan must be a JSON object")

    rows = data.get("inputs")
    if not isinstance(rows, list) or not rows:
        raise ValueError("plan.inputs must be a non-empty list")

    specs: list[PreintegrationInputSpec] = []
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("each plan input must be an object")
        expectation = row.get("expectation")
        if not isinstance(expectation, dict):
            raise ValueError("each plan input requires expectation")
        specs.append(
            PreintegrationInputSpec(
                root=_resolved(plan_path.parent, str(row["root"])),
                manifest_path=_resolved(plan_path.parent, str(row["manifest_path"])),
                expectation=FinalInputExpectation(**expectation),
            )
        )

    policy_data = data.get("policy") or {}
    if not isinstance(policy_data, dict):
        raise ValueError("plan.policy must be an object")
    if "required_lanes" in policy_data:
        policy_data = dict(policy_data)
        policy_data["required_lanes"] = tuple(policy_data["required_lanes"])
    return specs, PreintegrationPolicy(**policy_data)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="R06 Stage05 exact terminal-input preintegration gate"
    )
    parser.add_argument(
        "--plan",
        required=True,
        help="JSON plan containing exact terminal manifests and expectations",
    )
    parser.add_argument("--out", required=True, help="Output JSON report path")
    args = parser.parse_args()

    specs, policy = load_plan(args.plan)
    result = run_preintegration_gate(specs, policy=policy)

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
