from __future__ import annotations

from collections.abc import Callable, Sequence
from pathlib import Path
import stat
import sys
from typing import Any

from scripture_archive_platform.desktop_host.authenticode import (
    verify_same_publisher_authenticode,
)
from scripture_archive_platform.desktop_host.version import CURRENT_APPLICATION_VERSION
from runtime_engine.scripture_archive_runtime.application_update_process import (
    parse_trusted_updater_argv,
)
from runtime_engine.scripture_archive_runtime.application_update_runner import (
    execute_trusted_updater,
)


UPDATER_OK = 0
UPDATER_FAILED = 2
_UPDATER_SUFFIX = "-Updater.exe"


def _resolve_packaged_installed_sibling(
    argv: Sequence[str],
    *,
    updater_executable: Path,
) -> tuple[Path, Path]:
    """Bind direct invocation to the exact app sibling of this updater executable."""

    _, installed_argument, _ = parse_trusted_updater_argv(tuple(argv))
    updater = Path(updater_executable)
    updater_meta = updater.lstat()
    if stat.S_ISLNK(updater_meta.st_mode) or not stat.S_ISREG(updater_meta.st_mode):
        raise ValueError("packaged updater executable identity is invalid")
    updater = updater.resolve(strict=True)
    if not updater.name.casefold().endswith(_UPDATER_SUFFIX.casefold()):
        raise ValueError("packaged updater executable name is invalid")

    installed_name = updater.name[: -len(_UPDATER_SUFFIX)] + ".exe"
    expected_installed = updater.with_name(installed_name)
    installed_meta = installed_argument.lstat()
    if stat.S_ISLNK(installed_meta.st_mode) or not stat.S_ISREG(installed_meta.st_mode):
        raise ValueError("installed application identity is invalid")
    installed = installed_argument.resolve(strict=True)
    if installed != expected_installed:
        raise ValueError("installed application is not the canonical updater sibling")
    return installed, updater


def run_updater(
    argv: Sequence[str],
    *,
    execute: Callable[..., Any] = execute_trusted_updater,
    verifier: Callable[..., bool] = verify_same_publisher_authenticode,
    updater_executable: Path | None = None,
) -> int:
    """Run one fixed updater command with packaged trust authorities.

    Direct invocation is bound to the exact application sibling mechanically derived
    from this updater's own executable identity.  That installed app and this updater
    must also share a valid publisher before the runner can consume any apply handoff.
    The runner independently verifies installed app versus staged candidate again.
    """

    if not callable(execute) or not callable(verifier):
        return UPDATER_FAILED
    try:
        installed, updater = _resolve_packaged_installed_sibling(
            tuple(argv),
            updater_executable=Path(sys.executable if updater_executable is None else updater_executable),
        )
        if not verifier(installed, updater):
            return UPDATER_FAILED
        execute(
            tuple(argv),
            current_version=CURRENT_APPLICATION_VERSION,
            verify_same_publisher=verifier,
        )
    except Exception:
        return UPDATER_FAILED
    return UPDATER_OK


def main() -> int:
    return run_updater(sys.argv[1:])


if __name__ == "__main__":
    raise SystemExit(main())
