from __future__ import annotations

from pathlib import Path
from typing import Any, Mapping

from scripture_archive_platform.transport.runtime_compat import RuntimeEngineContractAdapter


class RuntimeGatewayError(RuntimeError):
    pass


class RuntimeBackedPlayerGateway:
    """Map scripture.transport.v1 player operations to the canonical runtime.v1 engine.

    Presentation remains a platform concern. Grading, branching, mastery, player
    memory, evidence unlock state and player persistence are runtime-owned.
    """

    def __init__(self, runtime_invoke, *, research_export_invoke=None):
        self.adapter = RuntimeEngineContractAdapter(runtime_invoke)
        self._research_export_invoke = research_export_invoke

    @staticmethod
    def _request(command: str, payload: Mapping[str, Any], request_id: str) -> dict[str, Any]:
        return {
            "api_version": "scripture.transport.v1",
            "request_id": request_id,
            "command": command,
            "payload": dict(payload),
        }

    def invoke(self, command: str, payload: Mapping[str, Any] | None = None, *, request_id: str = "dev-a-runtime") -> dict[str, Any]:
        response = self.adapter.invoke_runtime(self._request(command, payload or {}, request_id))
        return dict(response)

    def export_research(self) -> dict[str, Any]:
        if self._research_export_invoke is None:
            raise RuntimeGatewayError("canonical runtime research export is unavailable")
        data = self._research_export_invoke()
        if not isinstance(data, Mapping):
            raise RuntimeGatewayError("canonical runtime research export must be an object")
        return dict(data)



def build_unlocked_research_export(runtime) -> dict[str, Any]:
    """Serialize the canonical runtime's current unlocked evidence without widening scope."""
    from runtime_engine.scripture_archive_runtime.research_export import build_research_export

    export = build_research_export(
        runtime.evidence,
        workspace_id="runtime-unlocked",
        title="Експорт дослідження",
        provenance={"truth_owner": "D5/runtime"},
        include_locked_evidence=False,
    )
    payload = dict(export.payload)
    return {
        "export": {
            "schema": payload.get("schema"),
            "workspace_id": payload.get("workspace_id"),
            "title": payload.get("title"),
            "evidence_scope": payload.get("evidence_scope"),
            "counts": {
                "claims": len(payload.get("claims") or []),
                "evidence": len(payload.get("evidence") or []),
                "relations": len(payload.get("relations") or []),
            },
            "json": export.to_json(),
            "markdown": export.to_markdown(),
            "html": export.to_html(),
        }
    }


def build_runtime_gateway(repo_root: Path, platform_store_root: Path) -> RuntimeBackedPlayerGateway:
    """Build the exact D5 runtime against the same canonical repository checkout."""
    from runtime_engine.scripture_archive_runtime.application import RuntimeApplication
    from runtime_engine.scripture_archive_runtime.content import ContentRepository
    from runtime_engine.scripture_archive_runtime.persistence import PersistenceStore
    from scripture_archive_platform.content.loader import CanonicalContentLoader

    loader = CanonicalContentLoader(Path(repo_root))
    loader._ensure()
    nodes = [dict(node) for node in loader._nodes.values()]
    content = ContentRepository(nodes, adapt_legacy=True, lane="DEV-A")
    runtime_store = PersistenceStore(Path(platform_store_root) / "runtime-v2")
    runtime = RuntimeApplication(content, persistence=runtime_store)
    return RuntimeBackedPlayerGateway(
        runtime.handle,
        research_export_invoke=lambda: build_unlocked_research_export(runtime),
    )
