from __future__ import annotations

import os

import pytest

from scripture_archive_runtime.application_update_parent_wait import (
    ParentProcessWaitError,
    wait_for_parent_exit,
)


def test_wait_uses_exact_pid_and_bounded_timeout() -> None:
    seen: list[tuple[int, int]] = []

    def backend(pid: int, timeout_ms: int) -> None:
        seen.append((pid, timeout_ms))

    wait_for_parent_exit(4242, timeout_ms=30_000, wait_backend=backend)
    assert seen == [(4242, 30_000)]


def test_wait_rejects_own_pid_before_backend() -> None:
    called = False

    def backend(pid: int, timeout_ms: int) -> None:
        nonlocal called
        called = True

    with pytest.raises(ParentProcessWaitError, match="own process"):
        wait_for_parent_exit(os.getpid(), wait_backend=backend)
    assert called is False


@pytest.mark.parametrize("pid", [0, -1, True, 1.5, "1"])
def test_wait_rejects_invalid_pid(pid) -> None:
    with pytest.raises(ParentProcessWaitError):
        wait_for_parent_exit(pid, wait_backend=lambda *_: None)


@pytest.mark.parametrize("timeout_ms", [0, -1, 120_001, True, 1.5])
def test_wait_rejects_invalid_or_unbounded_timeout(timeout_ms) -> None:
    with pytest.raises(ParentProcessWaitError):
        wait_for_parent_exit(4242, timeout_ms=timeout_ms, wait_backend=lambda *_: None)


def test_wait_is_windows_only_without_injected_backend() -> None:
    with pytest.raises(ParentProcessWaitError, match="Windows-only"):
        wait_for_parent_exit(4242, os_name="posix")


def test_wait_wraps_backend_failure() -> None:
    def backend(pid: int, timeout_ms: int) -> None:
        raise OSError("boom")

    with pytest.raises(ParentProcessWaitError, match="wait failed"):
        wait_for_parent_exit(4242, wait_backend=backend)


def test_wait_preserves_fail_closed_backend_verdict() -> None:
    def backend(pid: int, timeout_ms: int) -> None:
        raise ParentProcessWaitError("parent process did not exit before timeout")

    with pytest.raises(ParentProcessWaitError, match="did not exit"):
        wait_for_parent_exit(4242, wait_backend=backend)
