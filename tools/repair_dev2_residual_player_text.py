#!/usr/bin/env python3
"""Deterministically repair residual mixed-script D2 player-facing text.

This tool is intentionally narrow. It may change only the player-facing mutable
surface already authorized by the earlier D2 correction lineages. Canonical
truth, grading, evidence, provenance, confidence/TX1, response contracts and
branching are fail-closed immutable.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any, Iterable

NODE_COUNT = 386
PARTS = tuple(f"nodes/part_{i:03d}.jsonl" for i in range(1, 27))
INDEX_NAME = "D2_CORRECTED_NODE_HASH_INDEX.json"
MANIFEST_NAME = "D2_FULL_CORRECTED_AGGREGATION_MANIFEST.json"
REPORT_REL = "correction_provenance/RESIDUAL_PLAYER_TEXT_20260929_REPORT.json"
BASELINE_AUTHORITY_SHA = "6ed0a9e8f390dea7c12c05fb9e991ed6328d1458"
BASELINE_AGGREGATE = "ef77ae5d822e105050dedfa9a460325259fe079701ca69f385693aabcad0e661"

MUTABLE_TOP = {
    "player_prompt",
    "success_feedback",
    "partial_feedback",
    "failure_feedback",
    "rejection_reason",
    "functional_nonvisual_equivalent",
}
MUTABLE_MAPPING = {"hints"}
MUTABLE_LIST = {"rejected_answers"}

# Longer/contextual templates come first. Fallback token replacements at the end
# ensure every observed hybrid-script token is eliminated without touching truth.
REPLACEMENTS = (
    ("match твердженняs to local джерелоs", "зіставити твердження з локальними джерелами"),
    ("Порівняйте свідків по локальних твердженняs", "Порівняйте свідчення за локальними твердженнями"),
    ("cross-уривок доказ set", "міжуривковий набір доказів"),
    ("джерело-map structure", "структура карти джерел"),
    ("твердження-source swaps", "переплутані пари твердження–джерело"),
    ("джерело_твердження_matching", "зіставлення_джерело_твердження"),
    ("parallel_свідчення_compare", "паралельне_порівняння_свідчень"),
    ("запис доказуs", "записами доказів"),
    ("Порівняння джерело-safe:", "Джерельно безпечне порівняння:"),
    ("omission не перетворено на denial", "пропуск не перетворено на заперечення"),
    (
        "Do not force a single verbatim transcript across all three свідченняs.",
        "Не зводьте всі три свідчення до одного дослівного транскрипту.",
    ),
    (
        "зберігайте свідчення-конкретний джерельна атрибуція",
        "зберігайте джерельну атрибуцію конкретного свідчення",
    ),
    ("Кожен свідчення лишається", "Кожне свідчення лишається"),
    ("Corinthian адресатаs", "Corinthian recipients"),
    # Fail-safe cleanup for every hybrid token observed in the 2026-09-29 scan.
    ("твердженняs", "твердження"),
    ("джерелоs", "джерела"),
    ("свідченняs", "свідчення"),
    ("адресатаs", "recipients"),
    ("доказуs", "доказів"),
    ("джерело-safe", "джерельно-безпечне"),
    ("cross-уривок", "міжуривковий"),
    ("джерело-map", "карта джерел"),
    ("parallel_свідчення_compare", "паралельне_порівняння_свідчень"),
    ("джерело_твердження_matching", "зіставлення_джерело_твердження"),
)

HYBRID_TOKEN_RE = re.compile(r"[A-Za-zА-Яа-яІіЇїЄєҐґ_/-]+")


class RepairError(ValueError):
    pass


def canonical_bytes(value: Any) -> bytes:
    return json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def protected_projection(record: dict[str, Any]) -> dict[str, Any]:
    return {
        key: copy.deepcopy(value)
        for key, value in record.items()
        if key not in MUTABLE_TOP
        and key not in MUTABLE_MAPPING
        and key not in MUTABLE_LIST
    }


def mutable_strings(record: dict[str, Any]) -> Iterable[tuple[str, str]]:
    for field in sorted(MUTABLE_TOP):
        value = record.get(field)
        if value is not None:
            if not isinstance(value, str):
                raise RepairError(f"{record.get('node_id')}: {field} must be string")
            yield field, value
    for field in sorted(MUTABLE_MAPPING):
        value = record.get(field)
        if not isinstance(value, dict) or not all(
            isinstance(k, str) and isinstance(v, str) for k, v in value.items()
        ):
            raise RepairError(f"{record.get('node_id')}: {field} must be string mapping")
        for key in sorted(value):
            yield f"{field}.{key}", value[key]
    for field in sorted(MUTABLE_LIST):
        value = record.get(field)
        if not isinstance(value, list) or not all(isinstance(v, str) for v in value):
            raise RepairError(f"{record.get('node_id')}: {field} must be string list")
        for idx, item in enumerate(value):
            yield f"{field}[{idx}]", item


def hybrid_tokens(text: str) -> list[str]:
    return sorted(
        {
            token
            for token in HYBRID_TOKEN_RE.findall(text)
            if re.search(r"[A-Za-z]", token)
            and re.search(r"[А-Яа-яІіЇїЄєҐґ]", token)
        }
    )


def scan_record(record: dict[str, Any]) -> list[tuple[str, str]]:
    findings: list[tuple[str, str]] = []
    for path, text in mutable_strings(record):
        for token in hybrid_tokens(text):
            findings.append((path, token))
    return findings


def replace_text(text: str, counts: Counter[str]) -> str:
    result = text
    for old, new in REPLACEMENTS:
        occurrences = result.count(old)
        if occurrences:
            counts[old] += occurrences
            result = result.replace(old, new)
    return result


def repair_record(record: dict[str, Any], counts: Counter[str]) -> tuple[dict[str, Any], list[str]]:
    candidate = copy.deepcopy(record)
    changed: list[str] = []

    for field in sorted(MUTABLE_TOP):
        if field in candidate:
            old = candidate[field]
            if not isinstance(old, str):
                raise RepairError(f"{record.get('node_id')}: {field} must be string")
            new = replace_text(old, counts)
            if new != old:
                candidate[field] = new
                changed.append(field)

    for field in sorted(MUTABLE_MAPPING):
        value = candidate.get(field)
        if not isinstance(value, dict) or not all(isinstance(v, str) for v in value.values()):
            raise RepairError(f"{record.get('node_id')}: {field} must be string mapping")
        for key in sorted(value):
            new = replace_text(value[key], counts)
            if new != value[key]:
                value[key] = new
                changed.append(f"{field}.{key}")

    for field in sorted(MUTABLE_LIST):
        value = candidate.get(field)
        if not isinstance(value, list) or not all(isinstance(v, str) for v in value):
            raise RepairError(f"{record.get('node_id')}: {field} must be string list")
        for idx, old in enumerate(list(value)):
            new = replace_text(old, counts)
            if new != old:
                value[idx] = new
                changed.append(f"{field}[{idx}]")

    if protected_projection(record) != protected_projection(candidate):
        raise RepairError(f"{record.get('node_id')}: protected projection changed")

    return candidate, changed


def load_part(path: Path) -> list[dict[str, Any]]:
    if path.is_symlink() or not path.is_file():
        raise RepairError(f"missing or unsafe node part: {path}")
    result = []
    for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            value = json.loads(line)
        except json.JSONDecodeError as exc:
            raise RepairError(f"invalid JSONL {path}:{line_no}") from exc
        if not isinstance(value, dict):
            raise RepairError(f"non-object node {path}:{line_no}")
        result.append(value)
    return result


def aggregate(records: dict[str, str]) -> str:
    payload = "".join(
        f"{node_id}\t{records[node_id]}\n" for node_id in sorted(records)
    ).encode("utf-8")
    return sha256_bytes(payload)


def authority_state(root: Path) -> tuple[list[dict[str, Any]], dict[str, Any], dict[str, Any]]:
    nodes: list[dict[str, Any]] = []
    for rel in PARTS:
        nodes.extend(load_part(root / rel))
    if len(nodes) != NODE_COUNT:
        raise RepairError(f"expected {NODE_COUNT} nodes, got {len(nodes)}")
    ids = [str(n.get("node_id") or "") for n in nodes]
    if any(not node_id for node_id in ids) or len(set(ids)) != NODE_COUNT:
        raise RepairError("node IDs are missing or duplicated")
    index = json.loads((root / INDEX_NAME).read_text(encoding="utf-8"))
    manifest = json.loads((root / MANIFEST_NAME).read_text(encoding="utf-8"))
    if index.get("record_count") != NODE_COUNT:
        raise RepairError("corrected index record_count changed")
    if index.get("source_truth_changed") is not False:
        raise RepairError("corrected index claims source-truth change")
    if manifest.get("source_truth_changed") is not False:
        raise RepairError("manifest claims source-truth change")
    return nodes, index, manifest


def check_authority(root: Path, *, require_report: bool) -> dict[str, Any]:
    nodes, index, manifest = authority_state(root)
    by_id = {n["node_id"]: n for n in nodes}
    findings = [
        {"node_id": n["node_id"], "path": path, "token": token}
        for n in nodes
        for path, token in scan_record(n)
    ]
    if findings:
        raise RepairError(f"residual hybrid player tokens: {findings[:12]}")

    actual_hashes = {node_id: sha256_bytes(canonical_bytes(node)) for node_id, node in by_id.items()}
    indexed = {
        row.get("id"): row
        for row in index.get("records", [])
        if isinstance(row, dict) and isinstance(row.get("id"), str)
    }
    if set(indexed) != set(actual_hashes):
        raise RepairError("index/node ID set mismatch")
    for node_id, digest in actual_hashes.items():
        if indexed[node_id].get("sha256") != digest:
            raise RepairError(f"index SHA mismatch: {node_id}")
    actual_aggregate = aggregate(actual_hashes)
    if index.get("aggregate_sha256") != actual_aggregate:
        raise RepairError("index aggregate mismatch")
    if manifest.get("corrected_node_aggregate_sha256") != actual_aggregate:
        raise RepairError("manifest aggregate mismatch")
    if require_report:
        report_path = root / REPORT_REL
        if not report_path.is_file():
            raise RepairError("residual repair report missing")
        report = json.loads(report_path.read_text(encoding="utf-8"))
        if report.get("source_truth_changed") is not False:
            raise RepairError("repair report source_truth_changed must be false")
        if report.get("corrected_node_aggregate_sha256") != actual_aggregate:
            raise RepairError("repair report aggregate mismatch")
        if report.get("independent_source_theological_audit") != "PENDING":
            raise RepairError("repair must not promote independent source audit")
    return {
        "node_count": len(nodes),
        "aggregate_sha256": actual_aggregate,
        "hybrid_player_tokens": 0,
    }


def materialize(root: Path) -> dict[str, Any]:
    nodes, index, manifest = authority_state(root)
    report_path = root / REPORT_REL

    before_findings = sum(len(scan_record(n)) for n in nodes)
    counts: Counter[str] = Counter()
    changed_rows = []
    repaired_by_id: dict[str, dict[str, Any]] = {}
    part_nodes: dict[str, list[dict[str, Any]]] = {}

    cursor = 0
    for rel in PARTS:
        original_part = load_part(root / rel)
        repaired_part = []
        part_changed = False
        for original in original_part:
            baseline_sha = sha256_bytes(canonical_bytes(original))
            candidate, paths = repair_record(original, counts)
            after = scan_record(candidate)
            if after:
                raise RepairError(
                    f"{original.get('node_id')}: hybrid tokens remain after repair: {after}"
                )
            corrected_sha = sha256_bytes(canonical_bytes(candidate))
            repaired_part.append(candidate)
            repaired_by_id[candidate["node_id"]] = candidate
            if paths:
                part_changed = True
                changed_rows.append(
                    {
                        "node_id": original["node_id"],
                        "source_part": rel,
                        "changed_player_paths": paths,
                        "baseline_record_sha256": baseline_sha,
                        "corrected_record_sha256": corrected_sha,
                        "protected_projection_sha256": sha256_bytes(
                            canonical_bytes(protected_projection(original))
                        ),
                    }
                )
        if part_changed:
            part_nodes[rel] = repaired_part
        cursor += len(original_part)

    if not changed_rows:
        if not report_path.is_file():
            raise RepairError("no repair changes found but report is absent")
        return {"changed_nodes": 0, "already_materialized": True, **check_authority(root, require_report=True)}

    if before_findings <= 0:
        raise RepairError("expected residual hybrid player tokens before first materialization")

    for rel, records in part_nodes.items():
        (root / rel).write_text(
            "\n".join(canonical_bytes(record).decode("utf-8") for record in records) + "\n",
            encoding="utf-8",
        )

    corrected_hashes = {
        node_id: sha256_bytes(canonical_bytes(node))
        for node_id, node in repaired_by_id.items()
    }
    if len(corrected_hashes) != NODE_COUNT:
        raise RepairError("repaired corpus cardinality changed")
    corrected_aggregate = aggregate(corrected_hashes)

    new_index = copy.deepcopy(index)
    for row in new_index.get("records", []):
        node_id = row.get("id")
        if node_id not in corrected_hashes:
            raise RepairError(f"index contains unknown node: {node_id}")
        row["sha256"] = corrected_hashes[node_id]
    new_index["aggregate_sha256"] = corrected_aggregate
    new_index["status"] = (
        "DEVELOPER_CORRECTED_AGGREGATED / RESIDUAL_PLAYER_TEXT_REPAIRED / "
        "INDEPENDENT_AUDIT_PENDING"
    )
    new_index["source_truth_changed"] = False

    new_manifest = copy.deepcopy(manifest)
    new_manifest["status"] = (
        "DEVELOPER_AGGREGATED / RESIDUAL_PLAYER_TEXT_REPAIRED / "
        "HOSTED_QUALIFICATION_PENDING / INDEPENDENT_AUDIT_PENDING"
    )
    new_manifest["corrected_node_aggregate_sha256"] = corrected_aggregate
    new_manifest["source_truth_changed"] = False
    new_manifest["residual_player_text_repair"] = {
        "report": REPORT_REL,
        "baseline_authority_sha": BASELINE_AUTHORITY_SHA,
        "baseline_aggregate_sha256": BASELINE_AGGREGATE,
        "independent_source_theological_audit": "PENDING",
    }

    report = {
        "schema": "R06_D2_RESIDUAL_PLAYER_TEXT_REPAIR_v1",
        "status": "PASS / HOSTED_QUALIFICATION_PENDING / INDEPENDENT_AUDIT_PENDING",
        "baseline_authority_sha": BASELINE_AUTHORITY_SHA,
        "baseline_node_aggregate_sha256": BASELINE_AGGREGATE,
        "corrected_node_aggregate_sha256": corrected_aggregate,
        "node_count": NODE_COUNT,
        "changed_node_count": len(changed_rows),
        "hybrid_player_tokens_before": before_findings,
        "hybrid_player_tokens_after": 0,
        "artifact_replacements": [
            {"from": old, "to": new, "occurrences": counts.get(old, 0)}
            for old, new in REPLACEMENTS
            if counts.get(old, 0)
        ],
        "mutable_surface": {
            "top_level_text": sorted(MUTABLE_TOP),
            "mapping_text": sorted(MUTABLE_MAPPING),
            "list_text": sorted(MUTABLE_LIST),
            "all_other_fields": "IMMUTABLE_FAIL_CLOSED",
        },
        "changes": sorted(changed_rows, key=lambda row: row["node_id"]),
        "source_truth_changed": False,
        "independent_source_theological_audit": "PENDING",
    }

    (root / INDEX_NAME).write_text(
        json.dumps(new_index, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )
    (root / MANIFEST_NAME).write_text(
        json.dumps(new_manifest, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(
        json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )

    checked = check_authority(root, require_report=True)
    return {
        "changed_nodes": len(changed_rows),
        "hybrid_player_tokens_before": before_findings,
        "replacement_occurrences": sum(counts.values()),
        **checked,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--root",
        type=Path,
        default=Path("docs/campaigns/PA/R06_DEV2_MATERIALIZATION_05"),
    )
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    try:
        if args.write:
            result = materialize(args.root)
        else:
            result = check_authority(args.root, require_report=args.check)
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, RepairError) as exc:
        print(json.dumps({"status": "FAIL", "error": str(exc)}, ensure_ascii=False))
        return 1
    print(json.dumps({"status": "PASS", **result}, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
