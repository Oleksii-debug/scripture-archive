from __future__ import annotations

import hashlib
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
_D4_NODE_RECORD_AGGREGATE_SHA256 = "9fd8f668868e267e97b718a1de3025ad47577748e1054e146b6279da585e2ef7"

_D4_PUBLIC_AUTHORITY_SHA256 = {
    "metadata/mission_index_metadata.json": "cfc13e369006522f6ad450863888f3603f395d4d0168f7f498e5ebf7ed6e0192",
    "registries/missions_001_005.jsonl": "756b265b32b011b7a875872e140d54095f979391de4bd0c22029141d7a75aaa8",
    "registries/missions_006_008.jsonl": "ed7e3078ddeff1cbbdbbc46014fdf25cb9b73657f8d87246917507be1add8f95",
    "registries/missions_009_010.jsonl": "dfba7785e7c55d79692f30ff8e7ec165c5b9717b22fb472f4111dcc701ada76c",
    "registries/missions_011_012.jsonl": "0a701f11b1ca0c1420443caf46b6424855300a73e8b6355ef9749b905cc39256",
    "registries/missions_013_013.jsonl": "e20ceca46f0242d2670bacbf305ab35fb01c11918664b5d040ce158bcc1e8c54",
    "registries/missions_014_015.jsonl": "9fe7b601e514ee384e23548d19990c9d7efb7a0586efb02e4d4bc161995356f3",
}


class CanonicalLibraryIndex:
    """Derived read-only catalog/search over gradeable plus qualified readable content.

    ``CanonicalContentLoader`` remains the only gradeable mission/node authority.
    Qualified D4 JSONL records are projected only into this Library view and never
    inserted into the loader's gradeable maps or persisted as a second truth store.
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

    @classmethod
    def _mission_source_refs(cls, mission: dict[str, Any]) -> list[str]:
        return cls._unique(
            cls._text_values(mission.get("primary_scripture"))
            + cls._text_values(mission.get("secondary_scripture"))
        )

    @classmethod
    def _node_source_refs(cls, node: dict[str, Any], mission: dict[str, Any]) -> list[str]:
        return cls._unique(
            cls._text_values(node.get("source_scope_visible_to_player"))
            + cls._mission_source_refs(mission)
        )

    @staticmethod
    def _qualified_text_bytes(raw: bytes, path: Path) -> bytes:
        if b"\r" not in raw:
            return raw
        normalized = raw.replace(b"\r\n", b"\n")
        if b"\r" in normalized:
            raise ContentLoadError(f"qualified readable D4 authority has unsupported line endings: {path}")
        return normalized

    @classmethod
    def _load_json(cls, path: Path, *, expected_sha256: str | None = None) -> Any:
        try:
            raw = path.read_bytes()
            verified = cls._qualified_text_bytes(raw, path) if expected_sha256 is not None else raw
            if expected_sha256 is not None and hashlib.sha256(verified).hexdigest() != expected_sha256:
                raise ContentLoadError(f"qualified readable D4 authority bytes changed: {path}")
            return json.loads(verified.decode("utf-8"))
        except ContentLoadError:
            raise
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ContentLoadError(f"invalid qualified readable D4 JSON {path}: {exc}") from exc

    @classmethod
    def _load_jsonl(cls, path: Path, *, expected_sha256: str | None = None) -> list[dict[str, Any]]:
        try:
            raw = path.read_bytes()
            verified = cls._qualified_text_bytes(raw, path) if expected_sha256 is not None else raw
            if expected_sha256 is not None and hashlib.sha256(verified).hexdigest() != expected_sha256:
                raise ContentLoadError(f"qualified readable D4 authority bytes changed: {path}")
            lines = verified.decode("utf-8").splitlines()
        except ContentLoadError:
            raise
        except (OSError, UnicodeDecodeError) as exc:
            raise ContentLoadError(f"cannot read qualified readable D4 JSONL {path}: {exc}") from exc
        rows: list[dict[str, Any]] = []
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

    @staticmethod
    def _require_real_dir(path: Path, label: str) -> None:
        if path.is_symlink() or not path.is_dir():
            raise ContentLoadError(f"qualified readable D4 {label} must be a real directory")

    @staticmethod
    def _canonical_record_sha256(record: dict[str, Any]) -> str:
        encoded = json.dumps(
            record,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
        return hashlib.sha256(encoded).hexdigest()

    def _qualified_d4_node_hashes(self, root: Path) -> dict[str, str]:
        hash_root = root / "record_hashes"
        self._require_real_dir(hash_root, "record-hash directory")
        expected: dict[str, str] = {}
        for path in sorted(hash_root.glob("nodes_*.sha256.json")):
            if path.is_symlink() or not path.is_file():
                raise ContentLoadError("qualified readable D4 node-hash registry contains unsafe path")
            payload = self._load_json(path)
            if not isinstance(payload, dict):
                raise ContentLoadError(f"qualified readable D4 node-hash registry must be object: {path}")
            for node_id, digest in payload.items():
                if (
                    not isinstance(node_id, str)
                    or not node_id
                    or node_id in expected
                    or not isinstance(digest, str)
                    or not re.fullmatch(r"[0-9a-f]{64}", digest)
                ):
                    raise ContentLoadError(f"invalid/duplicate qualified readable D4 node hash: {node_id!r}")
                expected[node_id] = digest
        if len(expected) != _D4_NODE_COUNT:
            raise ContentLoadError("qualified readable D4 node-hash count changed")
        aggregate = hashlib.sha256(
            "".join(expected[node_id] for node_id in sorted(expected)).encode("ascii")
        ).hexdigest()
        if aggregate != _D4_NODE_RECORD_AGGREGATE_SHA256:
            raise ContentLoadError("qualified readable D4 node-hash aggregate changed")
        return expected

    def _qualified_d4_records(
        self,
    ) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
        root = self.loader.repo_root / _D4_RELATIVE_ROOT
        if not root.exists():
            return [], {}, {}
        self._require_real_dir(root, "root")
        self._require_real_dir(root / "metadata", "metadata directory")
        self._require_real_dir(root / "registries", "registries directory")
        self._require_real_dir(root / "nodes", "nodes directory")
        expected_node_hashes = self._qualified_d4_node_hashes(root)

        metadata_path = root / "metadata" / "mission_index_metadata.json"
        if metadata_path.is_symlink() or not metadata_path.is_file():
            raise ContentLoadError("qualified readable D4 mission metadata is missing or unsafe")
        metadata = self._load_json(
            metadata_path,
            expected_sha256=_D4_PUBLIC_AUTHORITY_SHA256["metadata/mission_index_metadata.json"],
        )
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

        raw_by_id: dict[str, dict[str, Any]] = {}
        registry_root = root / "registries"
        registry_paths = sorted(registry_root.glob("missions_*.jsonl"))
        expected_registry_names = sorted(
            Path(relative).name
            for relative in _D4_PUBLIC_AUTHORITY_SHA256
            if relative.startswith("registries/")
        )
        if [path.name for path in registry_paths] != expected_registry_names:
            raise ContentLoadError("qualified readable D4 mission registry file set changed")
        for path in registry_paths:
            if path.is_symlink() or not path.is_file():
                raise ContentLoadError("qualified readable D4 mission registry contains unsafe path")
            for raw in self._load_jsonl(
                path,
                expected_sha256=_D4_PUBLIC_AUTHORITY_SHA256[f"registries/{path.name}"],
            ):
                mid = raw.get("mission_id")
                if not isinstance(mid, str) or mid not in sequence or mid in raw_by_id:
                    raise ContentLoadError(f"unexpected or duplicate qualified readable D4 mission: {mid}")
                raw_by_id[mid] = raw
        if set(raw_by_id) != set(sequence):
            raise ContentLoadError("qualified readable D4 mission registry set changed")

        missions: list[dict[str, Any]] = []
        missions_by_id: dict[str, dict[str, Any]] = {}
        expected_nodes: dict[str, set[str]] = {}
        for mid in sequence:
            raw = raw_by_id[mid]
            task_nodes = raw.get("task_nodes")
            if raw.get("campaign_id") != _D4_CAMPAIGN_ID:
                raise ContentLoadError(f"qualified readable D4 mission campaign changed: {mid}")
            if not isinstance(task_nodes, list) or not task_nodes or not all(isinstance(v, str) and v for v in task_nodes):
                raise ContentLoadError(f"qualified readable D4 mission task_nodes invalid: {mid}")
            if len(set(task_nodes)) != len(task_nodes):
                raise ContentLoadError(f"qualified readable D4 mission task_nodes duplicate: {mid}")
            entry = {
                "mission_id": mid,
                "campaign_id": _D4_CAMPAIGN_ID,
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
            expected_nodes[mid] = set(task_nodes)

        nodes: dict[str, dict[str, Any]] = {}
        mission_for_node: dict[str, dict[str, Any]] = {}
        actual_nodes: dict[str, set[str]] = {mid: set() for mid in missions_by_id}
        for path in sorted((root / "nodes").glob("nodes_*.jsonl")):
            if path.is_symlink() or not path.is_file():
                raise ContentLoadError("qualified readable D4 node registry contains unsafe path")
            for node in self._load_jsonl(path):
                nid = node.get("node_id")
                mid = node.get("mission_id")
                if not isinstance(nid, str) or not nid or nid in nodes:
                    raise ContentLoadError(f"duplicate/empty qualified readable D4 node: {nid!r}")
                if mid not in missions_by_id or nid not in expected_nodes[mid]:
                    raise ContentLoadError(f"qualified readable D4 node/mission binding changed: {nid}")
                if self._canonical_record_sha256(node) != expected_node_hashes.get(nid):
                    raise ContentLoadError(f"qualified readable D4 node hash changed: {nid}")
                nodes[nid] = node
                mission_for_node[nid] = missions_by_id[mid]
                actual_nodes[mid].add(nid)
        if len(nodes) != _D4_NODE_COUNT or set(nodes) != set(expected_node_hashes):
            raise ContentLoadError("qualified readable D4 node/hash identity set changed")
        for mid, expected in expected_nodes.items():
            if actual_nodes[mid] != expected:
                raise ContentLoadError(f"qualified readable D4 mission node set changed: {mid}")
        return missions, nodes, mission_for_node

    def _records(self) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
        self.loader._ensure()
        missions: list[dict[str, Any]] = []
        gradeable_by_id: dict[str, dict[str, Any]] = {}
        for raw in self.loader._missions or []:
            mission = dict(raw)
            cid = str(mission.get("campaign_id") or "")
            mission["content_access"] = "GRADEABLE_RUNTIME"
            mission["gradeable_runtime_eligible"] = True
            mission["_campaign_title"] = {"LN": "Остання ніч", "PA": "Дорога Павла"}.get(cid, cid)
            missions.append(mission)
            gradeable_by_id[str(mission.get("mission_id") or "")] = mission

        nodes = {str(key): dict(value) for key, value in (self.loader._nodes or {}).items()}
        mission_for_node: dict[str, dict[str, Any]] = {}
        for key, raw in (self.loader._mission_for_node or {}).items():
            mid = str(raw.get("mission_id") or "")
            mission_for_node[str(key)] = dict(gradeable_by_id.get(mid) or raw)

        d4_missions, d4_nodes, d4_mission_for_node = self._qualified_d4_records()
        if set(gradeable_by_id).intersection(str(item.get("mission_id") or "") for item in d4_missions):
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
        missions, nodes, mission_for_node = self._records()
        mission_rows: list[dict[str, Any]] = []
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
            passage_refs.extend(self._node_source_refs(node, mission_for_node.get(node_id) or {}))
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

    def search(self, query: Any, *, campaign_id: Any = None, mission_id: Any = None, limit: Any = 25) -> dict[str, Any]:
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
            if (campaign_filter and cid != campaign_filter) or (mission_filter and mid != mission_filter):
                continue
            refs = self._mission_source_refs(mission)
            score = self._score(query, [cid, mid, self._clean(mission.get("title")), *refs])
            if score:
                results.append(
                    {
                        "kind": "mission", "id": mid, "campaign_id": cid, "mission_id": mid,
                        "title": self._clean(mission.get("title")) or mid,
                        "snippet": refs[0] if refs else self._clean(mission.get("title")),
                        "source_references": refs,
                        "content_access": mission.get("content_access"),
                        "gradeable_runtime_eligible": mission.get("gradeable_runtime_eligible") is True,
                        "source_audit_status": mission.get("source_audit_status"),
                        "score": score,
                    }
                )

        for node_id, node in nodes.items():
            mission = mission_for_node.get(node_id) or {}
            cid = str(mission.get("campaign_id") or node.get("campaign_id") or "")
            mid = str(node.get("mission_id") or mission.get("mission_id") or "")
            if (campaign_filter and cid != campaign_filter) or (mission_filter and mid != mission_filter):
                continue
            refs = self._node_source_refs(node, mission)
            prompt = self._clean(node.get("player_prompt"))
            task_family = self._clean(node.get("task_family"))
            score = self._score(query, [node_id, cid, mid, prompt, task_family, *refs])
            if score:
                results.append(
                    {
                        "kind": "task", "id": node_id, "campaign_id": cid, "mission_id": mid,
                        "title": prompt or node_id, "snippet": prompt,
                        "task_family": task_family or None, "difficulty": node.get("difficulty"),
                        "source_references": refs,
                        "content_access": mission.get("content_access"),
                        "gradeable_runtime_eligible": mission.get("gradeable_runtime_eligible") is True,
                        "source_audit_status": mission.get("source_audit_status"),
                        "score": score,
                    }
                )

        results.sort(key=lambda item: (-int(item["score"]), item["kind"], item["id"]))
        return {
            "schema": SEARCH_SCHEMA,
            "query": query,
            "filters": {"campaign_id": campaign_filter, "mission_id": mission_filter},
            "total": len(results),
            "results": results[:limit],
            "source_of_truth": "CanonicalContentLoader",
            "derived_index": True,
            "bundled_full_bible_text": False,
        }
