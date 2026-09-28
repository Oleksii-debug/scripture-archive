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
from .application_update_health import (
    discard_update_health_receipt,
    publish_update_health_receipt,
)
from .application_update_parent_wait import wait_for_parent_exit
from .application_update_process import parse_trusted_updater_argv
from .application_update_relaunch import launch_installed_application
from .application_update_updater import (
    UpdateApplyResult,
    consume_apply_handoff,
    rollback_installed_update,
)


PublisherVerifier: TypeAlias = Callable[[Path, Path], bool]
ApplicationLauncher: TypeAlias = Callable[[Path], None]
RollbackConsumer: TypeAlias = Callable[..., str]
HealthPublisher: TypeAlias = Callable[..., object]
HealthDiscarder: TypeAlias = Callable[[Path], bool]


def execute_trusted_updater(
    argv: Sequence[str],
    *,
    current_version: str,
    verify_same_publisher: PublisherVerifier,
    wait_for_exit: Callable[[int], None] = wait_for_parent_exit,
    consume: Callable[..., UpdateApplyResult] = consume_apply_handoff,
    launch: ApplicationLauncher = launch_installed_application,
    rollback: RollbackConsumer = rollback_installed_update,
    publish_health: HealthPublisher = publish_update_health_receipt,
    discard_health: HealthDiscarder = discard_update_health_receipt,
) -> UpdateApplyResult:
    """Execute one trusted updater invocation in fail-closed order.

    The old application is proven exited before replacement.  After canonical atomic
    apply, a durable exact-byte health receipt is published before relaunch while the
    prior rollback bytes still exist.  The new application later commits that receipt
    only after its packaged native/frontend bridge is healthy.  If receipt publication
    or process creation fails, the already-preserved prior bytes are restored and any
    published receipt is disarmed before failure is surfaced.
    """

    if not isinstance(current_version, str):
        raise ApplicationUpdateError("trusted updater current version must be a string")
    SemVer.parse(current_version)
    for dependency, label in (
        (verify_same_publisher, "same-publisher verifier"),
        (wait_for_exit, "parent-exit waiter"),
        (consume, "apply consumer"),
        (launch, "application launcher"),
        (rollback, "rollback consumer"),
        (publish_health, "health receipt publisher"),
        (discard_health, "health receipt discarder"),
    ):
        if not callable(dependency):
            raise ApplicationUpdateError(f"{label} is required")

    parent_pid, installed_executable, staging_root = parse_trusted_updater_argv(argv)
    wait_for_exit(parent_pid)

    result = consume(
        staging_root,
        current_version=current_version,
        install_target=installed_executable,
        verify_same_publisher=verify_same_publisher,
    )
    if result.target_path != installed_executable:
        try:
            rollback(installed_executable, expected_previous_sha256=result.previous_sha256)
        except Exception as rollback_error:
            raise ApplicationUpdateError(
                "apply consumer returned an unexpected install target and rollback failed"
            ) from rollback_error
        raise ApplicationUpdateError(
            "apply consumer returned an unexpected install target; rollback restored prior bytes"
        )

    try:
        publish_health(
            staging_root,
            previous_version=current_version,
            target_version=result.target_version,
            install_target=installed_executable,
            previous_sha256=result.previous_sha256,
            installed_sha256=result.installed_sha256,
        )
    except Exception as health_error:
        rollback_error: Exception | None = None
        discard_error: Exception | None = None
        try:
            rollback(installed_executable, expected_previous_sha256=result.previous_sha256)
        except Exception as exc:
            rollback_error = exc
        try:
            discard_health(staging_root)
        except Exception as exc:
            discard_error = exc
        if rollback_error is not None:
            raise ApplicationUpdateError(
                "health receipt publication failed and rollback also failed"
            ) from rollback_error
        if discard_error is not None:
            raise ApplicationUpdateError(
                "health receipt publication failed; rollback restored prior bytes but receipt disarm failed"
            ) from discard_error
        raise ApplicationUpdateError(
            "health receipt publication failed; rollback restored prior bytes"
        ) from health_error

    try:
        launch(installed_executable)
    except Exception as launch_error:
        rollback_error: Exception | None = None
        discard_error: Exception | None = None
        try:
            rollback(installed_executable, expected_previous_sha256=result.previous_sha256)
        except Exception as exc:
            rollback_error = exc
        try:
            discard_health(staging_root)
        except Exception as exc:
            discard_error = exc
        if rollback_error is not None:
            raise ApplicationUpdateError(
                "updated application relaunch failed and rollback also failed"
            ) from rollback_error
        if discard_error is not None:
            raise ApplicationUpdateError(
                "updated application relaunch failed; rollback restored prior bytes but receipt disarm failed"
            ) from discard_error
        raise ApplicationUpdateError(
            "updated application relaunch failed; rollback restored prior bytes"
        ) from launch_error

    return result
