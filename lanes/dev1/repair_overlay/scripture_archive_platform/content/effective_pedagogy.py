from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Mapping


ALLOWED_PEDAGOGY_OVERLAY_KEYS = frozenset(
    {
        "success_feedback",
        "partial_feedback",
        "failure_feedback",
        "hints",
        "on_hint_threshold",
        "mastery_mode",
    }
)


class EffectivePedagogyError(RuntimeError):
    pass


def _read_json(path: Path, *, label: str) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise EffectivePedagogyError(f"invalid {label} {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise EffectivePedagogyError(f"{label} must be an object: {path}")
    return data


def apply_r05_pedagogy_overlays(
    repo_root: Path,
    nodes: Mapping[str, Mapping[str, Any]],
) -> dict[str, dict[str, Any]]:
    """Return the effective canonical node set with R05 pedagogy overlays applied.

    Historical base shards stay untouched.  Only the keys authorized by
    PEDAGOGY_OVERLAY_PRECEDENCE_v1.0 may override a matching base node.
    Malformed, ambiguous, or out-of-scope overlays fail closed.
    """

    repo_root = Path(repo_root).resolve()
    campaigns_root = (repo_root / "docs" / "campaigns").resolve()
    effective = {str(node_id): dict(node) for node_id, node in nodes.items()}
    if not campaigns_root.exists():
        return effective

    seen_nodes: set[str] = set()
    seen_chunks: set[Path] = set()

    for index_path in sorted(campaigns_root.rglob("R05_PEDAGOGY_OVERLAY_INDEX.json")):
        index_path = index_path.resolve()
        if campaigns_root not in index_path.parents:
            raise EffectivePedagogyError("pedagogy overlay index path escape")
        index = _read_json(index_path, label="pedagogy overlay index")
        if index.get("precedence") != "overlay_over_base_node_record":
            raise EffectivePedagogyError(f"invalid pedagogy overlay precedence: {index_path}")
        chunks = index.get("chunks")
        if not isinstance(chunks, list) or not all(isinstance(item, str) and item.strip() for item in chunks):
            raise EffectivePedagogyError(f"pedagogy overlay index has invalid chunks: {index_path}")

        overlay_root = index_path.parent.resolve()
        for chunk_name in chunks:
            chunk_path = (overlay_root / chunk_name).resolve()
            if overlay_root not in chunk_path.parents:
                raise EffectivePedagogyError(f"pedagogy overlay chunk path escape: {chunk_name}")
            if chunk_path in seen_chunks:
                raise EffectivePedagogyError(f"duplicate pedagogy overlay chunk: {chunk_name}")
            seen_chunks.add(chunk_path)
            if not chunk_path.is_file():
                raise EffectivePedagogyError(f"missing pedagogy overlay chunk: {chunk_path}")

            chunk = _read_json(chunk_path, label="pedagogy overlay chunk")
            if chunk.get("precedence") != "overlay_over_base_node_record":
                raise EffectivePedagogyError(f"invalid pedagogy overlay chunk precedence: {chunk_path}")
            mission_id = chunk.get("mission_id")
            if not isinstance(mission_id, str) or not mission_id.strip():
                raise EffectivePedagogyError(f"pedagogy overlay chunk missing mission_id: {chunk_path}")
            patches = chunk.get("patches")
            if not isinstance(patches, dict):
                raise EffectivePedagogyError(f"pedagogy overlay chunk missing patches object: {chunk_path}")

            for node_id, patch in patches.items():
                if not isinstance(node_id, str) or not node_id.strip():
                    raise EffectivePedagogyError(f"pedagogy overlay has empty node_id: {chunk_path}")
                if node_id in seen_nodes:
                    raise EffectivePedagogyError(f"duplicate pedagogy overlay patch for {node_id}")
                if node_id not in effective:
                    raise EffectivePedagogyError(f"pedagogy overlay references unknown node {node_id}")
                if not isinstance(patch, dict):
                    raise EffectivePedagogyError(f"pedagogy overlay patch must be object for {node_id}")
                forbidden = sorted(set(patch) - ALLOWED_PEDAGOGY_OVERLAY_KEYS)
                if forbidden:
                    raise EffectivePedagogyError(
                        f"pedagogy overlay has forbidden keys for {node_id}: {', '.join(forbidden)}"
                    )
                base_mission = effective[node_id].get("mission_id")
                if base_mission != mission_id:
                    raise EffectivePedagogyError(
                        f"pedagogy overlay mission mismatch for {node_id}: {mission_id!r} != {base_mission!r}"
                    )

                merged = dict(effective[node_id])
                merged.update(patch)
                effective[node_id] = merged
                seen_nodes.add(node_id)

    return effective
