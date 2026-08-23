from __future__ import annotations

import argparse
import json
from pathlib import Path

from scripture_archive_runtime.integration_intake import validate_final_input
from scripture_archive_runtime.player_flow_gate import PlayerFlowPolicy, run_player_flow_gate
from run_stage05_preintegration_gate import load_plan


def main() -> int:
    parser = argparse.ArgumentParser(
        description="R06 Stage05 exact-terminal runtime.v1 player-flow gate"
    )
    parser.add_argument(
        "--plan",
        required=True,
        help="The same exact terminal-input JSON plan used by the Stage05 preintegration gate",
    )
    parser.add_argument("--out", required=True, help="Output JSON report path")
    parser.add_argument(
        "--skip-first-hint",
        action="store_true",
        help="Do not exercise H1 before canonical submit; default is to exercise H1 when available",
    )
    args = parser.parse_args()

    specs, pre_policy = load_plan(args.plan)
    validated = [
        validate_final_input(spec.root, spec.manifest_path, spec.expectation)
        for spec in specs
    ]
    policy = PlayerFlowPolicy(
        required_lanes=pre_policy.required_lanes,
        expected_nodes=pre_policy.expected_nodes,
        exercise_first_hint=not args.skip_first_hint,
    )
    result = run_player_flow_gate(validated, policy=policy)

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
