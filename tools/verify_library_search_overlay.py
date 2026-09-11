from __future__ import annotations

import ast
import importlib.util
import json
import sys
import types
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OVERLAY = ROOT / "lanes" / "dev1" / "repair_overlay"
LIBRARY = OVERLAY / "scripture_archive_platform" / "content" / "library.py"
SERVICE = OVERLAY / "scripture_archive_platform" / "application" / "service.py"
CONTRACTS = OVERLAY / "scripture_archive_platform" / "transport" / "contracts.py"
TESTS = OVERLAY / "tests" / "test_library_search.py"


def parse_all() -> None:
    for path in (LIBRARY, SERVICE, CONTRACTS, TESTS):
        ast.parse(path.read_text(encoding="utf-8"), filename=str(path))


def load_library_module():
    package = types.ModuleType("scripture_archive_platform")
    package.__path__ = []
    content_package = types.ModuleType("scripture_archive_platform.content")
    content_package.__path__ = []
    loader_module = types.ModuleType("scripture_archive_platform.content.loader")

    class CanonicalContentLoader:
        pass

    loader_module.CanonicalContentLoader = CanonicalContentLoader
    sys.modules[package.__name__] = package
    sys.modules[content_package.__name__] = content_package
    sys.modules[loader_module.__name__] = loader_module

    spec = importlib.util.spec_from_file_location("scripture_archive_platform.content.library", LIBRARY)
    if spec is None or spec.loader is None:
        raise AssertionError("cannot load library module")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class FakeLoader:
    def __init__(self):
        mission = {
            "mission_id": "DM-01",
            "campaign_id": "DM",
            "title": "Luke investigation",
            "difficulty": "intro",
            "primary_scripture": ["Luke 22:8-13"],
            "secondary_scripture": "none",
            "canonical_status": "test",
            "node_count": 1,
        }
        node = {
            "node_id": "DM01-N01",
            "mission_id": "DM-01",
            "player_prompt": "Compare the visible witness in Luke 22:8.",
            "source_scope_visible_to_player": "Luke 22:8-13",
            "task_family": "witness comparison",
            "difficulty": "intro",
            "required_evidence": ["SECRET_LOCKED_EVIDENCE"],
            "accepted_answer": "SECRET_ACCEPTED_TRUTH",
            "rejected_answers": "SECRET_REJECTED_TRUTH",
            "grading": {"accepted_answer": "SECRET_GRADING_TRUTH"},
            "hints": {"H1": "SECRET_HINT_TRUTH"},
        }
        self._missions = [mission]
        self._nodes = {node["node_id"]: node}
        self._mission_for_node = {node["node_id"]: mission}

    def _ensure(self):
        return None

    def list_campaigns(self):
        return [{"campaign_id": "DM", "title": "DM", "mission_count": 1, "machine_node_count": 1}]


def verify_behavior() -> None:
    module = load_library_module()
    index = module.CanonicalLibraryIndex(FakeLoader())

    catalog = index.catalog()
    assert catalog["schema"] == "scripture.library.catalog.v1"
    assert catalog["source_of_truth"] == "CanonicalContentLoader"
    assert catalog["derived_index"] is True
    assert catalog["bundled_full_bible_text"] is False
    assert catalog["text_provider_available"] is False
    assert catalog["machine_node_count"] == 1
    assert "Luke 22:8-13" in catalog["source_references"]
    assert "SECRET_" not in json.dumps(catalog, ensure_ascii=False)

    first = index.search("Luke 22:8")
    second = index.search("Luke 22:8")
    assert first == second
    assert first["schema"] == "scripture.library.search.v1"
    assert first["total"] >= 2
    assert {item["kind"] for item in first["results"]} >= {"mission", "task"}

    for secret in (
        "SECRET_ACCEPTED_TRUTH",
        "SECRET_REJECTED_TRUTH",
        "SECRET_GRADING_TRUTH",
        "SECRET_HINT_TRUTH",
        "SECRET_LOCKED_EVIDENCE",
    ):
        result = index.search(secret)
        assert result["total"] == 0, secret
        assert result["results"] == [], secret

    assert index.search("Luke", campaign_id="DM")["total"] > 0
    assert index.search("Luke", campaign_id="OTHER")["total"] == 0
    assert len(index.search("Luke", mission_id="DM-01", limit=1)["results"]) == 1

    for query in (None, "", "   ", "x" * 201):
        try:
            index.search(query)
        except ValueError:
            pass
        else:
            raise AssertionError(f"query should fail closed: {query!r}")
    for limit in (0, 101, True, "10"):
        try:
            index.search("Luke", limit=limit)
        except ValueError:
            pass
        else:
            raise AssertionError(f"limit should fail closed: {limit!r}")


def verify_wiring() -> None:
    service = SERVICE.read_text(encoding="utf-8")
    contracts = CONTRACTS.read_text(encoding="utf-8")
    assert "from scripture_archive_platform.content.library import CanonicalLibraryIndex" in service
    assert "self.library=CanonicalLibraryIndex(self.loader)" in service
    assert "if cmd=='library.catalog':return self.library.catalog()" in service
    assert "if cmd=='library.search':return self.library.search(" in service
    assert "'library_catalog_search':True" in service
    assert "'bundled_full_bible_text':False" in service
    assert '"library.catalog"' in contracts
    assert '"library.search"' in contracts
    assert "player.next accepts only current node_id context; target selection is forbidden" in contracts


if __name__ == "__main__":
    parse_all()
    verify_behavior()
    verify_wiring()
    print("LIBRARY_SEARCH_QUALIFICATION_PASS")
