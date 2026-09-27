from __future__ import annotations

import os
import stat
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

UPDATE_COMMAND = "application_update.select_verify"
STAGE_UPDATE_COMMAND = "application_update.select_verify_stage"
MAX_UPDATE_MANIFEST_BYTES = 16 * 1024


class NativeUpdateFileSelector:
    """Native-only two-step picker. Selected paths never become web payload/data."""

    def __init__(self, webview_module: Any):
        self._webview = webview_module
        self._window: Any | None = None

    def bind_window(self, window: Any) -> None:
        self._window = window

    def __call__(self) -> tuple[str, str] | None:
        if self._window is None:
            raise RuntimeError("native update picker is not bound to a window")
        dialog_kind = self._open_dialog_kind()
        manifest = self._one_path(
            self._window.create_file_dialog(
                dialog_kind,
                allow_multiple=False,
                file_types=("Scripture update manifest (*.json)", "JSON files (*.json)"),
            )
        )
        if manifest is None:
            return None
        artifact = self._one_path(
            self._window.create_file_dialog(
                dialog_kind,
                allow_multiple=False,
                file_types=("Scripture update package (*.*)",),
            )
        )
        if artifact is None:
            return None
        return manifest, artifact

    def _open_dialog_kind(self) -> Any:
        enum = getattr(self._webview, "FileDialog", None)
        if enum is not None and hasattr(enum, "OPEN"):
            return enum.OPEN
        legacy = getattr(self._webview, "OPEN_DIALOG", None)
        if legacy is None:
            raise RuntimeError("pywebview open-file dialog API is unavailable")
        return legacy

    @staticmethod
    def _one_path(value: Any) -> str | None:
        if value in (None, "", [], ()):
            return None
        if isinstance(value, str):
            return value
        if isinstance(value, (list, tuple)) and len(value) == 1 and isinstance(value[0], str):
            return value[0]
        raise RuntimeError("native file picker returned an unexpected selection")


class NativeApplicationUpdateLayer:
    """Wrap the platform app with packaged-Windows-only update commands.

    All ordinary commands remain owned by the wrapped application. The browser can
    request update selection only with an empty payload; local paths are created by
    the native picker and are never serialized into a successful or failed response.

    Verification proves exact manifest bytes independently from the optional
    same-publisher Authenticode signal. Trusted staging is a separate command and is
    allowed only after that Authenticode signal is positive. Staging copies and
    re-verifies bytes in host-owned state; it still does not install, execute,
    replace, restart, or roll back the application.
    """

    def __init__(
        self,
        app: Any,
        repo_root: Path,
        selector: Callable[[], tuple[str, str] | None],
        *,
        current_version: str,
        authenticity_verifier: Callable[[Path], bool] | None = None,
        staging_root: Path | None = None,
    ) -> None:
        self._app = app
        self._repo_root = Path(repo_root).resolve()
        self._selector = selector
        self._current_version = current_version
        self._authenticity_verifier = (
            authenticity_verifier
            if authenticity_verifier is not None
            else self._default_authenticity_verifier
        )
        self._staging_root = Path(staging_root) if staging_root is not None else None

    def handle(self, request: Any) -> dict[str, Any]:
        if not isinstance(request, dict) or request.get("command") not in {
            UPDATE_COMMAND,
            STAGE_UPDATE_COMMAND,
        }:
            return self._app.handle(request)
        rid = str(request.get("request_id", "invalid"))
        try:
            rid, command, payload = validate_request_shape(request)
            if command not in {UPDATE_COMMAND, STAGE_UPDATE_COMMAND} or payload:
                raise ValueError("application update verification requires an empty payload")
            selection = self._selector()
            if selection is None:
                return ok_response(
                    rid,
                    {
                        "verified": False,
                        "staged": False,
                        "status": "cancelled",
                        "message": "Вибір локального оновлення скасовано.",
                    },
                )
            if (
                not isinstance(selection, tuple)
                or len(selection) != 2
                or not all(isinstance(item, str) and item for item in selection)
            ):
                raise ValueError("native update picker returned an invalid selection")
            manifest_path, artifact_path = map(Path, selection)
            manifest_payload = self._read_manifest_fail_closed(manifest_path)
            ApplicationUpdateManifest, verify_local_update, stage_local_update = self._load_update_core()
            manifest = ApplicationUpdateManifest.from_json(manifest_payload)
            verified = verify_local_update(
                manifest,
                artifact_path,
                current_version=self._current_version,
            )

            authenticity_verified = False
            try:
                authenticity_verified = bool(self._authenticity_verifier(artifact_path))
            except Exception:
                authenticity_verified = False
            authenticity = "not_proven_by_local_hash_verification"
            if authenticity_verified:
                # Bind the positive signature result to bytes that still satisfy the
                # exact manifest after OS signature inspection. Failure here aborts
                # the whole request rather than returning stale `verified=true`.
                verified = verify_local_update(
                    manifest,
                    artifact_path,
                    current_version=self._current_version,
                )
                authenticity = "same_publisher_authenticode_verified"

            if command == STAGE_UPDATE_COMMAND:
                if not authenticity_verified:
                    return error_response(
                        rid,
                        "UPDATE_AUTHENTICITY_REQUIRED",
                        "Trusted staging requires a valid same-publisher Authenticode signature.",
                    )
                if self._staging_root is None:
                    return error_response(
                        rid,
                        "UPDATE_STAGING_UNAVAILABLE",
                        "Trusted application update staging is unavailable.",
                    )
                staged = stage_local_update(
                    manifest,
                    artifact_path,
                    self._staging_root,
                    current_version=self._current_version,
                    same_publisher_authenticode_verified=True,
                )
                return ok_response(
                    rid,
                    {
                        "verified": True,
                        "staged": True,
                        "status": staged.status,
                        "product_id": staged.product_id,
                        "target_platform": staged.target_platform,
                        "current_version": staged.current_version,
                        "target_version": staged.target_version,
                        "source_head": staged.source_head,
                        "artifact_name": staged.artifact_name,
                        "artifact_size": staged.artifact_size,
                        "artifact_sha256": staged.artifact_sha256,
                        "authenticity": staged.authenticity,
                        "installation_performed": False,
                    },
                )

            return ok_response(
                rid,
                {
                    "verified": True,
                    "staged": False,
                    "status": "verified",
                    "product_id": verified.product_id,
                    "target_platform": verified.target_platform,
                    "current_version": verified.current_version,
                    "target_version": verified.target_version,
                    "source_head": verified.source_head,
                    "artifact_name": verified.artifact_name,
                    "artifact_size": verified.artifact_size,
                    "artifact_sha256": verified.artifact_sha256,
                    "authenticity": authenticity,
                },
            )
        except ValueError as exc:
            return error_response(rid, "VALIDATION_ERROR", str(exc))
        except OSError:
            return error_response(
                rid,
                "UPDATE_FILE_ERROR",
                "Selected local update files could not be read safely.",
            )
        except Exception:
            return error_response(
                rid,
                "UPDATE_VERIFY_FAILED",
                "Local application update verification failed closed.",
            )

    def _default_authenticity_verifier(self, candidate: Path) -> bool:
        return verify_same_publisher_authenticode(Path(sys.executable), candidate)

    def _load_update_core(self) -> tuple[Any, Any, Any]:
        root_text = str(self._repo_root)
        if root_text not in sys.path:
            sys.path.insert(0, root_text)
        from runtime_engine.scripture_archive_runtime.application_update import (
            ApplicationUpdateManifest,
            verify_local_update,
        )
        from runtime_engine.scripture_archive_runtime.application_update_staging import (
            stage_local_update,
        )

        return ApplicationUpdateManifest, verify_local_update, stage_local_update

    @staticmethod
    def _read_manifest_fail_closed(path: Path) -> bytes:
        before = path.lstat()
        if stat.S_ISLNK(before.st_mode) or not stat.S_ISREG(before.st_mode):
            raise ValueError("update manifest must be a regular non-symlink file")
        if before.st_size <= 0 or before.st_size > MAX_UPDATE_MANIFEST_BYTES:
            raise ValueError("update manifest is empty or exceeds the size limit")
        before_identity = (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns)

        with path.open("rb") as handle:
            opened = os.fstat(handle.fileno())
            opened_identity = (
                opened.st_dev,
                opened.st_ino,
                opened.st_size,
                opened.st_mtime_ns,
            )
            if opened_identity != before_identity or not stat.S_ISREG(opened.st_mode):
                raise ValueError("update manifest changed before being read")
            payload = handle.read(MAX_UPDATE_MANIFEST_BYTES + 1)
            opened_after = os.fstat(handle.fileno())
            opened_after_identity = (
                opened_after.st_dev,
                opened_after.st_ino,
                opened_after.st_size,
                opened_after.st_mtime_ns,
            )
            if opened_after_identity != opened_identity:
                raise ValueError("update manifest changed while being read")

        after = path.lstat()
        after_identity = (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns)
        if (
            after_identity != before_identity
            or len(payload) != before.st_size
            or len(payload) > MAX_UPDATE_MANIFEST_BYTES
        ):
            raise ValueError("update manifest changed while being read")
        return payload
