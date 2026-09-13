#!/usr/bin/env python3
"""Fail closed when canonical task type and accepted-answer shape disagree.

This gate intentionally validates source-of-truth node bytes before the packaged
runtime adapts them. It does not infer answers from presentation payloads or
rewrite canonical truth.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from runtime_engine.scripture_archive_runtime.answer_contracts import canonical_task_type


def _task_type(node: dict) -> str:
    raw = node.get("task_type") or node.get("response_mode") or node.get("task_family") or "SHORT_TEXT"
    return canonical_task_type(str(raw))


def main(root: str) -> int:
    base = Path(root)
    errors: list[str] = []
    checked = 0
    multi_select = 0

    for index_path in sorted(base.rglob("MISSION_INDEX.json")):
        index = json.loads(index_path.read_text(encoding="utf-8"))
        for rel in index.get("node_files", []):
            node_path = (index_path.parent / rel).resolve()
            if index_path.parent.resolve() not in node_path.parents:
                errors.append(f"{index_path}: node shard path escape: {rel}")
                continue
            doc = json.loads(node_path.read_text(encoding="utf-8"))
            for node in doc.get("nodes", []):
                checked += 1
                node_id = str(node.get("node_id") or "<missing>")
                try:
                    task_type = _task_type(node)
                except Exception as exc:
                    errors.append(f"{node_path}:{node_id}: task type canonicalization failed: {exc}")
                    continue
                if task_type != "MULTI_SELECT":
                    continue
                multi_select += 1
                answer = node.get("accepted_answer")
                if not isinstance(answer, list) or not answer or any(not isinstance(v, str) or not v.strip() for v in answer):
                    errors.append(
                        f"{node_path}:{node_id}: MULTI_SELECT accepted_answer must be a non-empty array of non-empty strings"
                    )

    print(f"CANONICAL_ANSWER_SHAPES checked={checked} multi_select={multi_select} errors={len(errors)}")
    for error in errors:
        print("ERROR", error)
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1] if len(sys.argv) > 1 else "docs/campaigns"))
