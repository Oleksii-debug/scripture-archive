from __future__ import annotations

from pathlib import Path

from scripture_archive_platform.application.service import PlatformApplication
from scripture_archive_platform.persistence.store import JsonFileStore


class WitnessMatrixPlatformApplication(PlatformApplication):
    """Current packaged application plus one read-only canonical Witness Matrix query."""

    def _dispatch(self, cmd, payload):
        if cmd == "research.get_witness_matrix":
            if payload:
                raise ValueError("research.get_witness_matrix accepts an empty payload")
            if not self.player_gateway:
                raise ValueError("Witness Matrix requires canonical runtime")
            return self.player_gateway.get_witness_matrix()
        return super()._dispatch(cmd, payload)

    def _bootstrap(self):
        data = super()._bootstrap()
        data["capabilities"]["witness_matrix"] = bool(self.player_gateway)
        return data


def build_default_application(repo_root: Path | None = None, store_root: Path | None = None):
    """Build the packaged app without altering legacy PlatformApplication semantics."""
    if repo_root is None:
        repo_root = Path(__file__).resolve().parents[3]
    repo_root = Path(repo_root)
    store = JsonFileStore(store_root) if store_root else None
    effective_store = store or JsonFileStore(JsonFileStore.default_root())
    runtime_application = repo_root / "runtime_engine" / "scripture_archive_runtime" / "application.py"
    if runtime_application.exists():
        from scripture_archive_platform.application.runtime_gateway import build_runtime_gateway

        gateway = build_runtime_gateway(repo_root, effective_store.root)
        return WitnessMatrixPlatformApplication(repo_root, store=effective_store, player_gateway=gateway)
    return WitnessMatrixPlatformApplication(repo_root, store=effective_store)