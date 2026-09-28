from __future__ import annotations

import sys
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
CANCEL_PENDING_UPDATE_COMMAND = "application_update.cancel_pending"


class NativePendingUpdateLayer:
    """Expose fixed-path staged-update recovery without browser filesystem authority.

    Status re-opens the host-owned journal, re-verifies exact staged bytes, checks
    same-publisher Authenticode again, then re-verifies exact bytes after that OS
    signature inspection. Cancellation removes only the fixed journal authority;
    staged executable bytes remain inert and are never recursively deleted here.
    """

    def __init__(
        self,
        app: Any,
        repo_root: Path,
        staging_root: Path,
        *,
        current_version: str,
        authenticity_verifier: Callable[[Path], bool] | None = None,
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

    def handle(self, request: Any) -> dict[str, Any]:
        if not isinstance(request, dict) or request.get("command") not in {
            PENDING_UPDATE_STATUS_COMMAND,
            CANCEL_PENDING_UPDATE_COMMAND,
        }:
            return self._app.handle(request)
        rid = str(request.get("request_id", "invalid"))
        try:
            rid, command, payload = validate_request_shape(request)
            if command not in {
                PENDING_UPDATE_STATUS_COMMAND,
                CANCEL_PENDING_UPDATE_COMMAND,
            } or payload:
                raise ValueError("pending update recovery requires an empty payload")
        except ValueError as exc:
            return error_response(rid, "VALIDATION_ERROR", str(exc))

        try:
            inspect_pending_update, staged_artifact_path, discard_pending_update = (
                self._load_pending_core()
            )

            if command == CANCEL_PENDING_UPDATE_COMMAND:
                removed = discard_pending_update(self._staging_root)
                return ok_response(
                    rid,
                    {
                        "pending": False,
                        "status": "cancelled" if removed else "none",
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

            # Bind the positive OS signature result back to bytes that still satisfy
            # the fixed pending journal after OS signature inspection.
            pending = inspect_pending_update(
                self._staging_root,
                current_version=self._current_version,
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
