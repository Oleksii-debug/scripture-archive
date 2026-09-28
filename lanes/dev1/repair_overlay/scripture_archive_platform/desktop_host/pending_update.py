from __future__ import annotations

import sys
import threading
from pathlib import Path
from typing import Any, Callable

from scripture_archive_platform.desktop_host.authenticode import (
    verify_same_publisher_authenticode,
)
from scripture_archive_platform.transport.contracts import (
    error_response,
    ok_response,
    validate_request_shape,
)


PENDING_UPDATE_STATUS_COMMAND = "application_update.pending_status"
PREPARE_APPLY_COMMAND = "application_update.prepare_apply"
APPLY_AND_RESTART_COMMAND = "application_update.apply_and_restart"
CANCEL_PENDING_UPDATE_COMMAND = "application_update.cancel_pending"
_PENDING_COMMANDS = frozenset(
    {
        PENDING_UPDATE_STATUS_COMMAND,
        PREPARE_APPLY_COMMAND,
        APPLY_AND_RESTART_COMMAND,
        CANCEL_PENDING_UPDATE_COMMAND,
    }
)
_UPDATE_COMMAND_FAMILY = frozenset(
    {
        "application_update.select_verify",
        "application_update.select_verify_stage",
        PENDING_UPDATE_STATUS_COMMAND,
        PREPARE_APPLY_COMMAND,
        APPLY_AND_RESTART_COMMAND,
        CANCEL_PENDING_UPDATE_COMMAND,
    }
)


class NativePendingUpdateLayer:
    """Expose serialized fixed-path staged-update recovery and apply execution.

    The outer packaged-host lock serializes the complete application-update command
    family so staging, status, prepare-apply, execution and cancellation cannot
    publish contradictory durable state. Execution remains two-step: the browser may
    request only an empty-payload action after a matching durable apply handoff exists;
    all paths, process identity, updater identity and shutdown behavior stay native.
    """

    def __init__(
        self,
        app: Any,
        repo_root: Path,
        staging_root: Path,
        *,
        current_version: str,
        authenticity_verifier: Callable[[Path], bool] | None = None,
        apply_executor: Callable[[], int] | None = None,
        shutdown_request: Callable[[], None] | None = None,
    ) -> None:
        self._app = app
        self._repo_root = Path(repo_root).resolve()
        self._staging_root = Path(staging_root)
        self._current_version = current_version
        self._authenticity_verifier = (
            authenticity_verifier
            if authenticity_verifier is not None
            else self._default_authenticity_verifier
        )
        self._apply_executor = apply_executor
        self._shutdown_request = shutdown_request
        self._operation_lock = threading.RLock()

    def bind_apply_execution(
        self,
        apply_executor: Callable[[], int],
        shutdown_request: Callable[[], None],
    ) -> None:
        """Bind host-owned launch/shutdown callbacks after the native window exists."""

        if not callable(apply_executor):
            raise ValueError("apply executor must be callable")
        if not callable(shutdown_request):
            raise ValueError("shutdown request must be callable")
        with self._operation_lock:
            self._apply_executor = apply_executor
            self._shutdown_request = shutdown_request

    def handle(self, request: Any) -> dict[str, Any]:
        if not isinstance(request, dict):
            return self._app.handle(request)
        command_name = request.get("command")
        if command_name not in _UPDATE_COMMAND_FAMILY:
            return self._app.handle(request)
        with self._operation_lock:
            if command_name not in _PENDING_COMMANDS:
                return self._app.handle(request)
            return self._handle_pending(request)

    def _handle_pending(self, request: dict[str, Any]) -> dict[str, Any]:
        rid = str(request.get("request_id", "invalid"))
        try:
            rid, command, payload = validate_request_shape(request)
            if command not in _PENDING_COMMANDS or payload:
                raise ValueError("pending update recovery requires an empty payload")
        except ValueError as exc:
            return error_response(rid, "VALIDATION_ERROR", str(exc))

        try:
            inspect_pending_update, staged_artifact_path, discard_pending_update = (
                self._load_pending_core()
            )
            prepare_apply_handoff, inspect_apply_handoff, discard_apply_handoff = (
                self._load_apply_core()
            )

            if command == CANCEL_PENDING_UPDATE_COMMAND:
                apply_removed = discard_apply_handoff(self._staging_root)
                removed = discard_pending_update(self._staging_root)
                return ok_response(
                    rid,
                    {
                        "pending": False,
                        "status": "cancelled" if removed or apply_removed else "none",
                        "apply_handoff_removed": apply_removed,
                        "staged_bytes_removed": False,
                        "installation_performed": False,
                    },
                )

            pending = inspect_pending_update(
                self._staging_root,
                current_version=self._current_version,
            )
            if pending is None:
                return ok_response(
                    rid,
                    {
                        "pending": False,
                        "status": "none",
                        "installation_performed": False,
                    },
                )

            candidate = staged_artifact_path(self._staging_root, pending)
            try:
                authenticity_verified = bool(self._authenticity_verifier(candidate))
            except Exception:
                authenticity_verified = False
            if not authenticity_verified:
                return error_response(
                    rid,
                    "UPDATE_PENDING_AUTHENTICITY_INVALID",
                    "Pending update no longer has valid same-publisher Authenticode.",
                )

            pending = inspect_pending_update(
                self._staging_root,
                current_version=self._current_version,
            )

            if command == PREPARE_APPLY_COMMAND:
                rebound = prepare_apply_handoff(
                    self._staging_root,
                    current_version=self._current_version,
                )
                if rebound != pending:
                    return error_response(
                        rid,
                        "UPDATE_APPLY_HANDOFF_INVALID",
                        "Apply handoff did not remain bound to the verified pending update.",
                    )
                return ok_response(
                    rid,
                    {
                        "pending": True,
                        "status": "apply_ready",
                        "product_id": rebound.product_id,
                        "target_platform": rebound.target_platform,
                        "current_version": rebound.current_version,
                        "target_version": rebound.target_version,
                        "source_head": rebound.source_head,
                        "artifact_name": rebound.artifact_name,
                        "artifact_size": rebound.artifact_size,
                        "artifact_sha256": rebound.artifact_sha256,
                        "authenticity": rebound.authenticity,
                        "installation_performed": False,
                        "restart_performed": False,
                    },
                )

            if command == APPLY_AND_RESTART_COMMAND:
                if not callable(self._apply_executor) or not callable(self._shutdown_request):
                    return error_response(
                        rid,
                        "UPDATE_EXECUTION_UNAVAILABLE",
                        "Packaged updater execution is unavailable in this host.",
                    )
                handoff = inspect_apply_handoff(
                    self._staging_root,
                    current_version=self._current_version,
                )
                if handoff is None or handoff != pending:
                    return error_response(
                        rid,
                        "UPDATE_APPLY_HANDOFF_REQUIRED",
                        "A current verified apply handoff is required before restart.",
                    )
                updater_pid = self._apply_executor()
                if not isinstance(updater_pid, int) or isinstance(updater_pid, bool) or updater_pid <= 0:
                    raise ValueError("packaged updater launch did not return a valid process id")
                self._shutdown_request()
                return ok_response(
                    rid,
                    {
                        "pending": True,
                        "status": "updater_started",
                        "product_id": handoff.product_id,
                        "target_platform": handoff.target_platform,
                        "current_version": handoff.current_version,
                        "target_version": handoff.target_version,
                        "source_head": handoff.source_head,
                        "artifact_name": handoff.artifact_name,
                        "artifact_size": handoff.artifact_size,
                        "artifact_sha256": handoff.artifact_sha256,
                        "authenticity": handoff.authenticity,
                        "installation_performed": False,
                        "updater_process_started": True,
                        "restart_requested": True,
                    },
                )

            return ok_response(
                rid,
                {
                    "pending": True,
                    "status": pending.status,
                    "product_id": pending.product_id,
                    "target_platform": pending.target_platform,
                    "current_version": pending.current_version,
                    "target_version": pending.target_version,
                    "source_head": pending.source_head,
                    "artifact_name": pending.artifact_name,
                    "artifact_size": pending.artifact_size,
                    "artifact_sha256": pending.artifact_sha256,
                    "authenticity": pending.authenticity,
                    "installation_performed": False,
                },
            )
        except ValueError:
            return error_response(
                rid,
                "UPDATE_PENDING_INVALID",
                "Pending application update state failed closed.",
            )
        except OSError:
            return error_response(
                rid,
                "UPDATE_PENDING_FILE_ERROR",
                "Pending application update state could not be read safely.",
            )
        except Exception:
            return error_response(
                rid,
                "UPDATE_PENDING_FAILED",
                "Pending application update recovery failed closed.",
            )

    def _default_authenticity_verifier(self, candidate: Path) -> bool:
        return verify_same_publisher_authenticode(Path(sys.executable), candidate)

    def _load_pending_core(self) -> tuple[Any, Any, Any]:
        root_text = str(self._repo_root)
        if root_text not in sys.path:
            sys.path.insert(0, root_text)
        from runtime_engine.scripture_archive_runtime.application_update_pending import (
            discard_pending_update,
            inspect_pending_update,
            staged_artifact_path,
        )

        return inspect_pending_update, staged_artifact_path, discard_pending_update

    def _load_apply_core(self) -> tuple[Any, Any, Any]:
        root_text = str(self._repo_root)
        if root_text not in sys.path:
            sys.path.insert(0, root_text)
        from runtime_engine.scripture_archive_runtime.application_update_apply import (
            discard_apply_handoff,
            inspect_apply_handoff,
            prepare_apply_handoff,
        )

        return prepare_apply_handoff, inspect_apply_handoff, discard_apply_handoff
