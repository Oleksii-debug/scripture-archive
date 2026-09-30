from __future__ import annotations

from collections.abc import Callable
import os
from pathlib import Path
import sys

from runtime_engine.scripture_archive_runtime.application_update_process import (
    UpdateProcessError,
    UpdaterProcessPlan,
    build_updater_process_plan,
    launch_updater_process,
)
from scripture_archive_platform.desktop_host.authenticode import (
    verify_same_publisher_authenticode,
)


PublisherVerifier = Callable[[Path, Path], bool]
PlanBuilder = Callable[..., UpdaterProcessPlan]
ProcessLauncher = Callable[[UpdaterProcessPlan], int]


def packaged_updater_path(installed_executable: Path) -> Path:
    """Derive the fixed sibling updater name from the packaged executable identity."""

    installed = Path(installed_executable)
    if installed.suffix.casefold() != ".exe":
        raise UpdateProcessError("installed packaged executable must have .exe suffix")
    return installed.with_name(f"{installed.stem}-Updater{installed.suffix}")


def launch_packaged_updater(
    staging_root: str | os.PathLike[str],
    *,
    current_version: str,
    current_executable: str | os.PathLike[str] | None = None,
    verify_same_publisher: PublisherVerifier = verify_same_publisher_authenticode,
    build_plan: PlanBuilder = build_updater_process_plan,
    launch_process: ProcessLauncher = launch_updater_process,
) -> int:
    """Verify and launch only the canonical same-publisher sibling updater.

    The browser supplies none of these values, including ``current_version``. The installed executable defaults to
    the currently running packaged process, the updater path is mechanically derived
    beside it, and the existing Authenticode authority must positively prove that
    current host and updater share a valid signer before #245's fixed process plan is
    constructed or launched.
    """

    if not callable(verify_same_publisher):
        raise UpdateProcessError("same-publisher verifier is required")
    if not callable(build_plan):
        raise UpdateProcessError("updater process-plan builder is required")
    if not callable(launch_process):
        raise UpdateProcessError("updater process launcher is required")

    installed = Path(sys.executable if current_executable is None else current_executable)
    updater = packaged_updater_path(installed)
    try:
        trusted_updater = bool(verify_same_publisher(installed, updater))
    except Exception as exc:
        raise UpdateProcessError("packaged updater authenticity could not be verified") from exc
    if not trusted_updater:
        raise UpdateProcessError("packaged updater same-publisher authenticity is required")

    requested_staging = Path(staging_root)
    plan = build_plan(
        updater_executable=updater,
        installed_executable=installed,
        staging_root=requested_staging,
        current_version=current_version,
    )
    if not isinstance(plan, UpdaterProcessPlan):
        raise UpdateProcessError("updater process-plan builder returned an invalid plan")
    try:
        expected_updater = updater.resolve(strict=True)
        expected_installed = installed.resolve(strict=True)
        expected_staging = requested_staging.resolve(strict=True)
    except OSError as exc:
        raise UpdateProcessError("packaged updater launch authority could not be rebound") from exc
    if (
        plan.updater_executable != expected_updater
        or plan.installed_executable != expected_installed
        or plan.staging_root != expected_staging
        or plan.current_version != current_version
    ):
        raise UpdateProcessError("updater process plan changed host-owned launch authority")
    try:
        launch_trusted = bool(
            verify_same_publisher(plan.installed_executable, plan.updater_executable)
        )
    except Exception as exc:
        raise UpdateProcessError(
            "packaged updater authenticity could not be reverified before launch"
        ) from exc
    if not launch_trusted:
        raise UpdateProcessError(
            "packaged updater same-publisher authenticity changed before launch"
        )
    return launch_process(plan)
