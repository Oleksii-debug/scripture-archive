#!/usr/bin/env python3
"""Exercise canonical MULTI_SELECT truth through the production legacy adapter.

This gate scans the real canonical mission corpus.  It permits only the narrow,
explicit historical representation already supported by the packaged runtime:
semicolon-delimited ``citation selection`` truth.  The production normalizer is
then followed by the strict canonical ANSWER_DTO projection, so ambiguous or
presentation-derived truth still fails closed.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from runtime_engine.scripture_archive_runtime.answer_contracts import canonical_task_type
from runtime_engine.scripture_archive_runtime.package_adapters import normalize_legacy_multiselect_truth
from runtime_engine.scripture_archive_runtime.provenance import canonical_answer_dto


def _task_type(node: dict) -> str:
    raw = node.get("task_type") or node.get("response_mode") or node.get("task_family") or "SHORT_TEXT"
    return canonical_task_type(str(raw))


def main(root: str) -> int:
    base = Path(root)
    errors: list[str] = []
    checked = 0
    multi_select = 0
    legacy_normalized = 0

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
                try:
                    normalized = normalize_legacy_multiselect_truth(node)
                    answer = normalized.get("accepted_answer")
                    if answer is not node.get("accepted_answer"):
                        legacy_normalized += 1
                    if not isinstance(answer, list) or not answer or any(
                        not isinstance(value, str) or not value.strip() for value in answer
                    ):
                        raise ValueError("normalized accepted_answer is not a non-empty string array")
                    dto = canonical_answer_dto(normalized)
                    if dto.get("type") != "MULTI_SELECT" or dto.get("choices") != answer:
                        raise ValueError("strict canonical ANSWER_DTO does not preserve the normalized choice set")
                except Exception as exc:
                    errors.append(f"{node_path}:{node_id}: {exc}")

    print(
        "CANONICAL_ANSWER_SHAPES "
        f"checked={checked} multi_select={multi_select} "
        f"legacy_normalized={legacy_normalized} errors={len(errors)}"
    )
    for error in errors:
        print("ERROR", error)
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1] if len(sys.argv) > 1 else "docs/campaigns"))
