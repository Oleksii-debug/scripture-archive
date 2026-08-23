from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Mapping

from .memory import PlayerMemoryService
from .models import PlayerMemory, Session
from .persistence import PersistenceStore
from .state_codec import restore_memory, serialize_memory


@dataclass(frozen=True)
class RestoredPlayerState:
    session: Session
    current_node_id: str | None
    schema_version: int


class PlayerStateRepository:
    """High-level DEV06 persistence adapter for memory/session lifecycle.

    Runtime/application code should use this boundary instead of reconstructing a
    restored session in-place. It preserves unrelated persisted settings/keymap/
    drafts/accessibility fields while serializing player memory.
    """

    def __init__(
        self,
        store: PersistenceStore,
        *,
        memory_service: PlayerMemoryService | None = None,
    ) -> None:
        self.store = store
        self.memory_service = memory_service or PlayerMemoryService()
        self._base_state: dict[str, Any] = {}

    def restore(
        self,
        memory: PlayerMemory,
        *,
        session_id: str | None = None,
        now: datetime | None = None,
    ) -> RestoredPlayerState:
        state = self.store.load()
        self._base_state = dict(state)
        restore_memory(memory, state)
        session = self.memory_service.start_session(memory, session_id=session_id, now=now)
        self.memory_service.refresh_due_states(memory, now=now)
        return RestoredPlayerState(
            session=session,
            current_node_id=str(state["current_node_id"]) if state.get("current_node_id") else None,
            schema_version=int(state["schema_version"]),
        )

    def save(
        self,
        memory: PlayerMemory,
        session: Session,
        current_node_id: str | None,
    ) -> Mapping[str, Any]:
        payload = serialize_memory(
            memory,
            session,
            current_node_id,
            base_state=self._base_state,
        )
        self.store.save(payload)
        self._base_state = dict(payload)
        return payload

    def export_state(self, destination: str | Path) -> Path:
        return self.store.export_state(destination)

    def import_state(
        self,
        source: str | Path,
        memory: PlayerMemory,
        *,
        session_id: str | None = None,
        now: datetime | None = None,
    ) -> RestoredPlayerState:
        self.store.import_state(source)
        return self.restore(memory, session_id=session_id, now=now)

    def delete_progress(
        self,
        memory: PlayerMemory,
        *,
        session_id: str | None = None,
        now: datetime | None = None,
    ) -> RestoredPlayerState:
        self.store.delete_progress()
        return self.restore(memory, session_id=session_id, now=now)
