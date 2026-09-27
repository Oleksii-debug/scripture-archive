from __future__ import annotations

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
    """Wrap the platform app with one packaged-Windows-only update command.

    All ordinary commands remain owned by the wrapped application. The browser can
    request update selection only with an empty payload; local paths are created by
    the native picker and are never serialized into a successful or failed response.
    Hash/size verification remains independent from the optional fail-closed Windows
    same-publisher Authenticode signal. Nothing is installed or executed here.
    """

    def __init__(
        self,
        app: Any,
        repo_root: Path,
        selector: Callable[[], tuple[str, str] | None],
        *,
        current_version: str,
        authenticity_verifier: Callable[[Path], bool] | None = None,
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

    def handle(self, request: Any) -> dict[str, Any]:
        if not isinstance(request, dict) or request.get("command") != UPDATE_COMMAND:
            return self._app.handle(request)
        rid = str(request.get("request_id", "invalid"))
        try:
            rid, command, payload = validate_request_shape(request)
            if command != UPDATE_COMMAND or payload:
                raise ValueError("application update verification requires an empty payload")
            selection = self._selector()
            if selection is None:
                return ok_response(
                    rid,
                    {
                        "verified": False,
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
            ApplicationUpdateManifest, verify_local_update = self._load_update_core()
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

            return ok_response(
                rid,
                {
                    "verified": True,
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

    def _load_update_core(self) -> tuple[Any, Any]:
        root_text = str(self._repo_root)
        if root_text not in sys.path:
            sys.path.insert(0, root_text)
        from runtime_engine.scripture_archive_runtime.application_update import (
            ApplicationUpdateManifest,
            verify_local_update,
        )

        return ApplicationUpdateManifest, verify_local_update

    @staticmethod
    def _read_manifest_fail_closed(path: Path) -> bytes:
        before = path.lstat()
        if stat.S_ISLNK(before.st_mode) or not stat.S_ISREG(before.st_mode):
            raise ValueError("update manifest must be a regular non-symlink file")
        if before.st_size <= 0 or before.st_size > MAX_UPDATE_MANIFEST_BYTES:
            raise ValueError("update manifest is empty or exceeds the size limit")
        payload = path.read_bytes()
        after = path.lstat()
        before_identity = (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns)
        after_identity = (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns)
        if before_identity != after_identity or len(payload) != before.st_size:
            raise ValueError("update manifest changed while being read")
        return payload