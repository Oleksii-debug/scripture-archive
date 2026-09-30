from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path
import subprocess
from typing import Callable, Sequence

from .application_update import ApplicationUpdateError, SemVer


class UpdateProcessError(RuntimeError):
    """Fail-closed updater process orchestration error."""


@dataclass(frozen=True)
class UpdaterProcessPlan:
    """Host-owned immutable launch plan for the separate updater process.

    The browser never supplies any value represented here. The updater must
    still independently re-open and verify its durable apply authority before
    mutating installed bytes; this plan only separates the updater from the
    application process that is about to exit.
    """

    updater_executable: Path
    installed_executable: Path
    staging_root: Path
    current_version: str
    parent_pid: int

    def argv(self) -> tuple[str, ...]:
        return (
            str(self.updater_executable),
            "--scripture-archive-apply",
            "--wait-pid",
            str(self.parent_pid),
            "--current-version",
            self.current_version,
            "--installed-executable",
            str(self.installed_executable),
            "--staging-root",
            str(self.staging_root),
        )


def _require_plain_file(path: Path, *, label: str) -> Path:
    try:
        path.lstat()
    except OSError as exc:
        raise UpdateProcessError(f"{label} is unavailable") from exc
    if path.is_symlink() or not path.is_file():
        raise UpdateProcessError(f"{label} must be a regular non-symlink file")
    try:
        resolved = path.resolve(strict=True)
    except OSError as exc:
        raise UpdateProcessError(f"{label} cannot be resolved") from exc
    if not resolved.is_file():
        raise UpdateProcessError(f"{label} must resolve to a regular file")
    return resolved


def _require_plain_directory(path: Path, *, label: str) -> Path:
    try:
        path.lstat()
    except OSError as exc:
        raise UpdateProcessError(f"{label} is unavailable") from exc
    if path.is_symlink() or not path.is_dir():
        raise UpdateProcessError(f"{label} must be a real directory")
    try:
        resolved = path.resolve(strict=True)
    except OSError as exc:
        raise UpdateProcessError(f"{label} cannot be resolved") from exc
    if not resolved.is_dir():
        raise UpdateProcessError(f"{label} must resolve to a directory")
    return resolved


def build_updater_process_plan(
    *,
    updater_executable: Path,
    installed_executable: Path,
    staging_root: Path,
    current_version: str,
    parent_pid: int | None = None,
) -> UpdaterProcessPlan:
    """Build a fixed host-side process handoff.

    The updater executable is required to be a sibling of the installed
    application. This prevents PATH/current-directory substitution and keeps
    the launch target inside the packaged installation boundary. The staging
    root remains separate and is only an authority location; the updater core
    is responsible for reconstructing and re-verifying candidate bytes from
    the durable apply handoff.
    """

    updater = _require_plain_file(Path(updater_executable), label="updater executable")
    installed = _require_plain_file(Path(installed_executable), label="installed executable")
    staging = _require_plain_directory(Path(staging_root), label="staging root")
    try:
        SemVer.parse(current_version)
    except ApplicationUpdateError as exc:
        raise UpdateProcessError("current version must be valid semantic version") from exc

    if updater.parent != installed.parent:
        raise UpdateProcessError("updater executable must be packaged beside the installed application")
    if updater == installed:
        raise UpdateProcessError("updater executable must be distinct from the installed application")

    current_pid = os.getpid()
    effective_parent_pid = current_pid if parent_pid is None else parent_pid
    if not isinstance(effective_parent_pid, int) or isinstance(effective_parent_pid, bool):
        raise UpdateProcessError("parent pid must be an integer")
    if effective_parent_pid <= 0:
        raise UpdateProcessError("parent pid must be positive")
    if effective_parent_pid != current_pid:
        raise UpdateProcessError("parent pid must identify the current host process")

    return UpdaterProcessPlan(
        updater_executable=updater,
        installed_executable=installed,
        staging_root=staging,
        current_version=current_version,
        parent_pid=effective_parent_pid,
    )


def launch_updater_process(
    plan: UpdaterProcessPlan,
    *,
    popen: Callable[..., object] = subprocess.Popen,
    os_name: str | None = None,
) -> int:
    """Launch the separate updater without shell interpretation.

    On Windows the process is detached into its own process group so it can
    survive normal application shutdown. No browser transport command is
    added and no arbitrary command-line suffix is accepted.
    """

    if not isinstance(plan, UpdaterProcessPlan):
        raise UpdateProcessError("invalid updater process plan")

    creationflags = 0
    effective_os_name = os.name if os_name is None else os_name
    if effective_os_name == "nt":
        creationflags = (
            getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
            | getattr(subprocess, "DETACHED_PROCESS", 0)
        )

    try:
        child = popen(
            list(plan.argv()),
            cwd=str(plan.installed_executable.parent),
            shell=False,
            close_fds=True,
            creationflags=creationflags,
        )
    except Exception as exc:
        raise UpdateProcessError("failed to launch updater process") from exc

    pid = getattr(child, "pid", None)
    if not isinstance(pid, int) or isinstance(pid, bool) or pid <= 0:
        raise UpdateProcessError("updater process did not return a valid pid")
    return pid


def parse_trusted_updater_argv(argv: Sequence[str]) -> tuple[int, Path, Path, str]:
    """Parse only the fixed updater command generated by UpdaterProcessPlan.

    Exact positional shape, marker and flag order are part of the host/updater
    contract. The current version is supplied only by the running packaged host;
    extra flags, duplicate options, and malformed semantic versions fail closed.
    """

    values = tuple(argv)
    if len(values) != 9:
        raise UpdateProcessError("invalid updater command shape")
    (
        marker,
        wait_flag,
        wait_value,
        version_flag,
        current_version,
        installed_flag,
        installed_value,
        staging_flag,
        staging_value,
    ) = values
    if marker != "--scripture-archive-apply":
        raise UpdateProcessError("invalid updater command marker")
    if wait_flag != "--wait-pid":
        raise UpdateProcessError("invalid updater wait flag")
    if version_flag != "--current-version":
        raise UpdateProcessError("invalid updater current-version flag")
    try:
        SemVer.parse(current_version)
    except ApplicationUpdateError as exc:
        raise UpdateProcessError("invalid updater current version") from exc
    if installed_flag != "--installed-executable":
        raise UpdateProcessError("invalid installed executable flag")
    if staging_flag != "--staging-root":
        raise UpdateProcessError("invalid staging root flag")
    try:
        parent_pid = int(wait_value, 10)
    except (TypeError, ValueError) as exc:
        raise UpdateProcessError("invalid parent pid") from exc
    if parent_pid <= 0 or str(parent_pid) != wait_value:
        raise UpdateProcessError("invalid parent pid")
    if not installed_value or "\x00" in installed_value:
        raise UpdateProcessError("invalid installed executable path")
    if not staging_value or "\x00" in staging_value:
        raise UpdateProcessError("invalid staging root path")
    return parent_pid, Path(installed_value), Path(staging_value), current_version
