#!/usr/bin/env python3
"""Fail-closed preflight for corrected D2 Paul/Acts node aggregation.

The Wave-2 D2 correction lanes may repair bounded player-facing language, but they
must not silently mutate source/grading/provenance truth. This tool compares one
or more corrected node shards against an immutable baseline and rejects every
change outside the deliberately narrow player-text surface.

It also verifies optional baseline/evidence hash indexes and exact immutable file
pairs so aggregation cannot relabel stale or modified source metadata as the
canonical input.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

SCHEMA = "R06_D2_CORRECTED_AGGREGATION_PREFLIGHT_v1"

# W2-19..23 are authorized for player-facing language quality only. Keep this
# list intentionally narrow. Any future expansion must be an explicit reviewed
# contract change, not an implicit "all strings are mutable" rule.
MUTABLE_TOP_LEVEL_TEXT_FIELDS = frozenset(
    {
        "player_prompt",
        "success_feedback",
        "partial_feedback",
        "failure_feedback",
        "rejection_reason",
        "functional_nonvisual_equivalent",
    }
)
MUTABLE_MAPPING_TEXT_FIELDS = frozenset({"hints"})
MUTABLE_LIST_TEXT_FIELDS = frozenset({"rejected_answers"})
# rejected_answers is answer-adjacent private metadata. Current runtime grading does
# not consume it, but index 0 is a stable semantic error-class anchor in the D2
# authority and must not be rewritten by localization/copy repair. Only subsequent
# explanatory negative-example slots may change, with list length held constant.
IMMUTABLE_LIST_TEXT_INDICES = {"rejected_answers": frozenset({0})}


class PreflightError(ValueError):
    """Raised when corrected shards violate the D2 aggregation contract."""


@dataclass(frozen=True)
class LoadedRecord:
    node_id: str
    value: Mapping[str, Any]
    source: str
    canonical_sha256: str


def _canonical_bytes(value: Any) -> bytes:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _iter_jsonl_files(inputs: Sequence[Path]) -> Iterable[Path]:
    seen: set[Path] = set()
    for raw in inputs:
        path = raw.resolve()
        if not path.exists():
            raise PreflightError(f"input path does not exist: {raw}")
        candidates = [path] if path.is_file() else sorted(path.rglob("*.jsonl"))
        for candidate in candidates:
            if candidate.suffix.casefold() != ".jsonl":
                raise PreflightError(f"expected .jsonl input, got: {candidate}")
            resolved = candidate.resolve()
            if resolved not in seen:
                seen.add(resolved)
                yield resolved


def load_nodes(inputs: Sequence[Path], *, label: str) -> dict[str, LoadedRecord]:
    records: dict[str, LoadedRecord] = {}
    file_count = 0
    for path in _iter_jsonl_files(inputs):
        file_count += 1
        text = path.read_text(encoding="utf-8")
        for line_number, line in enumerate(text.splitlines(), start=1):
            if not line.strip():
                continue
            try:
                value = json.loads(line)
            except json.JSONDecodeError as exc:
                raise PreflightError(
                    f"{label}: invalid JSON at {path}:{line_number}: {exc.msg}"
                ) from exc
            if not isinstance(value, dict):
                raise PreflightError(
                    f"{label}: record at {path}:{line_number} must be a JSON object"
                )
            node_id = value.get("node_id")
            if not isinstance(node_id, str) or not node_id.strip() or node_id != node_id.strip():
                raise PreflightError(
                    f"{label}: record at {path}:{line_number} has invalid node_id"
                )
            if node_id in records:
                previous = records[node_id].source
                raise PreflightError(
                    f"{label}: duplicate node_id {node_id}: {previous} and {path}:{line_number}"
                )
            records[node_id] = LoadedRecord(
                node_id=node_id,
                value=value,
                source=f"{path}:{line_number}",
                canonical_sha256=_sha256_bytes(_canonical_bytes(value)),
            )
    if file_count == 0:
        raise PreflightError(f"{label}: no .jsonl files found")
    if not records:
        raise PreflightError(f"{label}: no node records found")
    return records


def _load_hash_index(path: Path, *, id_label: str) -> tuple[dict[str, str], str | None]:
    try:
        root = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise PreflightError(f"cannot load hash index {path}: {exc}") from exc
    if not isinstance(root, dict) or not isinstance(root.get("records"), list):
        raise PreflightError(f"hash index {path} must contain a records array")
    hashes: dict[str, str] = {}
    for index, item in enumerate(root["records"]):
        if not isinstance(item, dict):
            raise PreflightError(f"hash index {path} records[{index}] must be an object")
        record_id = item.get("id")
        digest = item.get("sha256")
        if not isinstance(record_id, str) or not record_id:
            raise PreflightError(f"hash index {path} records[{index}].id is invalid")
        if record_id in hashes:
            raise PreflightError(f"hash index {path} duplicates {id_label} {record_id}")
        if not isinstance(digest, str) or len(digest) != 64:
            raise PreflightError(f"hash index {path} has invalid sha256 for {record_id}")
        try:
            int(digest, 16)
        except ValueError as exc:
            raise PreflightError(f"hash index {path} has non-hex sha256 for {record_id}") from exc
        hashes[record_id] = digest.casefold()
    declared_count = root.get("record_count")
    if declared_count is not None and declared_count != len(hashes):
        raise PreflightError(
            f"hash index {path} record_count={declared_count} but contains {len(hashes)} records"
        )
    aggregate = root.get("aggregate_sha256")
    if aggregate is not None and (not isinstance(aggregate, str) or len(aggregate) != 64):
        raise PreflightError(f"hash index {path} has invalid aggregate_sha256")
    return hashes, aggregate.casefold() if isinstance(aggregate, str) else None


def verify_baseline_index(
    baseline: Mapping[str, LoadedRecord],
    index_path: Path,
    *,
    require_complete: bool,
) -> dict[str, Any]:
    expected, expected_aggregate = _load_hash_index(index_path, id_label="node_id")
    extra = sorted(set(baseline) - set(expected))
    if extra:
        raise PreflightError(f"baseline has node IDs absent from hash index: {extra[:10]}")
    mismatches = [
        node_id
        for node_id, record in baseline.items()
        if expected[node_id] != record.canonical_sha256
    ]
    if mismatches:
        raise PreflightError(
            f"baseline canonical SHA256 mismatch for {len(mismatches)} node(s): {mismatches[:10]}"
        )
    missing = sorted(set(expected) - set(baseline))
    if require_complete and missing:
        raise PreflightError(
            f"complete baseline required but {len(missing)} indexed node(s) are missing: {missing[:10]}"
        )

    aggregate = _sha256_bytes(
        "".join(
            f"{node_id}\t{baseline[node_id].canonical_sha256}\n"
            for node_id in sorted(baseline)
        ).encode("utf-8")
    )
    if require_complete and expected_aggregate and aggregate != expected_aggregate:
        raise PreflightError(
            "baseline aggregate SHA256 does not match immutable node hash index"
        )
    return {
        "indexed_nodes": len(expected),
        "baseline_nodes_verified": len(baseline),
        "baseline_nodes_not_materialized": len(missing),
        "aggregate_sha256": aggregate,
        "expected_aggregate_sha256": expected_aggregate,
        "aggregate_verified": bool(require_complete and expected_aggregate),
    }


def load_evidence_ids(index_path: Path) -> dict[str, Any]:
    expected, aggregate = _load_hash_index(index_path, id_label="evidence_id")
    return {
        "ids": frozenset(expected),
        "count": len(expected),
        "aggregate_sha256": aggregate,
    }


def _validate_mutable_shape(baseline: Mapping[str, Any], candidate: Mapping[str, Any], node_id: str) -> None:
    for field in sorted(MUTABLE_TOP_LEVEL_TEXT_FIELDS):
        baseline_has = field in baseline
        candidate_has = field in candidate
        if baseline_has != candidate_has:
            raise PreflightError(f"{node_id}: mutable field presence changed at {field}")
        if baseline_has and (
            not isinstance(baseline[field], str) or not isinstance(candidate[field], str)
        ):
            raise PreflightError(f"{node_id}: mutable field {field} must remain a string")

    for field in sorted(MUTABLE_MAPPING_TEXT_FIELDS):
        baseline_value = baseline.get(field)
        candidate_value = candidate.get(field)
        if not isinstance(baseline_value, dict) or not isinstance(candidate_value, dict):
            raise PreflightError(f"{node_id}: {field} must remain an object of text values")
        if set(baseline_value) != set(candidate_value):
            raise PreflightError(f"{node_id}: {field} key set changed")
        if not all(isinstance(value, str) for value in baseline_value.values()) or not all(
            isinstance(value, str) for value in candidate_value.values()
        ):
            raise PreflightError(f"{node_id}: {field} values must remain strings")

    for field in sorted(MUTABLE_LIST_TEXT_FIELDS):
        baseline_value = baseline.get(field)
        candidate_value = candidate.get(field)
        if not isinstance(baseline_value, list) or not isinstance(candidate_value, list):
            raise PreflightError(f"{node_id}: {field} must remain a list of strings")
        if len(baseline_value) != len(candidate_value):
            raise PreflightError(f"{node_id}: {field} length changed")
        if not all(isinstance(value, str) for value in baseline_value) or not all(
            isinstance(value, str) for value in candidate_value
        ):
            raise PreflightError(f"{node_id}: {field} values must remain strings")
        for index in IMMUTABLE_LIST_TEXT_INDICES.get(field, ()):
            if index >= len(baseline_value) or baseline_value[index] != candidate_value[index]:
                raise PreflightError(
                    f"{node_id}: protected semantic list element changed at {field}[{index}]"
                )


def protected_projection(record: Mapping[str, Any]) -> dict[str, Any]:
    """Return every record field except the explicitly mutable player-text surface."""
    return {
        key: value
        for key, value in record.items()
        if key not in MUTABLE_TOP_LEVEL_TEXT_FIELDS
        and key not in MUTABLE_MAPPING_TEXT_FIELDS
        and key not in MUTABLE_LIST_TEXT_FIELDS
    }


def _changed_player_paths(baseline: Mapping[str, Any], candidate: Mapping[str, Any]) -> list[str]:
    changed: list[str] = []
    for field in sorted(MUTABLE_TOP_LEVEL_TEXT_FIELDS):
        if baseline.get(field) != candidate.get(field):
            changed.append(field)
    for field in sorted(MUTABLE_MAPPING_TEXT_FIELDS):
        left = baseline[field]
        right = candidate[field]
        for key in sorted(left):
            if left[key] != right[key]:
                changed.append(f"{field}.{key}")
    for field in sorted(MUTABLE_LIST_TEXT_FIELDS):
        left = baseline[field]
        right = candidate[field]
        for index, (old, new) in enumerate(zip(left, right)):
            if old != new:
                changed.append(f"{field}[{index}]")
    return changed


def compare_candidate(
    baseline: Mapping[str, LoadedRecord],
    candidate: Mapping[str, LoadedRecord],
    *,
    evidence_ids: frozenset[str] | None,
    require_complete: bool,
) -> dict[str, Any]:
    unknown = sorted(set(candidate) - set(baseline))
    if unknown:
        raise PreflightError(f"candidate contains unknown node IDs: {unknown[:10]}")
    missing = sorted(set(baseline) - set(candidate))
    if require_complete and missing:
        raise PreflightError(
            f"complete candidate required but {len(missing)} baseline node(s) are missing: {missing[:10]}"
        )

    changed_nodes: list[dict[str, Any]] = []
    unchanged = 0
    for node_id in sorted(candidate):
        left = baseline[node_id].value
        right = candidate[node_id].value
        _validate_mutable_shape(left, right, node_id)

        left_protected = protected_projection(left)
        right_protected = protected_projection(right)
        if left_protected != right_protected:
            protected_left_sha = _sha256_bytes(_canonical_bytes(left_protected))
            protected_right_sha = _sha256_bytes(_canonical_bytes(right_protected))
            raise PreflightError(
                f"{node_id}: protected semantic/source/grading projection changed "
                f"({protected_left_sha} != {protected_right_sha})"
            )

        if evidence_ids is not None:
            required = right.get("required_evidence")
            if not isinstance(required, list) or not all(isinstance(item, str) for item in required):
                raise PreflightError(f"{node_id}: required_evidence must remain a list of IDs")
            missing_evidence = sorted(set(required) - evidence_ids)
            if missing_evidence:
                raise PreflightError(
                    f"{node_id}: required_evidence references IDs absent from immutable evidence index: "
                    f"{missing_evidence}"
                )

        paths = _changed_player_paths(left, right)
        if paths:
            changed_nodes.append(
                {
                    "node_id": node_id,
                    "changed_player_paths": paths,
                    "baseline_record_sha256": baseline[node_id].canonical_sha256,
                    "corrected_record_sha256": candidate[node_id].canonical_sha256,
                    "protected_projection_sha256": _sha256_bytes(_canonical_bytes(left_protected)),
                }
            )
        else:
            unchanged += 1

    return {
        "candidate_nodes": len(candidate),
        "baseline_nodes_not_in_candidate": len(missing),
        "changed_nodes": len(changed_nodes),
        "unchanged_nodes": unchanged,
        "changes": changed_nodes,
    }


def verify_immutable_pairs(pairs: Sequence[Sequence[Path]]) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for baseline_path, candidate_path in pairs:
        if not baseline_path.is_file() or not candidate_path.is_file():
            raise PreflightError(
                f"immutable pair requires two files: {baseline_path} :: {candidate_path}"
            )
        baseline_sha = _sha256_file(baseline_path)
        candidate_sha = _sha256_file(candidate_path)
        if baseline_sha != candidate_sha:
            raise PreflightError(
                f"immutable file mismatch: {baseline_path} ({baseline_sha}) != "
                f"{candidate_path} ({candidate_sha})"
            )
        results.append(
            {
                "baseline": str(baseline_path),
                "candidate": str(candidate_path),
                "sha256": baseline_sha,
            }
        )
    return results


def run_preflight(
    *,
    baseline_inputs: Sequence[Path],
    candidate_inputs: Sequence[Path],
    node_hash_index: Path | None = None,
    evidence_hash_index: Path | None = None,
    immutable_pairs: Sequence[Sequence[Path]] = (),
    require_complete: bool = False,
) -> dict[str, Any]:
    baseline = load_nodes(baseline_inputs, label="baseline")
    candidate = load_nodes(candidate_inputs, label="candidate")

    baseline_index_result: dict[str, Any] | None = None
    if node_hash_index is not None:
        baseline_index_result = verify_baseline_index(
            baseline, node_hash_index, require_complete=require_complete
        )

    evidence_result: dict[str, Any] | None = None
    evidence_ids: frozenset[str] | None = None
    if evidence_hash_index is not None:
        loaded = load_evidence_ids(evidence_hash_index)
        evidence_ids = loaded.pop("ids")
        evidence_result = loaded

    comparison = compare_candidate(
        baseline,
        candidate,
        evidence_ids=evidence_ids,
        require_complete=require_complete,
    )
    immutable_result = verify_immutable_pairs(immutable_pairs)

    return {
        "schema": SCHEMA,
        "status": "PASS",
        "policy": {
            "mutable_top_level_text_fields": sorted(MUTABLE_TOP_LEVEL_TEXT_FIELDS),
            "mutable_mapping_text_fields": sorted(MUTABLE_MAPPING_TEXT_FIELDS),
            "mutable_list_text_fields": sorted(MUTABLE_LIST_TEXT_FIELDS),
            "immutable_list_text_indices": {
                field: sorted(indices)
                for field, indices in sorted(IMMUTABLE_LIST_TEXT_INDICES.items())
            },
            "all_other_fields": "IMMUTABLE_FAIL_CLOSED",
        },
        "baseline_nodes": len(baseline),
        "comparison": comparison,
        "baseline_hash_index": baseline_index_result,
        "evidence_hash_index": evidence_result,
        "immutable_pairs": immutable_result,
    }


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--baseline",
        type=Path,
        action="append",
        required=True,
        help="Baseline .jsonl file or directory; repeatable.",
    )
    parser.add_argument(
        "--candidate",
        type=Path,
        action="append",
        required=True,
        help="Corrected shard .jsonl file or directory; repeatable.",
    )
    parser.add_argument("--node-hash-index", type=Path)
    parser.add_argument("--evidence-hash-index", type=Path)
    parser.add_argument(
        "--immutable",
        nargs=2,
        type=Path,
        action="append",
        default=[],
        metavar=("BASELINE_FILE", "CANDIDATE_FILE"),
        help="Require an exact-byte immutable metadata/source file pair; repeatable.",
    )
    parser.add_argument(
        "--require-complete",
        action="store_true",
        help="Require baseline and candidate to cover the complete immutable node index.",
    )
    parser.add_argument("--report", type=Path, help="Optional path for deterministic JSON report.")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        result = run_preflight(
            baseline_inputs=args.baseline,
            candidate_inputs=args.candidate,
            node_hash_index=args.node_hash_index,
            evidence_hash_index=args.evidence_hash_index,
            immutable_pairs=args.immutable,
            require_complete=args.require_complete,
        )
    except PreflightError as exc:
        failure = {"schema": SCHEMA, "status": "FAIL", "error": str(exc)}
        payload = json.dumps(failure, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
        if args.report:
            args.report.parent.mkdir(parents=True, exist_ok=True)
            args.report.write_text(payload, encoding="utf-8")
        print(payload, end="", file=sys.stderr)
        return 1

    payload = json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(payload, encoding="utf-8")
    print(payload, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
