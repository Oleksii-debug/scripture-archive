from __future__ import annotations

import threading
from pathlib import Path
from typing import Any, Callable, Mapping

from scripture_archive_platform.transport.runtime_compat import RuntimeEngineContractAdapter


class RuntimeGatewayError(ValueError):
    pass


class RuntimeBackedPlayerGateway:
    """Map scripture.transport.v1 player operations to the canonical runtime.v1 engine.

    Presentation remains a platform concern. Grading, branching, mastery, player
    memory, evidence unlock state and player persistence are runtime-owned.

    When bound to the in-process runtime, player.next also carries an internal
    expected-current-node precondition encoded by PlatformApplication's
    ``next-<node_id>`` request id. The gateway checks that precondition while
    holding the same lock used for the runtime invocation, then still sends an
    empty runtime.v1 ``next`` payload. This preserves the no-caller-target
    runtime contract while making stale/replayed packaged Next requests fail
    closed instead of advancing a newly loaded task.
    """

    def __init__(
        self,
        runtime_invoke,
        *,
        current_node_getter: Callable[[], str | None] | None = None,
        runtime_application=None,
        loader=None,
    ):
        self.adapter = RuntimeEngineContractAdapter(runtime_invoke)
        self._current_node_getter = current_node_getter
        self._runtime_application = runtime_application
        self._loader = loader
        self._runtime_lock = threading.RLock()

    @staticmethod
    def _request(command: str, payload: Mapping[str, Any], request_id: str) -> dict[str, Any]:
        return {
            "api_version": "scripture.transport.v1",
            "request_id": request_id,
            "command": command,
            "payload": dict(payload),
        }

    def _validate_next_context(self, request_id: str) -> None:
        if self._current_node_getter is None:
            return
        prefix = "next-"
        if not isinstance(request_id, str) or not request_id.startswith(prefix) or len(request_id) == len(prefix):
            raise RuntimeGatewayError("player.next requires internal current-node context")
        expected = request_id[len(prefix):]
        current = self._current_node_getter()
        if current != expected:
            raise RuntimeGatewayError("stale player.next current-node context")

    def invoke(self, command: str, payload: Mapping[str, Any] | None = None, *, request_id: str = "dev-a-runtime") -> dict[str, Any]:
        with self._runtime_lock:
            if command == "player.next":
                self._validate_next_context(request_id)
            response = self.adapter.invoke_runtime(self._request(command, payload or {}, request_id))
            return dict(response)

    def get_daily_case(self) -> dict[str, Any]:
        """Project Daily Case without adding a second runtime command or mutating player state."""
        if self._runtime_application is None or self._loader is None:
            raise RuntimeGatewayError("Daily Case requires the canonical runtime application and content loader")
        from scripture_archive_platform.application.daily_case_projection import DailyCaseProjection

        return DailyCaseProjection(self._runtime_application, self._loader).response()

    def get_witness_matrix(self) -> dict[str, Any]:
        """Project a read-only source-local Witness Matrix from canonical unlocked evidence."""
        if self._runtime_application is None:
            raise RuntimeGatewayError("Witness Matrix requires the canonical runtime application")

        from runtime_engine.scripture_archive_runtime.evidence_provenance import resolve_evidence_witness
        from runtime_engine.scripture_archive_runtime.witness_matrix import build_witness_matrix

        runtime = self._runtime_application.evidence
        witnesses: set[str] = set()
        for evidence_id in sorted(runtime.unlocked):
            record = runtime.evidence.get(evidence_id)
            if record is None:
                continue
            witness = resolve_evidence_witness(record)
            if witness is not None:
                witnesses.add(witness)

        available = sorted(witnesses)
        if len(available) < 2:
            return {
                "schema": "scripture.research.witness-matrix.v1",
                "read_only": True,
                "available_witnesses": available,
                "matrix": None,
                "linear": [
                    "Witness Matrix",
                    "At least two source-safe unlocked witnesses are required.",
                    "No witness, contradiction, chronology, or source claim is inferred from missing data.",
                ],
                "truth_owner": "D5/runtime",
            }

        matrix = build_witness_matrix(runtime, witnesses=available)
        return {
            "schema": "scripture.research.witness-matrix.v1",
            "read_only": True,
            "available_witnesses": available,
            "matrix": matrix.to_dict(),
            "linear": matrix.linearize(),
            "truth_owner": "D5/runtime",
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
        current_node_getter=lambda: runtime.current_node_id,
        runtime_application=runtime,
        loader=loader,
    )