"""Trusted standalone updater execution boundary.

This module connects the fixed host-owned updater command from
``application_update_process`` to the bounded parent-exit barrier and the existing
atomic apply/rollback consumer.  It is deliberately not exposed through browser
transport and does not introduce a second update implementation.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from pathlib import Path
from typing import TypeAlias

from .application_update import ApplicationUpdateError, SemVer
from .application_update_parent_wait import wait_for_parent_exit
from .application_update_process import parse_trusted_updater_argv
from .application_update_relaunch import launch_installed_application
from .application_update_updater import (
    UpdateApplyResult,
    consume_apply_handoff,
    rollback_installed_update,
)


PublisherVerifier: TypeAlias = Callable[[Path, Path], bool]
ParentWaiter: TypeAlias = Callable[[int], None]
ApplyConsumer: TypeAlias = Callable[..., UpdateApplyResult]
ApplicationLauncher: TypeAlias = Callable[[Path], None]
RollbackConsumer: TypeAlias = Callable[..., str]


def execute_trusted_updater(
    argv: Sequence[str],
    *,
    current_version: str,
    verify_same_publisher: PublisherVerifier,
    wait_for_exit: Callable[..., None] = wait_for_parent_exit,
    consume: Callable[..., UpdateApplyResult] = consume_apply_handoff,
    launch: ApplicationLauncher = launch_installed_application,
    rollback: RollbackConsumer = rollback_installed_update,
) -> UpdateApplyResult:
    """Execute one trusted updater invocation in fail-closed order.

    ``argv`` must be the exact fixed payload emitted by ``UpdaterProcessPlan`` with
    the executable path already removed (``sys.argv[1:]``). ``current_version`` is
    trusted updater/package identity, not browser input.  The old application must
    be proven exited before the atomic consumer can replace its executable.

    The existing consumer remains the sole authority for apply-intent readback,
    exact staged-byte verification, same-publisher verification, rollback
    preservation/publication and apply-authority disarm.  After a successful apply,
    only the exact installed target returned by that consumer is relaunched.  Any
    detected target substitution or process-creation failure restores the already-
    preserved prior bytes before the failure is surfaced.
    """

    if not isinstance(current_version, str):
        raise ApplicationUpdateError("trusted updater current version must be a string")
    SemVer.parse(current_version)
    if not callable(verify_same_publisher):
        raise ApplicationUpdateError("same-publisher verifier is required")
    if not callable(wait_for_exit):
        raise ApplicationUpdateError("parent-exit waiter is required")
    if not callable(consume):
        raise ApplicationUpdateError("apply consumer is required")
    if not callable(launch):
        raise ApplicationUpdateError("application launcher is required")
    if not callable(rollback):
        raise ApplicationUpdateError("rollback consumer is required")

    parent_pid, installed_executable, staging_root = parse_trusted_updater_argv(argv)

    # Ordering is security- and correctness-significant: never attempt replacement
    # while the application process that owns the installed executable is alive.
    wait_for_exit(parent_pid)

    result = consume(
        staging_root,
        current_version=current_version,
        install_target=installed_executable,
        verify_same_publisher=verify_same_publisher,
    )
    if result.target_path != installed_executable:
        try:
            rollback(
                installed_executable,
                expected_previous_sha256=result.previous_sha256,
            )
        except Exception as rollback_error:
            raise ApplicationUpdateError(
                "apply consumer returned an unexpected install target and rollback failed"
            ) from rollback_error
        raise ApplicationUpdateError(
            "apply consumer returned an unexpected install target; rollback restored prior bytes"
        )

    try:
        launch(installed_executable)
    except Exception as launch_error:
        try:
            rollback(
                installed_executable,
                expected_previous_sha256=result.previous_sha256,
            )
        except Exception as rollback_error:
            raise ApplicationUpdateError(
                "updated application relaunch failed and rollback also failed"
            ) from rollback_error
        raise ApplicationUpdateError(
            "updated application relaunch failed; rollback restored prior bytes"
        ) from launch_error

    return result
