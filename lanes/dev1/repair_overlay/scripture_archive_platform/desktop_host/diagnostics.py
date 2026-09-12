from __future__ import annotations

import json
import re
import stat
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from scripture_archive_platform.transport.contracts import (
    error_response,
    ok_response,
    validate_request_shape,
)

DIAGNOSTICS_COMMAND = "diagnostics.get_report"
BUILD_IDENTITY_RELATIVE_PATH = Path("r06_platform") / "build_identity.json"
MAX_BUILD_IDENTITY_BYTES = 1024
_BUILD_SHA = re.compile(r"^[0-9a-f]{40}$")


@dataclass(frozen=True)
class RuntimePersistenceView:
    """Path-only view for diagnostics; constructing it never creates persistence state."""

    root: Path

    @property
    def state_path(self) -> Path:
        return self.root / "state.json"

    @property
    def backup_path(self) -> Path:
        return self.root / "state.json.bak"

    @property
    def backups(self) -> Path:
        return self.root / "backups"


class NativeDiagnosticsLayer:
    """Expose one read-only packaged Diagnostics command over the allowlisted bridge.

    Browser input can neither choose a filesystem path nor request recovery. The
    persistence location and packaged build identity are both native-owned.
    Ordinary commands are delegated unchanged to the wrapped application.
    """

    def __init__(
        self,
        app: Any,
        runtime_root: Path,
        persistence_root: Path,
        *,
        current_version: str,
        runtime_api_version: str = "runtime.v1",
        core_root: Path | None = None,
    ) -> None:
        self._app = app
        self._runtime_root = Path(runtime_root)
        self._persistence_root = Path(persistence_root)
        self._current_version = current_version
        self._runtime_api_version = runtime_api_version
        self._core_root = Path(core_root) if core_root is not None else self._runtime_root

    def handle(self, request: Any) -> dict[str, Any]:
        if not isinstance(request, dict) or request.get("command") != DIAGNOSTICS_COMMAND:
            return self._app.handle(request)

        rid = str(request.get("request_id", "invalid"))
        try:
            rid, command, payload = validate_request_shape(request)
            if command != DIAGNOSTICS_COMMAND or payload:
                raise ValueError("diagnostics.get_report accepts an empty payload only")
        except ValueError as exc:
            return error_response(rid, "VALIDATION_ERROR", str(exc))

        try:
            DiagnosticsIdentity, inspect_persistence, build_support_snapshot = self._load_core()
            identity = DiagnosticsIdentity(
                product_version=self._current_version,
                runtime_api_version=self._runtime_api_version,
                build_sha=self._load_packaged_build_sha(),
            )
            report = inspect_persistence(RuntimePersistenceView(self._persistence_root), identity)
            return ok_response(
                rid,
                {
                    "read_only": True,
                    "recovery_execution": "not_performed",
                    "report": report.as_dict(),
                    "support_snapshot": build_support_snapshot(report),
                },
            )
        except Exception:
            # Never serialize exception strings: path-bearing OS errors and local
            # environment details are intentionally excluded from the web surface.
            return error_response(
                rid,
                "DIAGNOSTICS_UNAVAILABLE",
                "Packaged diagnostics failed closed without exposing local details.",
            )

    def _load_core(self) -> tuple[Any, Any, Any]:
        root_text = str(self._core_root)
        if root_text not in sys.path:
            sys.path.insert(0, root_text)
        from runtime_engine.scripture_archive_runtime.diagnostics import (
            DiagnosticsIdentity,
            build_support_snapshot,
            inspect_persistence,
        )

        return DiagnosticsIdentity, inspect_persistence, build_support_snapshot

    def _load_packaged_build_sha(self) -> str:
        path = self._runtime_root / BUILD_IDENTITY_RELATIVE_PATH
        before = path.lstat()
        if stat.S_ISLNK(before.st_mode) or not stat.S_ISREG(before.st_mode):
            raise ValueError("packaged build identity must be a regular non-symlink file")
        if before.st_size <= 0 or before.st_size > MAX_BUILD_IDENTITY_BYTES:
            raise ValueError("packaged build identity has an invalid size")

        raw = path.read_bytes()
        after = path.lstat()
        before_identity = (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns)
        after_identity = (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns)
        if before_identity != after_identity or len(raw) != before.st_size:
            raise ValueError("packaged build identity changed while being read")

        def no_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
            result: dict[str, Any] = {}
            for key, value in pairs:
                if key in result:
                    raise ValueError("duplicate packaged build identity key")
                result[key] = value
            return result

        data = json.loads(raw.decode("utf-8", errors="strict"), object_pairs_hook=no_duplicate_keys)
        if not isinstance(data, dict) or set(data) != {"build_sha"}:
            raise ValueError("invalid packaged build identity schema")
        build_sha = data["build_sha"]
        if not isinstance(build_sha, str) or not _BUILD_SHA.fullmatch(build_sha):
            raise ValueError("invalid packaged build SHA")
        return build_sha
