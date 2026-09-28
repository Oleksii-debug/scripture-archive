from __future__ import annotations

from pathlib import Path

import pytest

from scripture_archive_runtime.application_update import ApplicationUpdateError
from scripture_archive_runtime.application_update_relaunch import launch_installed_application


def test_relaunch_uses_exact_target_without_shell_and_fixed_working_directory(tmp_path: Path) -> None:
    install = tmp_path / "Program Files" / "Архів Писання"
    install.mkdir(parents=True)
    target = install / "Scripture Archive.exe"
    target.write_bytes(b"updated")
    calls: list[tuple[tuple[str, ...], dict[str, object]]] = []

    def spawn(argv, **kwargs):
        calls.append((tuple(argv), dict(kwargs)))
        return object()

    launch_installed_application(target, spawn=spawn)

    assert calls == [
        ((str(target),), {"cwd": str(install), "close_fds": True}),
    ]


def test_relaunch_rejects_symlink_target_before_spawn(tmp_path: Path) -> None:
    real = tmp_path / "real.exe"
    real.write_bytes(b"updated")
    target = tmp_path / "Scripture Archive.exe"
    try:
        target.symlink_to(real)
    except (OSError, NotImplementedError):
        pytest.skip("symlinks unavailable")
    spawned = False

    def spawn(*args, **kwargs):
        nonlocal spawned
        spawned = True

    with pytest.raises(ApplicationUpdateError, match="regular non-symlink"):
        launch_installed_application(target, spawn=spawn)
    assert spawned is False


def test_relaunch_translates_process_creation_failure(tmp_path: Path) -> None:
    target = tmp_path / "Scripture Archive.exe"
    target.write_bytes(b"updated")

    def spawn(*args, **kwargs):
        raise OSError("cannot execute")

    with pytest.raises(ApplicationUpdateError, match="could not be started"):
        launch_installed_application(target, spawn=spawn)


def test_relaunch_requires_callable_spawner(tmp_path: Path) -> None:
    target = tmp_path / "Scripture Archive.exe"
    target.write_bytes(b"updated")

    with pytest.raises(ApplicationUpdateError, match="process spawner"):
        launch_installed_application(target, spawn=None)  # type: ignore[arg-type]
