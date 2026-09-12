from __future__ import annotations

import re
from typing import Any

from scripture_archive_platform.content.loader import CanonicalContentLoader


SEARCH_SCHEMA = "scripture.library.search.v1"
CATALOG_SCHEMA = "scripture.library.catalog.v1"


class CanonicalLibraryIndex:
    """Read-only search/catalog view over the canonical content loader.

    This class deliberately does not persist a second search truth. It derives every
    result from the loader's current in-memory canonical mission/node records and
    only indexes fields that are already player-visible. Ground-truth answer,
    grading, hint, feedback and rejected-answer fields are intentionally excluded.
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
        # Only the player-visible scope plus mission-visible Scripture scope are
        # searchable. required_evidence/grading truth may be locked answer data.
        return cls._unique(
            cls._text_values(node.get("source_scope_visible_to_player"))
            + cls._mission_source_refs(mission)
        )

    def _records(self) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
        self.loader._ensure()  # Same-package read-only view; no independent store.
        missions = [dict(item) for item in (self.loader._missions or [])]
        nodes = {str(key): dict(value) for key, value in (self.loader._nodes or {}).items()}
        mission_for_node = {
            str(key): dict(value) for key, value in (self.loader._mission_for_node or {}).items()
        }
        return missions, nodes, mission_for_node

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
                    "node_count": int(mission.get("node_count") or 0),
                }
            )
        for node_id, node in sorted(nodes.items()):
            mission = (self.loader._mission_for_node or {}).get(node_id) or {}
            passage_refs.extend(self._node_source_refs(node, mission))
        return {
            "schema": CATALOG_SCHEMA,
            "source_of_truth": "CanonicalContentLoader",
            "derived_index": True,
            "bundled_full_bible_text": False,
            "text_provider_available": False,
            "campaigns": self.loader.list_campaigns(),
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
