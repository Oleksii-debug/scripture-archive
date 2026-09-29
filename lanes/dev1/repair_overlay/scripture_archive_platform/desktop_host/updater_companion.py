from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import stat
import shutil
from typing import Callable

from runtime_engine.scripture_archive_runtime.application_update import ApplicationUpdateError
from scripture_archive_platform.desktop_host.authenticode import (
    verify_same_publisher_authenticode,
)


UPDATER_COMPANION_SCHEMA = "scripture.updater-companion.v1"
UPDATER_COMPANION_MANIFEST = "updater_companion.json"
_UPDATER_SUFFIX = "-Updater.exe"
_COPY_CHUNK = 1024 * 1024
_REQUIRED_KEYS = frozenset(
    {
        "schema",
        "application_version",
        "source_head",
        "updater_name",
        "updater_size",
        "updater_sha256",
    }
)


def refresh_packaged_updater_companion(
    runtime_root: str | os.PathLike[str],
    installed_executable: str | os.PathLike[str],
    *,
    current_version: str,
    verify_same_publisher: Callable[[Path, Path], bool] = verify_same_publisher_authenticode,
    replace: Callable[[Path, Path], object] = os.replace,
) -> bool:
    """Publish the exact same-build updater sibling carried by the running app.

    This is a post-restart native-only repair step. The signed application bundle owns
    both the companion bytes and their strict manifest. Browser transport supplies no
    path, version, hash or process identity. Publication is same-directory atomic and
    happens before update health can discard the previous application rollback.

    Returns True when the installed updater changed and False when it already matched.
    """

    if not isinstance(current_version, str) or not current_version:
        raise ApplicationUpdateError("updater companion current version is invalid")
    if not callable(verify_same_publisher):
        raise ApplicationUpdateError("updater companion publisher verifier is required")
    if not callable(replace):
        raise ApplicationUpdateError("updater companion replace authority is required")

    app = Path(installed_executable)
    _require_regular_file(app, "installed application")
    if app.suffix.casefold() != ".exe":
        raise ApplicationUpdateError("installed application must have .exe suffix")

    companion_root = Path(runtime_root) / "r06_platform" / "updater_companion"
    _require_real_directory(companion_root, "updater companion directory")
    manifest = _read_manifest(companion_root / UPDATER_COMPANION_MANIFEST)

    if manifest["application_version"] != current_version:
        raise ApplicationUpdateError("updater companion version does not match running application")
    expected_name = f"{app.stem}-Updater{app.suffix}"
    if manifest["updater_name"] != expected_name:
        raise ApplicationUpdateError("updater companion name does not match installed application")

    companion = companion_root / expected_name
    _require_regular_file(companion, "embedded updater companion")
    expected_size = manifest["updater_size"]
    expected_sha = manifest["updater_sha256"]
    if companion.stat().st_size != expected_size or _sha256_file(companion) != expected_sha:
        raise ApplicationUpdateError("embedded updater companion bytes do not match manifest")
    if not _publisher_ok(verify_same_publisher, app, companion):
        raise ApplicationUpdateError("embedded updater companion is not same-publisher")

    installed_updater = app.with_name(expected_name)
    try:
        metadata = installed_updater.lstat()
    except FileNotFoundError:
        metadata = None
    except OSError as exc:
        raise ApplicationUpdateError("installed updater sibling is unavailable") from exc

    if metadata is not None:
        if stat.S_ISLNK(metadata.st_mode) or not stat.S_ISREG(metadata.st_mode):
            raise ApplicationUpdateError("installed updater sibling must be a regular non-symlink file")
        if (
            installed_updater.stat().st_size == expected_size
            and _sha256_file(installed_updater) == expected_sha
        ):
            if not _publisher_ok(verify_same_publisher, app, installed_updater):
                raise ApplicationUpdateError("installed updater sibling lost publisher identity")
            return False

    temporary = installed_updater.with_name(
        f".{installed_updater.stem}.refresh-{os.getpid()}.exe"
    )
    _prepare_temp_slot(temporary)
    try:
        _copy_exact(companion, temporary)
        if temporary.stat().st_size != expected_size or _sha256_file(temporary) != expected_sha:
            raise ApplicationUpdateError("temporary updater companion failed exact-byte verification")
        if not _publisher_ok(verify_same_publisher, app, temporary):
            raise ApplicationUpdateError("temporary updater companion failed publisher verification")
        try:
            replace(temporary, installed_updater)
        except Exception as exc:
            raise ApplicationUpdateError("installed updater companion could not be replaced atomically") from exc
        _fsync_directory(installed_updater.parent)
    finally:
        try:
            temporary.unlink()
        except FileNotFoundError:
            pass
        except OSError:
            pass

    _require_regular_file(installed_updater, "installed updater sibling")
    if installed_updater.stat().st_size != expected_size or _sha256_file(installed_updater) != expected_sha:
        raise ApplicationUpdateError("installed updater companion failed exact-byte readback")
    if not _publisher_ok(verify_same_publisher, app, installed_updater):
        raise ApplicationUpdateError("installed updater companion failed publisher readback")
    return True


def _read_manifest(path: Path) -> dict[str, object]:
    _require_regular_file(path, "updater companion manifest")
    try:
        raw = path.read_bytes()
    except OSError as exc:
        raise ApplicationUpdateError("updater companion manifest could not be read") from exc
    if len(raw) > 4096:
        raise ApplicationUpdateError("updater companion manifest is unexpectedly large")
    try:
        payload = json.loads(raw.decode("utf-8"), object_pairs_hook=_strict_json_object)
    except ApplicationUpdateError:
        raise
    except (UnicodeDecodeError, TypeError, ValueError) as exc:
        raise ApplicationUpdateError("updater companion manifest is invalid JSON") from exc
    if not isinstance(payload, dict) or frozenset(payload) != _REQUIRED_KEYS:
        raise ApplicationUpdateError("updater companion manifest shape is invalid")
    if payload.get("schema") != UPDATER_COMPANION_SCHEMA:
        raise ApplicationUpdateError("updater companion manifest schema is invalid")

    application_version = payload.get("application_version")
    source_head = payload.get("source_head")
    updater_name = payload.get("updater_name")
    updater_size = payload.get("updater_size")
    updater_sha = payload.get("updater_sha256")
    if not isinstance(application_version, str) or not application_version:
        raise ApplicationUpdateError("updater companion application version is invalid")
    if (
        not isinstance(source_head, str)
        or len(source_head) != 40
        or any(ch not in "0123456789abcdef" for ch in source_head)
    ):
        raise ApplicationUpdateError("updater companion source head is invalid")
    if (
        not isinstance(updater_name, str)
        or not updater_name.casefold().endswith(_UPDATER_SUFFIX.casefold())
        or Path(updater_name).name != updater_name
    ):
        raise ApplicationUpdateError("updater companion filename is invalid")
    if isinstance(updater_size, bool) or not isinstance(updater_size, int) or updater_size <= 0:
        raise ApplicationUpdateError("updater companion size is invalid")
    if (
        not isinstance(updater_sha, str)
        or len(updater_sha) != 64
        or any(ch not in "0123456789abcdef" for ch in updater_sha)
    ):
        raise ApplicationUpdateError("updater companion SHA-256 is invalid")
    return payload


def _strict_json_object(pairs: list[tuple[str, object]]) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            raise ApplicationUpdateError(f"updater companion manifest contains duplicate key: {key}")
        result[key] = value
    return result


def _publisher_ok(verifier: Callable[[Path, Path], bool], app: Path, updater: Path) -> bool:
    try:
        return bool(verifier(app, updater))
    except Exception as exc:
        raise ApplicationUpdateError("updater companion publisher verification failed") from exc


def _prepare_temp_slot(path: Path) -> None:
    try:
        metadata = path.lstat()
    except FileNotFoundError:
        return
    except OSError as exc:
        raise ApplicationUpdateError("updater companion temporary path is unavailable") from exc
    if stat.S_ISLNK(metadata.st_mode) or not stat.S_ISREG(metadata.st_mode):
        raise ApplicationUpdateError("updater companion temporary path is unsafe")
    try:
        path.unlink()
    except OSError as exc:
        raise ApplicationUpdateError("updater companion temporary path could not be cleared") from exc


def _copy_exact(source: Path, destination: Path) -> None:
    try:
        descriptor = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o700)
    except OSError as exc:
        raise ApplicationUpdateError("updater companion temporary file could not be created") from exc
    try:
        with source.open("rb") as src, os.fdopen(descriptor, "wb", closefd=True) as dst:
            shutil.copyfileobj(src, dst, length=_COPY_CHUNK)
            dst.flush()
            os.fsync(dst.fileno())
    except Exception:
        try:
            destination.unlink()
        except OSError:
            pass
        raise


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    try:
        with path.open("rb") as handle:
            while True:
                chunk = handle.read(_COPY_CHUNK)
                if not chunk:
                    break
                digest.update(chunk)
    except OSError as exc:
        raise ApplicationUpdateError("updater companion could not be hashed") from exc
    return digest.hexdigest()


def _require_regular_file(path: Path, label: str) -> None:
    try:
        metadata = path.lstat()
    except OSError as exc:
        raise ApplicationUpdateError(f"{label} is unavailable") from exc
    if stat.S_ISLNK(metadata.st_mode) or not stat.S_ISREG(metadata.st_mode):
        raise ApplicationUpdateError(f"{label} must be a regular non-symlink file")


def _require_real_directory(path: Path, label: str) -> None:
    try:
        metadata = path.lstat()
    except OSError as exc:
        raise ApplicationUpdateError(f"{label} is unavailable") from exc
    if stat.S_ISLNK(metadata.st_mode) or not stat.S_ISDIR(metadata.st_mode):
        raise ApplicationUpdateError(f"{label} must be a real directory")


def _fsync_directory(path: Path) -> None:
    flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0)
    try:
        descriptor = os.open(path, flags)
    except OSError:
        return
    try:
        os.fsync(descriptor)
    except OSError:
        pass
    finally:
        os.close(descriptor)
