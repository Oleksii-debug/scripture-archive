from __future__ import annotations

from pathlib import Path
import sys
from typing import Any, Callable

from runtime_engine.scripture_archive_runtime.application_update_health import (
    commit_update_health_receipt,
)
from scripture_archive_platform.transport.contracts import (
    error_response,
    ok_response,
    validate_request_shape,
)


POST_UPDATE_HEALTH_COMMAND = "application_update.commit_post_restart_health"


class NativePostUpdateHealthLayer:
    """Commit rollback cleanup only after the relaunched packaged bridge is alive.

    The browser can request only this fixed empty-payload action.  Executable identity,
    current semantic version and staging root are host-owned constructor values.  The
    runtime health authority re-verifies exact installed and rollback bytes before any
    stale pending journal or rollback bytes are disarmed.
    """

    def __init__(
        self,
        app: Any,
        staging_root: Path,
        *,
        current_version: str,
        install_target: Path | None = None,
        commit_health: Callable[..., object | None] = commit_update_health_receipt,
    ) -> None:
        self._app = app
        self._staging_root = Path(staging_root)
        self._current_version = current_version
        self._install_target = Path(sys.executable if install_target is None else install_target)
        self._commit_health = commit_health

    def handle(self, request: Any) -> dict[str, Any]:
        if not isinstance(request, dict) or request.get("command") != POST_UPDATE_HEALTH_COMMAND:
            return self._app.handle(request)
        rid = str(request.get("request_id", "invalid"))
        try:
            rid, command, payload = validate_request_shape(request)
            if command != POST_UPDATE_HEALTH_COMMAND or payload:
                raise ValueError("post-update health commit requires an empty payload")
        except ValueError as exc:
            return error_response(rid, "VALIDATION_ERROR", str(exc))

        if not callable(self._commit_health):
            return error_response(
                rid,
                "UPDATE_HEALTH_UNAVAILABLE",
                "Post-update health authority is unavailable.",
            )
        try:
            receipt = self._commit_health(
                self._staging_root,
                current_version=self._current_version,
                install_target=self._install_target,
            )
        except Exception:
            return error_response(
                rid,
                "UPDATE_HEALTH_NOT_COMMITTED",
                "Updated application health could not be proven; rollback recovery remains preserved.",
            )

        if receipt is None:
            return ok_response(
                rid,
                {
                    "status": "none",
                    "health_committed": False,
                    "rollback_cleanup_performed": False,
                },
            )
        return ok_response(
            rid,
            {
                "status": "healthy",
                "health_committed": True,
                "rollback_cleanup_performed": True,
                "previous_version": receipt.previous_version,
                "target_version": receipt.target_version,
            },
        )
