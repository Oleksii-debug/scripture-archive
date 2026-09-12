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

    def __init__(self, runtime_invoke, *, runtime_application=None, loader=None):
        self.adapter = RuntimeEngineContractAdapter(runtime_invoke)
        self._runtime_application = runtime_application
        self._loader = loader

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

    def get_daily_case(self) -> dict[str, Any]:
        """Project Daily Case without adding a second runtime command or mutating player state."""
        if self._runtime_application is None or self._loader is None:
            raise RuntimeGatewayError("Daily Case requires the canonical runtime application and content loader")
        from scripture_archive_platform.application.daily_case_projection import DailyCaseProjection

        return DailyCaseProjection(self._runtime_application, self._loader).response()


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
    return RuntimeBackedPlayerGateway(runtime.handle, runtime_application=runtime, loader=loader)
