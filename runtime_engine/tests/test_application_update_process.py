from __future__ import annotations

from pathlib import Path
import os

import pytest

from scripture_archive_runtime.application_update_process import (
    UpdateProcessError,
    build_updater_process_plan,
    launch_updater_process,
    parse_trusted_updater_argv,
)


def _files(tmp_path: Path) -> tuple[Path, Path, Path]:
    install = tmp_path / "Program Files" / "Архів Писання"
    install.mkdir(parents=True)
    app = install / "Scripture Archive.exe"
    updater = install / "Scripture Archive Updater.exe"
    app.write_bytes(b"installed")
    updater.write_bytes(b"updater")
    staging = tmp_path / "state" / "updates"
    staging.mkdir(parents=True)
    return updater, app, staging


def test_build_plan_binds_sibling_packaged_updater_current_pid_and_fixed_argv(tmp_path: Path) -> None:
    updater, app, staging = _files(tmp_path)
    plan = build_updater_process_plan(
        updater_executable=updater,
        installed_executable=app,
        staging_root=staging,
    )
    assert plan.parent_pid == os.getpid()
    assert plan.updater_executable == updater.resolve()
    assert plan.installed_executable == app.resolve()
    assert plan.staging_root == staging.resolve()
    assert plan.argv() == (
        str(updater.resolve()),
        "--scripture-archive-apply",
        "--wait-pid",
        str(os.getpid()),
        "--installed-executable",
        str(app.resolve()),
        "--staging-root",
        str(staging.resolve()),
    )


def test_build_plan_rejects_external_updater(tmp_path: Path) -> None:
    updater, app, staging = _files(tmp_path)
    external = tmp_path / "outside-updater.exe"
    external.write_bytes(updater.read_bytes())
    with pytest.raises(UpdateProcessError, match="packaged beside"):
        build_updater_process_plan(
            updater_executable=external,
            installed_executable=app,
            staging_root=staging,
        )


def test_build_plan_rejects_current_app_as_updater(tmp_path: Path) -> None:
    _, app, staging = _files(tmp_path)
    with pytest.raises(UpdateProcessError, match="distinct"):
        build_updater_process_plan(
            updater_executable=app,
            installed_executable=app,
            staging_root=staging,
        )


def test_build_plan_rejects_symlinked_updater_target_and_staging(tmp_path: Path) -> None:
    updater, app, staging = _files(tmp_path)
    updater_link = updater.parent / "link-updater.exe"
    staging_link = tmp_path / "state-link"
    try:
        updater_link.symlink_to(updater)
        staging_link.symlink_to(staging, target_is_directory=True)
    except (OSError, NotImplementedError):
        pytest.skip("symlinks unavailable")
    with pytest.raises(UpdateProcessError, match="non-symlink"):
        build_updater_process_plan(
            updater_executable=updater_link,
            installed_executable=app,
            staging_root=staging,
        )
    with pytest.raises(UpdateProcessError, match="real directory"):
        build_updater_process_plan(
            updater_executable=updater,
            installed_executable=app,
            staging_root=staging_link,
        )


def test_build_plan_rejects_foreign_parent_pid(tmp_path: Path) -> None:
    updater, app, staging = _files(tmp_path)
    with pytest.raises(UpdateProcessError, match="current host process"):
        build_updater_process_plan(
            updater_executable=updater,
            installed_executable=app,
            staging_root=staging,
            parent_pid=os.getpid() + 1,
        )


def test_launch_is_shell_free_fixed_cwd_and_returns_child_pid(tmp_path: Path) -> None:
    updater, app, staging = _files(tmp_path)
    plan = build_updater_process_plan(
        updater_executable=updater,
        installed_executable=app,
        staging_root=staging,
    )
    seen: dict[str, object] = {}

    class Child:
        pid = 43210

    def fake_popen(argv, **kwargs):
        seen["argv"] = argv
        seen.update(kwargs)
        return Child()

    pid = launch_updater_process(plan, popen=fake_popen, os_name="posix")
    assert pid == 43210
    assert seen["argv"] == list(plan.argv())
    assert seen["cwd"] == str(app.resolve().parent)
    assert seen["shell"] is False
    assert seen["close_fds"] is True
    assert seen["creationflags"] == 0


def test_launch_wraps_process_failure(tmp_path: Path) -> None:
    updater, app, staging = _files(tmp_path)
    plan = build_updater_process_plan(
        updater_executable=updater,
        installed_executable=app,
        staging_root=staging,
    )

    def broken_popen(*args, **kwargs):
        raise OSError("boom")

    with pytest.raises(UpdateProcessError, match="failed to launch"):
        launch_updater_process(plan, popen=broken_popen)


def test_parser_accepts_only_fixed_host_contract(tmp_path: Path) -> None:
    updater, app, staging = _files(tmp_path)
    plan = build_updater_process_plan(
        updater_executable=updater,
        installed_executable=app,
        staging_root=staging,
    )
    pid, parsed_app, parsed_staging = parse_trusted_updater_argv(plan.argv()[1:])
    assert pid == os.getpid()
    assert parsed_app == app.resolve()
    assert parsed_staging == staging.resolve()


@pytest.mark.parametrize(
    "argv",
    [
        (),
        ("--scripture-archive-apply",),
        ("--wrong", "--wait-pid", "1", "--installed-executable", "a", "--staging-root", "b"),
        ("--scripture-archive-apply", "--wait-pid", "01", "--installed-executable", "a", "--staging-root", "b"),
        ("--scripture-archive-apply", "--wait-pid", "1", "--installed-executable", "a", "--staging-root", "b", "--extra"),
    ],
)
def test_parser_rejects_noncanonical_or_extended_commands(argv: tuple[str, ...]) -> None:
    with pytest.raises(UpdateProcessError):
        parse_trusted_updater_argv(argv)
