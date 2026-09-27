from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from scripture_archive_platform.content.loader import CanonicalContentLoader, ContentLoadError


SEARCH_SCHEMA = "scripture.library.search.v1"
CATALOG_SCHEMA = "scripture.library.catalog.v1"
_D4_RELATIVE_ROOT = Path("docs/campaigns/OT/R06_D4_STAGE05_READABLE")
_D4_CAMPAIGN_ID = "OT-R06-D4"
_D4_EDITORIAL_STATUS = "AUTHOR_COMPLETE / DEVELOPER_SOURCE_AUDITED / INDEPENDENT_AUDIT_PENDING"
_D4_SOURCE_AUDIT_STATUS = "DEVELOPER_SOURCE_AUDITED / INDEPENDENT_AUDIT_PENDING"
_D4_MISSION_COUNT = 15
_D4_NODE_COUNT = 450


class CanonicalLibraryIndex:
    """Read-only search/catalog view over canonical and qualified readable content.

    Gradeable content remains owned exclusively by ``CanonicalContentLoader``.
    A qualified D4 readable corpus may additionally be projected into this Library
    view, but it is never inserted into the loader's gradeable mission/node maps.
    The index is derived on demand and persists no second truth store.
    """

    def __init__(self, loader: CanonicalContentLoader):
        self.loader = loader

    @staticmethod
    def _clean(value: Any) -> str:
        return re.sub(r"\s+", " ", str(value or "")).strip()

    @classmethod
    def _text_values(cls, value: Any) -> list[str]:
        if value is None:
            return []
        if isinstance(value, str):
            text = cls._clean(value)
            return [text] if text and text.lower() != "none" else []
        if isinstance(value, (list, tuple)):
            out: list[str] = []
            for item in value:
                out.extend(cls._text_values(item))
            return out
        return []

    @staticmethod
    def _unique(values: list[str]) -> list[str]:
        out: list[str] = []
        seen: set[str] = set()
        for value in values:
            key = value.casefold()
            if value and key not in seen:
                seen.add(key)
                out.append(value)
        return out

    @staticmethod
    def _load_json(path: Path) -> Any:
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ContentLoadError(f"invalid qualified readable D4 JSON {path}: {exc}") from exc

    @classmethod
    def _load_jsonl(cls, path: Path) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except (OSError, UnicodeDecodeError) as exc:
            raise ContentLoadError(f"cannot read qualified readable D4 JSONL {path}: {exc}") from exc
        for line_number, line in enumerate(lines, 1):
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ContentLoadError(f"invalid qualified readable D4 JSONL {path}:{line_number}") from exc
            if not isinstance(row, dict):
                raise ContentLoadError(f"qualified readable D4 row must be object: {path}:{line_number}")
            rows.append(row)
        return rows

    @classmethod
    def _mission_source_refs(cls, mission: dict[str, Any]) -> list[str]:
        return cls._unique(
            cls._text_values(mission.get("primary_scripture"))
            + cls._text_values(mission.get("secondary_scripture"))
        )

    @classmethod
    def _node_source_refs(cls, node: dict[str, Any], mission: dict[str, Any]) -> list[str]:
        # Only player-visible source scope plus mission-visible Scripture scope are
        # searchable. Answer/grading/evidence-unlock truth remains deliberately out.
        return cls._unique(
            cls._text_values(node.get("source_scope_visible_to_player"))
            + cls._mission_source_refs(mission)
        )

    def _qualified_d4_records(
        self,
    ) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
        root = self.loader.repo_root / _D4_RELATIVE_ROOT
        if not root.exists():
            return [], {}, {}
        if root.is_symlink() or not root.is_dir():
            raise ContentLoadError("qualified readable D4 root must be a real directory")

        metadata_path = root / "metadata" / "mission_index_metadata.json"
        if metadata_path.is_symlink() or not metadata_path.is_file():
            raise ContentLoadError("qualified readable D4 mission metadata is missing or unsafe")
        metadata = self._load_json(metadata_path)
        if not isinstance(metadata, dict):
            raise ContentLoadError("qualified readable D4 mission metadata must be object")
        campaign = metadata.get("campaign")
        counts = metadata.get("counts")
        if not isinstance(campaign, dict) or not isinstance(counts, dict):
            raise ContentLoadError("qualified readable D4 metadata is incomplete")
        if campaign.get("campaign_id") != _D4_CAMPAIGN_ID:
            raise ContentLoadError("qualified readable D4 campaign identity changed")
        if campaign.get("editorial_status") != _D4_EDITORIAL_STATUS:
            raise ContentLoadError("qualified readable D4 editorial/audit status changed")
        if campaign.get("source_audit_status") != _D4_SOURCE_AUDIT_STATUS:
            raise ContentLoadError("qualified readable D4 source-audit status changed")
        if counts.get("missions") != _D4_MISSION_COUNT or counts.get("nodes") != _D4_NODE_COUNT:
            raise ContentLoadError("qualified readable D4 mission/node counts changed")
        sequence = campaign.get("mission_sequence")
        if not isinstance(sequence, list) or len(sequence) != _D4_MISSION_COUNT or len(set(sequence)) != len(sequence):
            raise ContentLoadError("qualified readable D4 mission sequence is invalid")
        campaign_title = self._clean(campaign.get("title_ua")) or _D4_CAMPAIGN_ID

        mission_rows: list[dict[str, Any]] = []
        for path in sorted((root / "registries").glob("missions_*.jsonl")):
            if path.is_symlink() or not path.is_file():
                raise ContentLoadError("qualified readable D4 mission registry contains unsafe path")
            mission_rows.extend(self._load_jsonl(path))
        if len(mission_rows) != _D4_MISSION_COUNT:
            raise ContentLoadError("qualified readable D4 mission registry count changed")

        missions: list[dict[str, Any]] = []
        missions_by_id: dict[str, dict[str, Any]] = {}
        expected_nodes_by_mission: dict[str, set[str]] = {}
        for raw in mission_rows:
            mid = raw.get("mission_id")
            cid = raw.get("campaign_id")
            task_nodes = raw.get("task_nodes")
            if not isinstance(mid, str) or mid not in sequence or mid in missions_by_id:
                raise ContentLoadError(f"unexpected or duplicate qualified readable D4 mission: {mid}")
            if cid != _D4_CAMPAIGN_ID:
                raise ContentLoadError(f"qualified readable D4 mission campaign changed: {mid}")
            if not isinstance(task_nodes, list) or not task_nodes or not all(isinstance(v, str) and v for v in task_nodes):
                raise ContentLoadError(f"qualified readable D4 mission task_nodes invalid: {mid}")
            if len(set(task_nodes)) != len(task_nodes):
                raise ContentLoadError(f"qualified readable D4 mission task_nodes duplicate: {mid}")
            entry = {
                "mission_id": mid,
                "campaign_id": cid,
                "title": self._clean(raw.get("title")) or mid,
                "difficulty": raw.get("difficulty"),
                "entry_node": raw.get("entry_node"),
                "node_count": len(task_nodes),
                "primary_scripture": raw.get("primary_scripture", []),
                "secondary_scripture": raw.get("secondary_scripture", "none"),
                "canonical_status": _D4_EDITORIAL_STATUS,
                "source_audit_status": _D4_SOURCE_AUDIT_STATUS,
                "content_access": "READ_ONLY_LIBRARY",
                "gradeable_runtime_eligible": False,
                "_campaign_title": campaign_title,
            }
            missions.append(entry)
            missions_by_id[mid] = entry
            expected_nodes_by_mission[mid] = set(task_nodes)
        if [item["mission_id"] for item in missions] != sequence:
            # Registry shard order is itself qualified and must match metadata order.
            raise ContentLoadError("qualified readable D4 mission registry order changed")

        nodes: dict[str, dict[str, Any]] = {}
        mission_for_node: dict[str, dict[str, Any]] = {}
        actual_nodes_by_mission: dict[str, set[str]] = {mid: set() for mid in missions_by_id}
        for path in sorted((root / "nodes").glob("nodes_*.jsonl")):
            if path.is_symlink() or not path.is_file():
                raise ContentLoadError("qualified readable D4 node registry contains unsafe path")
            for node in self._load_jsonl(path):
                nid = node.get("node_id")
                mid = node.get("mission_id")
                if not isinstance(nid, str) or not nid or nid in nodes:
                    raise ContentLoadError(f"duplicate/empty qualified readable D4 node: {nid!r}")
                if mid not in missions_by_id or nid not in expected_nodes_by_mission[mid]:
                    raise ContentLoadError(f"qualified readable D4 node/mission binding changed: {nid}")
                nodes[nid] = node
                mission_for_node[nid] = missions_by_id[mid]
                actual_nodes_by_mission[mid].add(nid)
        if len(nodes) != _D4_NODE_COUNT:
            raise ContentLoadError("qualified readable D4 node count changed")
        for mid, expected in expected_nodes_by_mission.items():
            if actual_nodes_by_mission[mid] != expected:
                raise ContentLoadError(f"qualified readable D4 mission node set changed: {mid}")
        return missions, nodes, mission_for_node

    def _records(self) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
        self.loader._ensure()  # Same-package read-only view; no independent persistent store.
        missions: list[dict[str, Any]] = []
        for item in self.loader._missions or []:
            mission = dict(item)
            mission["content_access"] = "GRADEABLE_RUNTIME"
            mission["gradeable_runtime_eligible"] = True
            mission["_campaign_title"] = {"LN": "Остання ніч", "PA": "Дорога Павла"}.get(
                str(mission.get("campaign_id") or ""), str(mission.get("campaign_id") or "")
            )
            missions.append(mission)
        nodes = {str(key): dict(value) for key, value in (self.loader._nodes or {}).items()}
        mission_for_node = {
            str(key): dict(value) for key, value in (self.loader._mission_for_node or {}).items()
        }

        d4_missions, d4_nodes, d4_mission_for_node = self._qualified_d4_records()
        existing_missions = {str(item.get("mission_id") or "") for item in missions}
        if existing_missions.intersection(str(item.get("mission_id") or "") for item in d4_missions):
            raise ContentLoadError("qualified readable D4 mission collides with gradeable runtime mission")
        if set(nodes).intersection(d4_nodes):
            raise ContentLoadError("qualified readable D4 node collides with gradeable runtime node")
        missions.extend(d4_missions)
        nodes.update(d4_nodes)
        mission_for_node.update(d4_mission_for_node)
        return missions, nodes, mission_for_node

    @staticmethod
    def _public_mission(mission: dict[str, Any]) -> dict[str, Any]:
        return {key: value for key, value in mission.items() if not key.startswith("_")}

    def list_campaigns(self) -> list[dict[str, Any]]:
        missions, _, _ = self._records()
        grouped: dict[str, dict[str, Any]] = {}
        for mission in missions:
            cid = str(mission.get("campaign_id") or "")
            row = grouped.setdefault(
                cid,
                {
                    "campaign_id": cid,
                    "title": mission.get("_campaign_title") or cid,
                    "mission_count": 0,
                    "machine_node_count": 0,
                    "gradeable_runtime_eligible": True,
                    "content_access": "GRADEABLE_RUNTIME",
                },
            )
            row["mission_count"] += 1
            row["machine_node_count"] += int(mission.get("node_count") or 0)
            if mission.get("gradeable_runtime_eligible") is not True:
                row["gradeable_runtime_eligible"] = False
                row["content_access"] = "READ_ONLY_LIBRARY"
        return sorted(grouped.values(), key=lambda item: item["campaign_id"])

    def list_missions(self, campaign_id: str) -> list[dict[str, Any]]:
        missions, _, _ = self._records()
        return [self._public_mission(item) for item in missions if item.get("campaign_id") == campaign_id]

    def catalog(self) -> dict[str, Any]:
        missions, nodes, _ = self._records()
        mission_rows = []
        passage_refs: list[str] = []
        for mission in sorted(missions, key=lambda item: (str(item.get("campaign_id")), str(item.get("mission_id")))):
            refs = self._mission_source_refs(mission)
            passage_refs.extend(refs)
            mission_rows.append(
                {
                    "campaign_id": str(mission.get("campaign_id") or ""),
                    "mission_id": str(mission.get("mission_id") or ""),
                    "title": self._clean(mission.get("title")),
                    "difficulty": mission.get("difficulty"),
                    "primary_scripture": list(self._text_values(mission.get("primary_scripture"))),
                    "secondary_scripture": list(self._text_values(mission.get("secondary_scripture"))),
                    "canonical_status": mission.get("canonical_status"),
                    "source_audit_status": mission.get("source_audit_status"),
                    "node_count": int(mission.get("node_count") or 0),
                    "content_access": mission.get("content_access"),
                    "gradeable_runtime_eligible": mission.get("gradeable_runtime_eligible") is True,
                }
            )
        for node_id, node in sorted(nodes.items()):
            mission = (dict((self.loader._mission_for_node or {}).get(node_id) or {}))
            if not mission:
                mission = next((item for item in missions if item.get("mission_id") == node.get("mission_id")), {})
            passage_refs.extend(self._node_source_refs(node, mission))
        return {
            "schema": CATALOG_SCHEMA,
            "source_of_truth": "CanonicalContentLoader",
            "derived_index": True,
            "read_only_qualified_sources": [_D4_CAMPAIGN_ID] if any(m.get("campaign_id") == _D4_CAMPAIGN_ID for m in missions) else [],
            "bundled_full_bible_text": False,
            "text_provider_available": False,
            "campaigns": self.list_campaigns(),
            "missions": mission_rows,
            "source_references": self._unique(passage_refs),
            "machine_node_count": len(nodes),
        }

    @classmethod
    def _score(cls, query: str, fields: list[str]) -> int:
        normalized_fields = [cls._clean(value).casefold() for value in fields if cls._clean(value)]
        if not normalized_fields:
            return 0
        haystack = "\n".join(normalized_fields)
        q = cls._clean(query).casefold()
        if not q:
            return 0
        tokens = [token for token in re.split(r"\s+", q) if token]
        exact = sum(1 for value in normalized_fields if q in value)
        token_hits = sum(1 for token in tokens if token in haystack)
        if exact == 0 and token_hits != len(tokens):
            return 0
        return exact * 100 + token_hits * 10 + (20 if q in haystack else 0)

    @staticmethod
    def _optional_id(value: Any, name: str) -> str | None:
        if value is None:
            return None
        if not isinstance(value, str):
            raise ValueError(f"{name} must be string")
        value = value.strip()
        if not value or len(value) > 100:
            raise ValueError(f"invalid {name}")
        return value

    def search(
        self,
        query: Any,
        *,
        campaign_id: Any = None,
        mission_id: Any = None,
        limit: Any = 25,
    ) -> dict[str, Any]:
        if not isinstance(query, str):
            raise ValueError("query must be string")
        query = self._clean(query)
        if not query or len(query) > 200:
            raise ValueError("invalid query")
        campaign_filter = self._optional_id(campaign_id, "campaign_id")
        mission_filter = self._optional_id(mission_id, "mission_id")
        if isinstance(limit, bool) or not isinstance(limit, int) or not 1 <= limit <= 100:
            raise ValueError("limit must be integer 1..100")

        missions, nodes, mission_for_node = self._records()
        results: list[dict[str, Any]] = []

        for mission in missions:
            cid = str(mission.get("campaign_id") or "")
            mid = str(mission.get("mission_id") or "")
            if campaign_filter and cid != campaign_filter:
                continue
            if mission_filter and mid != mission_filter:
                continue
            refs = self._mission_source_refs(mission)
            fields = [cid, mid, self._clean(mission.get("title")), *refs]
            score = self._score(query, fields)
            if score:
                results.append(
                    {
                        "kind": "mission",
                        "id": mid,
                        "campaign_id": cid,
                        "mission_id": mid,
                        "title": self._clean(mission.get("title")) or mid,
                        "snippet": refs[0] if refs else self._clean(mission.get("title")),
                        "source_references": refs,
                        "content_access": mission.get("content_access"),
                        "gradeable_runtime_eligible": mission.get("gradeable_runtime_eligible") is True,
                        "score": score,
                    }
                )

        for node_id, node in nodes.items():
            mission = mission_for_node.get(node_id) or {}
            cid = str(mission.get("campaign_id") or node.get("campaign_id") or "")
            mid = str(node.get("mission_id") or mission.get("mission_id") or "")
            if campaign_filter and cid != campaign_filter:
                continue
            if mission_filter and mid != mission_filter:
                continue
            refs = self._node_source_refs(node, mission)
            prompt = self._clean(node.get("player_prompt"))
            task_family = self._clean(node.get("task_family"))
            fields = [node_id, cid, mid, prompt, task_family, *refs]
            score = self._score(query, fields)
            if score:
                results.append(
                    {
                        "kind": "task",
                        "id": node_id,
                        "campaign_id": cid,
                        "mission_id": mid,
                        "title": prompt or node_id,
                        "snippet": prompt,
                        "task_family": task_family or None,
                        "difficulty": node.get("difficulty"),
                        "source_references": refs,
                        "content_access": mission.get("content_access"),
                        "gradeable_runtime_eligible": mission.get("gradeable_runtime_eligible") is True,
                        "score": score,
                    }
                )

        results.sort(key=lambda item: (-int(item["score"]), item["kind"], item["id"]))
        total = len(results)
        return {
            "schema": SEARCH_SCHEMA,
            "query": query,
            "filters": {"campaign_id": campaign_filter, "mission_id": mission_filter},
            "total": total,
            "results": results[:limit],
            "source_of_truth": "CanonicalContentLoader",
            "derived_index": True,
            "bundled_full_bible_text": False,
        }
