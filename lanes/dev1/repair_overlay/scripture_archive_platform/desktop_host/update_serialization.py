from __future__ import annotations

import threading
from typing import Any

from scripture_archive_platform.desktop_host.pending_update import (
    CANCEL_PENDING_UPDATE_COMMAND,
    PENDING_UPDATE_STATUS_COMMAND,
    PREPARE_APPLY_COMMAND,
)
from scripture_archive_platform.desktop_host.update_application import (
    STAGE_UPDATE_COMMAND,
    UPDATE_COMMAND,
)


_UPDATE_COMMANDS = frozenset(
    {
        UPDATE_COMMAND,
        STAGE_UPDATE_COMMAND,
        PENDING_UPDATE_STATUS_COMMAND,
        PREPARE_APPLY_COMMAND,
        CANCEL_PENDING_UPDATE_COMMAND,
    }
)


class SerializedApplicationUpdateLayer:
    """Serialize all packaged update/recovery commands in one host process.

    Staging, recovery and apply-handoff preparation share fixed durable update state.
    Without one outer operation lock these commands could race and make the UI report
    authority that was immediately superseded. The lock is deliberately host-local:
    filesystem, byte-identity and signature validation remain fail-closed authorities.
    """

    def __init__(self, app: Any) -> None:
        self._app = app
        self._lock = threading.RLock()

    def handle(self, request: Any) -> dict[str, Any]:
        if not isinstance(request, dict) or request.get("command") not in _UPDATE_COMMANDS:
            return self._app.handle(request)
        with self._lock:
            return self._app.handle(request)
