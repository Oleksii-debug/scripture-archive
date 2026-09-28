from __future__ import annotations

from pathlib import Path
import os

import pytest

from scripture_archive_runtime.application_update import ApplicationUpdateError
from scripture_archive_runtime.application_update_parent_wait import ParentProcessWaitError
from scripture_archive_runtime.application_update_process import (
    UpdateProcessError,
    build_updater_process_plan,
)
from scripture_archive_runtime.application_update_runner import execute_trusted_updater
from scripture_archive_runtime.application_update_updater import UpdateApplyResult


def _plan(tmp_path: Path):
    install = tmp_path / "Program Files" / "Архів Писання"
    install.mkdir(parents=True)
    app = install / "Scripture Archive.exe"
    updater = install / "Scripture Archive Updater.exe"
    app.write_bytes(b"installed")
    updater.write_bytes(b"updater")
    staging = tmp_path / "state" / "updates"
    staging.mkdir(parents=True)
    return build_updater_process_plan(
        updater_executable=updater,
        installed_executable=app,
        staging_root=staging,
    )


def test_runner_waits_for_exact_parent_before_forwarding_to_atomic_consumer(tmp_path: Path) -> None:
    plan = _plan(tmp_path)
    events: list[object] = []
    sentinel = UpdateApplyResult(
        previous_sha256="1" * 64,
        installed_sha256="2" * 64,
        rollback_path=plan.installed_executable.with_name(plan.installed_executable.name + ".scripture-archive.rollback"),
        target_path=plan.installed_executable,
        target_version="1.1.0",
    )

    def wait_for_exit(parent_pid: int) -> None:
        events.append(("wait", parent_pid))

    def consume(staging_root, **kwargs):
        events.append(("consume", Path(staging_root), kwargs))
        return sentinel

    verifier = lambda installed, staged: True
    result = execute_trusted_updater(
        plan.argv()[1:],
        current_version="1.0.0",
        verify_same_publisher=verifier,
        wait_for_exit=wait_for_exit,
        consume=consume,
    )

    assert result is sentinel
    assert events[0] == ("wait", os.getpid())
    kind, staging, kwargs = events[1]
    assert kind == "consume"
    assert staging == plan.staging_root
    assert kwargs == {
        "current_version": "1.0.0",
        "install_target": plan.installed_executable,
        "verify_same_publisher": verifier,
    }


def test_runner_never_consumes_when_parent_exit_cannot_be_proven(tmp_path: Path) -> None:
    plan = _plan(tmp_path)
    consumed = False

    def blocked_wait(parent_pid: int) -> None:
        raise ParentProcessWaitError("parent still alive")

    def consume(*args, **kwargs):
        nonlocal consumed
        consumed = True
        raise AssertionError("must not consume")

    with pytest.raises(ParentProcessWaitError, match="parent still alive"):
        execute_trusted_updater(
            plan.argv()[1:],
            current_version="1.0.0",
            verify_same_publisher=lambda installed, staged: True,
            wait_for_exit=blocked_wait,
            consume=consume,
        )
    assert consumed is False


def test_runner_rejects_malformed_command_before_wait_or_consume() -> None:
    waited = False
    consumed = False

    def wait_for_exit(parent_pid: int) -> None:
        nonlocal waited
        waited = True

    def consume(*args, **kwargs):
        nonlocal consumed
        consumed = True
        raise AssertionError("must not consume")

    with pytest.raises(UpdateProcessError, match="invalid updater command shape"):
        execute_trusted_updater(
            ("--scripture-archive-apply", "--wait-pid", "1"),
            current_version="1.0.0",
            verify_same_publisher=lambda installed, staged: True,
            wait_for_exit=wait_for_exit,
            consume=consume,
        )
    assert waited is False
    assert consumed is False


@pytest.mark.parametrize("current_version", ["", "1", "01.0.0", "1.0", "1.0.0 "])
def test_runner_rejects_invalid_trusted_current_version_before_wait(
    tmp_path: Path, current_version: str
) -> None:
    plan = _plan(tmp_path)
    waited = False

    def wait_for_exit(parent_pid: int) -> None:
        nonlocal waited
        waited = True

    with pytest.raises(ApplicationUpdateError):
        execute_trusted_updater(
            plan.argv()[1:],
            current_version=current_version,
            verify_same_publisher=lambda installed, staged: True,
            wait_for_exit=wait_for_exit,
        )
    assert waited is False


def test_runner_requires_callable_security_dependencies_before_wait(tmp_path: Path) -> None:
    plan = _plan(tmp_path)

    with pytest.raises(ApplicationUpdateError, match="same-publisher verifier"):
        execute_trusted_updater(
            plan.argv()[1:],
            current_version="1.0.0",
            verify_same_publisher=None,  # type: ignore[arg-type]
        )

    with pytest.raises(ApplicationUpdateError, match="parent-exit waiter"):
        execute_trusted_updater(
            plan.argv()[1:],
            current_version="1.0.0",
            verify_same_publisher=lambda installed, staged: True,
            wait_for_exit=None,  # type: ignore[arg-type]
        )

    with pytest.raises(ApplicationUpdateError, match="apply consumer"):
        execute_trusted_updater(
            plan.argv()[1:],
            current_version="1.0.0",
            verify_same_publisher=lambda installed, staged: True,
            consume=None,  # type: ignore[arg-type]
        )
