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
    Read-only dossier views are derived from that same runtime evidence instance.
    """

    def __init__(self, runtime_invoke, *, dossier_invoke=None):
        self.adapter = RuntimeEngineContractAdapter(runtime_invoke)
        self._dossier_invoke = dossier_invoke

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

    def get_dossier(self, subject_id: str, display_name: str, kind: str) -> dict[str, Any]:
        if self._dossier_invoke is None:
            raise RuntimeGatewayError("canonical runtime dossier view is unavailable")
        data = self._dossier_invoke(subject_id, display_name, kind)
        if not isinstance(data, Mapping):
            raise RuntimeGatewayError("canonical runtime dossier view must be an object")
        return dict(data)


def build_runtime_dossier(runtime, subject_id: str, display_name: str, kind: str) -> dict[str, Any]:
    """Build an unlocked-only dossier from the runtime-owned EvidenceRuntime."""
    from runtime_engine.scripture_archive_runtime.dossiers import (
        DossierAssembler,
        DossierKind,
        DossierSubject,
    )

    subject = DossierSubject(
        subject_id=subject_id,
        display_name=display_name,
        kind=DossierKind(kind),
    )
    view = DossierAssembler(runtime.evidence).build(subject, unlocked_only=True)
    dossier = view.to_dict()
    dossier["linear"] = list(view.linearize())
    dossier["evidence_scope"] = "unlocked_only"
    return {"dossier": dossier}


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
        dossier_invoke=lambda subject_id, display_name, kind: build_runtime_dossier(
            runtime, subject_id, display_name, kind
        ),
    )
