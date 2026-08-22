from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Iterable, Mapping

from scripture_archive_runtime.materialization_manifest import (
    MaterializationManifestError,
    validate_materialization_manifest,
)


class MaterializedContentLoadError(RuntimeError):
    pass


class ReadableMaterializationLoader:
    """Platform-facing read-only loader for Stage-05 record-hash materializations.

    Implements the same core query surface used by PlatformApplication while
    remaining independent of historical giant-file boundaries.
    """

    def __init__(self, repo_root: Path, manifest_paths: Iterable[str | Path]):
        self.repo_root = Path(repo_root).resolve()
        self.manifest_paths = tuple(Path(p) for p in manifest_paths)
        if not self.manifest_paths:
            raise MaterializedContentLoadError("at least one materialization manifest is required")
        self._missions: list[dict[str, Any]] | None = None
        self._nodes: dict[str, dict[str, Any]] | None = None
        self._mission_for_node: dict[str, dict[str, Any]] = {}

    def _scan(self) -> None:
        missions: dict[str, dict[str, Any]] = {}
        nodes: dict[str, dict[str, Any]] = {}
        mission_for_node: dict[str, dict[str, Any]] = {}

        for manifest_ref in self.manifest_paths:
            manifest_path = manifest_ref
            if not manifest_path.is_absolute():
                manifest_path = self.repo_root / manifest_path
            try:
                snapshot = validate_materialization_manifest(self.repo_root, manifest_path)
            except MaterializationManifestError as exc:
                raise MaterializedContentLoadError(str(exc)) from exc
            manifest = snapshot.manifest
            campaign_id = manifest.get("campaign_id")
            if not isinstance(campaign_id, str) or not campaign_id.strip():
                raise MaterializedContentLoadError("materialization manifest campaign_id is required for platform loading")
            campaign_id = campaign_id.strip()
            campaign_title = str(manifest.get("campaign_title") or campaign_id)

            mission_records: dict[str, Mapping[str, Any]] = {}
            if "missions" in snapshot.collections:
                for record in snapshot.collection("missions").records:
                    mission_id = record.get("mission_id")
                    if not isinstance(mission_id, str) or not mission_id.strip():
                        raise MaterializedContentLoadError("mission record lacks mission_id")
                    mission_records[mission_id.strip()] = record

            lane_nodes = snapshot.collection("nodes").records
            for node in lane_nodes:
                node_id = node.get("node_id")
                mission_id = node.get("mission_id")
                if not isinstance(node_id, str) or not node_id.strip():
                    raise MaterializedContentLoadError("node lacks node_id")
                if not isinstance(mission_id, str) or not mission_id.strip():
                    raise MaterializedContentLoadError(f"{node_id}: node lacks mission_id")
                node_id, mission_id = node_id.strip(), mission_id.strip()
                if node_id in nodes:
                    raise MaterializedContentLoadError(f"duplicate node_id across materializations: {node_id}")

                source_mission = mission_records.get(mission_id, {})
                entry = missions.get(mission_id)
                if entry is None:
                    entry = {
                        "mission_id": mission_id,
                        "campaign_id": str(source_mission.get("campaign_id") or campaign_id),
                        "campaign_title": campaign_title,
                        "title": str(source_mission.get("title") or source_mission.get("title_ua") or mission_id),
                        "difficulty": source_mission.get("difficulty"),
                        "entry_node": source_mission.get("entry_node"),
                        "node_count": 0,
                        "primary_scripture": source_mission.get("primary_scripture", []),
                        "secondary_scripture": source_mission.get("secondary_scripture", "none"),
                        "canonical_status": source_mission.get("canonical_status", manifest.get("canonical_status", "materialized/readback-verified")),
                        "index_path": str(manifest_path.relative_to(self.repo_root)).replace("\\", "/"),
                        "accessibility": dict(source_mission.get("accessibility") or {}),
                    }
                    missions[mission_id] = entry
                elif entry["campaign_id"] != str(source_mission.get("campaign_id") or campaign_id):
                    raise MaterializedContentLoadError(f"mission campaign conflict: {mission_id}")

                entry["node_count"] += 1
                if not entry.get("entry_node"):
                    entry["entry_node"] = node_id
                nodes[node_id] = dict(node)
                mission_for_node[node_id] = entry

        self._missions = sorted(missions.values(), key=lambda m: (m["campaign_id"], m["mission_id"]))
        self._nodes = nodes
        self._mission_for_node = mission_for_node

    def refresh(self) -> None:
        self._scan()

    def _ensure(self) -> None:
        if self._missions is None or self._nodes is None:
            self._scan()

    def list_campaigns(self) -> list[dict[str, Any]]:
        self._ensure()
        grouped: dict[str, dict[str, Any]] = {}
        for mission in self._missions or []:
            cid = mission["campaign_id"]
            current = grouped.setdefault(
                cid,
                {
                    "campaign_id": cid,
                    "title": mission.get("campaign_title") or cid,
                    "mission_count": 0,
                    "machine_node_count": 0,
                },
            )
            current["mission_count"] += 1
            current["machine_node_count"] += int(mission.get("node_count") or 0)
        return sorted(grouped.values(), key=lambda x: x["campaign_id"])

    def list_missions(self, campaign_id: str) -> list[dict[str, Any]]:
        self._ensure()
        return [dict(m) for m in self._missions or [] if m["campaign_id"] == campaign_id]

    def load_node(self, node_id: str) -> dict[str, Any]:
        self._ensure()
        assert self._nodes is not None
        try:
            return dict(self._nodes[node_id])
        except KeyError as exc:
            raise MaterializedContentLoadError(f"unknown materialized canonical node {node_id}") from exc

    def mission_for_node(self, node_id: str) -> dict[str, Any]:
        self._ensure()
        try:
            return dict(self._mission_for_node[node_id])
        except KeyError as exc:
            raise MaterializedContentLoadError(f"no mission for node {node_id}") from exc

    def next_node_id(self, node_id: str, outcome: str = "correct") -> str | None:
        node = self.load_node(node_id)
        raw = node.get(
            {"correct": "on_correct", "partial": "on_partial", "incorrect": "on_incorrect"}.get(
                outcome, "on_correct"
            )
        )
        if not isinstance(raw, str):
            return None
        match = re.fullmatch(r"(?:RESOLVED_NODE\s+)?([A-Za-z0-9._:-]{1,128})", raw.strip())
        if not match:
            return None
        target = match.group(1)
        self._ensure()
        return target if self._nodes is not None and target in self._nodes else None
