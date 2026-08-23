#!/usr/bin/env python3
"""Fail-closed readiness evaluator for the Scripture Archive R06 swarm.

This coordinator helper evaluates an already-refetched integration snapshot.
It never declares source truth, QA acceptance, Windows acceptance, or human NVDA
acceptance on its own. A new run must first regenerate/refetch the snapshot and
set legacy_reconciled only after an explicit ancestry/compare check.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

REQUIRED_TOP_LEVEL = {
    "schema_version",
    "observed_at",
    "repository",
    "main",
    "lanes",
    "content_materialization",
    "qa",
    "integration_state",
}


def _load(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("snapshot root must be an object")
    missing = sorted(REQUIRED_TOP_LEVEL - data.keys())
    if missing:
        raise ValueError(f"missing top-level fields: {', '.join(missing)}")
    if data.get("schema_version") != 1:
        raise ValueError("unsupported schema_version")
    return data


def evaluate(data: dict[str, Any]) -> dict[str, Any]:
    main = data["main"]
    lanes = data["lanes"]
    content = data["content_materialization"]
    qa = data["qa"]
    integration = data["integration_state"]

    if not isinstance(lanes, dict) or not lanes:
        raise ValueError("lanes must be a non-empty object")
    if not isinstance(content, dict) or not content:
        raise ValueError("content_materialization must be a non-empty object")

    unreconciled_lanes: list[str] = []
    nonterminal_lanes: list[str] = []
    for lane_name, lane in sorted(lanes.items()):
        if not isinstance(lane, dict):
            raise ValueError(f"lane {lane_name} must be an object")
        if not lane.get("legacy_reconciled", False):
            unreconciled_lanes.append(lane_name)
        if not lane.get("terminal", False):
            nonterminal_lanes.append(lane_name)

    incomplete_content: list[str] = []
    for name, item in sorted(content.items()):
        if not isinstance(item, dict):
            raise ValueError(f"content item {name} must be an object")
        if not item.get("complete", False):
            incomplete_content.append(name)

    historical = main.get("historical_r05_checkpoint")
    main_moved = bool(historical) and main.get("head") != historical

    qa_missing = not qa.get("swarm_checkpoint_present", False)
    qa_blockers_uncleared = not qa.get("release_blocking_defects_clear", False)
    qa_candidate_unaccepted = not qa.get("exact_integrated_candidate_accepted", False)

    drive_baseline = data.get("legacy_drive_audit_baseline", {})
    final_dev_output_missing = not drive_baseline.get("final_dev_output_r06_present", False)
    windows_unverified = not drive_baseline.get("real_windows_webview2_acceptance", False)
    nvda_unverified = not drive_baseline.get("human_nvda_acceptance", False)

    exact_candidate_ready = not (
        unreconciled_lanes or nonterminal_lanes or incomplete_content or main_moved
    )

    merge_authorized = bool(
        exact_candidate_ready
        and not qa_missing
        and not qa_blockers_uncleared
        and not qa_candidate_unaccepted
        and not final_dev_output_missing
        and not windows_unverified
        and not nvda_unverified
        and integration.get("merge_authorized", False)
        and main.get("merge_authorization", False)
    )

    blockers: list[str] = []
    if unreconciled_lanes:
        blockers.append("unreconciled_lanes=" + ",".join(unreconciled_lanes))
    if nonterminal_lanes:
        blockers.append("nonterminal_lanes=" + ",".join(nonterminal_lanes))
    if incomplete_content:
        blockers.append("incomplete_content=" + ",".join(incomplete_content))
    if main_moved:
        blockers.append("main_moved_from_historical_checkpoint")
    if qa_missing:
        blockers.append("qa_swarm_checkpoint_missing")
    if qa_blockers_uncleared:
        blockers.append("qa_release_blockers_not_cleared")
    if qa_candidate_unaccepted:
        blockers.append("qa_exact_candidate_not_accepted")
    if final_dev_output_missing:
        blockers.append("final_dev_output_r06_missing")
    if windows_unverified:
        blockers.append("real_windows_webview2_acceptance_missing")
    if nvda_unverified:
        blockers.append("human_nvda_acceptance_missing")
    if not integration.get("merge_authorized", False):
        blockers.append("coordinator_merge_flag_false")
    if not main.get("merge_authorization", False):
        blockers.append("main_merge_flag_false")

    return {
        "observed_at": data.get("observed_at"),
        "exact_candidate_ready": exact_candidate_ready,
        "merge_authorized": merge_authorized,
        "unreconciled_lanes": unreconciled_lanes,
        "nonterminal_lanes": nonterminal_lanes,
        "incomplete_content": incomplete_content,
        "blockers": blockers,
        "safe_next_action": integration.get("safe_next_action"),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("snapshot", type=Path)
    parser.add_argument("--compact", action="store_true")
    args = parser.parse_args()

    try:
        result = evaluate(_load(args.snapshot))
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False))
        return 2

    if args.compact:
        print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    else:
        print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))

    return 0 if result["merge_authorized"] else 1


if __name__ == "__main__":
    sys.exit(main())
